import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { getStripeClient } from "../stripeClient";
import { PRINTFUL_PRODUCTS, getProductsByCategory, getProduct, getFrameSizes, getFrameColors } from "../printful-config";
import { createOrder as createPrintfulOrder, confirmOrder as confirmPrintfulOrder, getOrder as getPrintfulOrder, buildOrderItem, estimateShipping, type PrintfulRecipient } from "../printful";
import { sendEmail, isEmailConfigured, buildOrderConfirmationEmail } from "./email";
import { ADMIN_EMAIL, publicExpensiveRateLimiter } from "./helpers";
import { getGelatoProduct as getGelatoProductConfig, getAllGelatoProducts, sortOccasionsForDisplay, getOccasion } from "../gelato-config";
import { generateFlatCardArtwork, generateFlatCardBack, generateFoldedOutsideArtwork, generateFoldedInsideArtwork, bufferToDataUri } from "../card-artwork";
import { uploadToStorage, fetchImageAsBuffer } from "../supabase-storage";

export function registerMerchRoutes(app: Express): void {
  // In-memory cache for card previews (portraitId-occasion-format -> PNG buffer)
  const previewCache = new Map<string, { buffer: Buffer; timestamp: number }>();
  const PREVIEW_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  const PREVIEW_CACHE_MAX = 50;

  function getCachedPreview(key: string): Buffer | null {
    const entry = previewCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > PREVIEW_CACHE_TTL) {
      previewCache.delete(key);
      return null;
    }
    return entry.buffer;
  }

  function setCachedPreview(key: string, buffer: Buffer): void {
    // Evict oldest if at capacity
    if (previewCache.size >= PREVIEW_CACHE_MAX) {
      const oldest = [...previewCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) previewCache.delete(oldest[0]);
    }
    previewCache.set(key, { buffer, timestamp: Date.now() });
  }

  // --- MERCH PRODUCTS ---
  // Returns available merch products and pricing
  app.get("/api/merch/products", async (req: Request, res: Response) => {
    try {
      res.json({
        frames: getProductsByCategory("frame"),
        mugs: getProductsByCategory("mug"),
        totes: getProductsByCategory("tote"),
        frameSizes: getFrameSizes(),
        frameColors: getFrameColors("8x10"), // all sizes have same colors
      });
    } catch (error) {
      console.error("Error fetching merch products:", error);
      res.status(500).json({ error: "Failed to fetch merch products" });
    }
  });

  // --- Merch Order Endpoints ---

  // Estimate shipping costs
  app.post("/api/merch/estimate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { items, address } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required" });
      }
      if (!address || !address.address1 || !address.city || !address.state_code || !address.zip || !address.country_code) {
        return res.status(400).json({ error: "Complete shipping address is required" });
      }

      const recipient: PrintfulRecipient = {
        name: address.name || "Customer",
        address1: address.address1,
        city: address.city,
        state_code: address.state_code,
        zip: address.zip,
        country_code: address.country_code,
      };

      const printfulItems = items.map((item: { productKey: string; quantity: number }) => {
        const product = getProduct(item.productKey);
        if (!product) throw new Error(`Unknown product: ${item.productKey}`);
        return { variant_id: product.variantId, quantity: item.quantity || 1 };
      });

      const rates = await estimateShipping(recipient, printfulItems);
      res.json({ rates });
    } catch (error: any) {
      console.error("Error estimating shipping:", error);
      res.status(500).json({ error: "Failed to estimate shipping" });
    }
  });

  // Step 1: Create merch order + Stripe Checkout Session
  // Returns a Stripe checkout URL — customer pays there, then gets redirected back
  app.post("/api/merch/checkout", publicExpensiveRateLimiter, async (req: Request, res: Response) => {
    try {
      const { items, customer, address, imageUrl, portraitId, dogId, orgId, sessionToken } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required" });
      }
      if (!customer?.name || !address?.address1 || !address?.city || !address?.state_code || !address?.zip) {
        return res.status(400).json({ error: "Customer name and complete shipping address are required" });
      }
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required for printing" });
      }
      if (!orgId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      // Validate all items and calculate total (supports both Printful + Gelato products)
      let subtotalCents = 0;
      const validatedItems: Array<{ productKey: string; variantId: number; quantity: number; priceCents: number; occasion?: string }> = [];
      for (const item of items) {
        const isCard = item.productKey.startsWith("card_");
        const printfulProduct = isCard ? null : getProduct(item.productKey);
        const gelatoProduct = isCard ? getGelatoProductConfig(item.productKey) : null;
        if (!printfulProduct && !gelatoProduct) {
          return res.status(400).json({ error: `Unknown product: ${item.productKey}` });
        }
        const priceCents = printfulProduct?.priceCents || gelatoProduct?.priceCents || 0;
        const qty = item.quantity || 1;
        subtotalCents += priceCents * qty;
        validatedItems.push({
          productKey: item.productKey,
          variantId: printfulProduct?.variantId || 0,
          quantity: qty,
          priceCents,
          occasion: isCard ? (item.occasion || undefined) : undefined,
        });
      }

      // Estimate shipping (only for Printful items — Gelato handles its own shipping)
      const recipient: PrintfulRecipient = {
        name: customer.name,
        address1: address.address1,
        city: address.city,
        state_code: address.state_code,
        zip: address.zip,
        country_code: address.country_code || "US",
        email: customer.email,
        phone: customer.phone,
      };

      let shippingCents = 0;
      try {
        const printfulShippingItems = validatedItems
          .filter(i => !i.productKey.startsWith("card_"))
          .map(i => ({ variant_id: i.variantId, quantity: i.quantity }));
        if (printfulShippingItems.length === 0) throw new Error("No Printful items for shipping estimate");
        const rates = await estimateShipping(recipient, printfulShippingItems);
        if (rates.length > 0) {
          shippingCents = Math.round(parseFloat(rates[0].rate) * 100);
        }
      } catch (shippingErr: any) {
        console.warn("[merch] Shipping estimate failed, proceeding with $0:", shippingErr.message);
      }

      const totalCents = subtotalCents + shippingCents;

      // Create merch order in DB with status "awaiting_payment"
      const orderResult = await pool.query(
        `INSERT INTO merch_orders (
          organization_id, dog_id, portrait_id,
          customer_name, customer_email, customer_phone,
          shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
          total_cents, shipping_cents, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          orgId, dogId || null, portraitId || null,
          customer.name, customer.email || null, customer.phone || null,
          address.address1, address.city, address.state_code, address.zip, address.country_code || "US",
          totalCents, shippingCents, "awaiting_payment",
        ]
      );
      const merchOrderId = orderResult.rows[0].id;

      // Insert order items (include occasion for card items)
      for (const item of validatedItems) {
        await pool.query(
          `INSERT INTO merch_order_items (order_id, product_key, variant_id, quantity, price_cents, occasion)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [merchOrderId, item.productKey, item.variantId, item.quantity, item.priceCents, item.occasion || null]
        );
      }

      // Look up org to determine Stripe mode
      const org = await storage.getOrganization(parseInt(orgId));
      const testMode = org?.stripeTestMode;
      const stripe = getStripeClient(testMode);

      // Build line items for Stripe Checkout
      const lineItems = validatedItems.map(item => {
        const printfulProduct = getProduct(item.productKey);
        const gelatoProduct = getGelatoProductConfig(item.productKey);
        const occasion = item.occasion ? getOccasion(item.occasion) : null;
        let displayName = printfulProduct?.name || gelatoProduct?.name || item.productKey;
        if (occasion) displayName = `${occasion.name} ${displayName}`;
        return {
          price_data: {
            currency: "usd",
            product_data: { name: displayName },
            unit_amount: item.priceCents,
          },
          quantity: item.quantity,
        };
      });

      // Add shipping as a line item if applicable
      if (shippingCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Shipping" },
            unit_amount: shippingCents,
          },
          quantity: 1,
        });
      }

      // Build success/cancel URLs
      const baseUrl = process.env.APP_URL || (process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000");
      const successUrl = sessionToken
        ? `${baseUrl}/order/${sessionToken}?payment=success&session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/order-complete?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = sessionToken
        ? `${baseUrl}/order/${sessionToken}?payment=canceled`
        : `${baseUrl}/`;

      // Create Stripe Checkout Session
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: customer.email || undefined,
        metadata: {
          merchOrderId: String(merchOrderId),
          imageUrl,
          orgId: String(orgId),
          dogId: dogId ? String(dogId) : "",
          portraitId: portraitId ? String(portraitId) : "",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Store the Stripe session ID on the order
      await pool.query(
        `UPDATE merch_orders SET stripe_payment_intent_id = $1 WHERE id = $2`,
        [checkoutSession.id, merchOrderId]
      );

      res.json({
        checkoutUrl: checkoutSession.url,
        orderId: merchOrderId,
        sessionId: checkoutSession.id,
        totalCents,
        shippingCents,
        subtotalCents,
      });
    } catch (error: any) {
      console.error("Error creating merch checkout:", error);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // Step 2: Confirm payment and fulfill order
  // Called after Stripe redirects back with session_id
  app.post("/api/merch/confirm-checkout", publicExpensiveRateLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Find the order by Stripe session ID
      const orderResult = await pool.query(
        `SELECT * FROM merch_orders WHERE stripe_payment_intent_id = $1`,
        [sessionId]
      );
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "Order not found for this session" });
      }
      const order = orderResult.rows[0];

      // If already paid/submitted, return success
      if (order.status !== "awaiting_payment") {
        return res.json({
          orderId: order.id,
          status: order.status,
          totalCents: order.total_cents,
          alreadyProcessed: true,
        });
      }

      // Verify payment with Stripe
      const org = await storage.getOrganization(order.organization_id);
      const stripe = getStripeClient(org?.stripeTestMode);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed", paymentStatus: session.payment_status });
      }

      // Mark as paid
      await pool.query(
        `UPDATE merch_orders SET status = 'paid' WHERE id = $1`,
        [order.id]
      );

      // Get order items
      const itemsResult = await pool.query(
        `SELECT * FROM merch_order_items WHERE order_id = $1`,
        [order.id]
      );

      // Get the imageUrl from the Stripe session metadata
      const imageUrl = session.metadata?.imageUrl;
      if (!imageUrl) {
        console.error(`[merch] No imageUrl in session metadata for order ${order.id}`);
        return res.json({ orderId: order.id, status: "paid", warning: "Fulfillment pending — missing image URL" });
      }

      // Split items: Printful (frames, mugs, totes) vs Gelato (cards)
      const printfulRows = itemsResult.rows.filter((item: any) => !item.product_key.startsWith("card_"));
      const gelatoRows = itemsResult.rows.filter((item: any) => item.product_key.startsWith("card_"));

      const recipient: PrintfulRecipient = {
        name: order.customer_name,
        address1: order.shipping_street,
        city: order.shipping_city,
        state_code: order.shipping_state,
        zip: order.shipping_zip,
        country_code: order.shipping_country || "US",
        email: order.customer_email,
        phone: order.customer_phone,
      };

      let printfulOrderId: number | null = null;
      let gelatoOrderId: string | null = null;

      // Submit Printful items (if any)
      if (printfulRows.length > 0) {
        try {
          const printfulItems = printfulRows.map((item: any) =>
            buildOrderItem(item.variant_id, item.quantity, imageUrl)
          );
          const printfulOrder = await createPrintfulOrder(recipient, printfulItems, String(order.id));
          printfulOrderId = printfulOrder.id;

          await pool.query(
            `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
            [String(printfulOrder.id), printfulOrder.status, order.id]
          );

          try {
            await confirmPrintfulOrder(printfulOrder.id);
            await pool.query(
              `UPDATE merch_orders SET status = 'confirmed' WHERE id = $1`,
              [order.id]
            );
          } catch (confirmErr: any) {
            console.warn(`[merch] Printful auto-confirm failed for order ${order.id}:`, confirmErr.message);
          }
        } catch (printfulErr: any) {
          console.error(`[merch] Printful order failed for paid order ${order.id}:`, printfulErr.message);
          await pool.query(
            `UPDATE merch_orders SET status = 'paid_fulfillment_pending' WHERE id = $1`,
            [order.id]
          );
        }
      }

      // Submit Gelato card items (if any) — generate occasion artwork first
      if (gelatoRows.length > 0) {
        try {
          const { createGelatoOrder, buildCardOrderItem } = await import("../gelato");

          // Look up dog name and org name for card artwork
          const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
          const petName = dogResult?.name || "Your Pet";
          const orgName = org?.name || "Pawtrait Pros";

          const gelatoItems: any[] = [];
          for (let i = 0; i < gelatoRows.length; i++) {
            const item = gelatoRows[i];
            const product = getGelatoProductConfig(item.product_key);
            const occasion = item.occasion ? getOccasion(item.occasion) : null;

            let files: Array<{ type: string; url: string }>;

            if (occasion) {
              // Generate occasion-specific card artwork and upload to Supabase Storage
              const format = product?.format || "flat";
              console.log(`[merch] Generating ${occasion.id} ${format} card artwork for order ${order.id}`);

              if (format === "flat") {
                const frontBuf = await generateFlatCardArtwork(imageUrl, occasion, petName, orgName);
                const backBuf = await generateFlatCardBack(orgName);
                const frontUrl = await uploadToStorage(bufferToDataUri(frontBuf), "portraits", `card-${order.id}-${i}-front.png`);
                const backUrl = await uploadToStorage(bufferToDataUri(backBuf), "portraits", `card-${order.id}-${i}-back.png`);
                files = [{ type: "default", url: frontUrl }, { type: "back", url: backUrl }];
                await pool.query(`UPDATE merch_order_items SET artwork_url = $1 WHERE id = $2`, [frontUrl, item.id]);
              } else {
                const outsideBuf = await generateFoldedOutsideArtwork(imageUrl, occasion, petName, orgName);
                const insideBuf = await generateFoldedInsideArtwork(occasion, petName);
                const outsideUrl = await uploadToStorage(bufferToDataUri(outsideBuf), "portraits", `card-${order.id}-${i}-outside.png`);
                const insideUrl = await uploadToStorage(bufferToDataUri(insideBuf), "portraits", `card-${order.id}-${i}-inside.png`);
                files = [{ type: "default", url: outsideUrl }, { type: "inside", url: insideUrl }];
                await pool.query(`UPDATE merch_order_items SET artwork_url = $1 WHERE id = $2`, [outsideUrl, item.id]);
              }
            } else {
              // No occasion — use raw portrait as fallback
              files = [{ type: "default", url: imageUrl }];
            }

            gelatoItems.push(buildCardOrderItem(
              product?.productUid || item.product_key,
              item.quantity,
              files,
              `item-${order.id}-${i}`,
            ));
          }

          const nameParts = (order.customer_name || "Customer").split(" ");
          const gelatoAddress = {
            firstName: nameParts[0] || "Customer",
            lastName: nameParts.slice(1).join(" ") || "",
            addressLine1: order.shipping_street,
            city: order.shipping_city,
            state: order.shipping_state,
            postCode: order.shipping_zip,
            country: order.shipping_country || "US",
            email: order.customer_email,
            phone: order.customer_phone,
          };

          const gelatoOrder = await createGelatoOrder(
            gelatoItems,
            gelatoAddress,
            `pp-${order.id}`,
            `org-${order.organization_id}`
          );
          gelatoOrderId = gelatoOrder.id;

          // Store Gelato order ID (use printful_order_id column if no Printful items, otherwise store in notes)
          if (!printfulOrderId) {
            await pool.query(
              `UPDATE merch_orders SET printful_order_id = $1, status = 'submitted' WHERE id = $2`,
              [`gelato:${gelatoOrder.id}`, order.id]
            );
          }

          console.log(`[merch] Gelato order ${gelatoOrder.id} created for merch order ${order.id}`);
        } catch (gelatoErr: any) {
          console.error(`[merch] Gelato order failed for paid order ${order.id}:`, gelatoErr.message);
          if (!printfulOrderId) {
            await pool.query(
              `UPDATE merch_orders SET status = 'paid_fulfillment_pending' WHERE id = $1`,
              [order.id]
            );
          }
        }
      }

      // Send order confirmation email
      if (order.customer_email && isEmailConfigured()) {
        try {
          const itemDescriptions = itemsResult.rows.map((item: any) => {
            const product = getProduct(item.product_key);
            return `${product?.name || item.product_key} x${item.quantity}`;
          });
          const orgName = org?.name || "Pawtrait Pros";
          const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
          const dogName = dogResult?.name || "your pet";

          const { subject, html } = buildOrderConfirmationEmail(orgName, dogName, order.id, order.total_cents, itemDescriptions);

          let attachments: Array<{ filename: string; content: Buffer }> | undefined;
          if (order.portrait_id) {
            try {
              const baseUrl = process.env.APP_URL || "https://pawtraitpros.com";
              const downloadRes = await fetch(`${baseUrl}/api/portraits/${order.portrait_id}/download`);
              if (downloadRes.ok) {
                const buffer = Buffer.from(await downloadRes.arrayBuffer());
                attachments = [{ filename: `${dogName.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png`, content: buffer }];
              }
            } catch (dlErr: any) {
              console.warn(`[merch] Failed to fetch watermarked portrait for email:`, dlErr.message);
            }
          }

          await sendEmail(order.customer_email, subject, html, attachments, orgName);
          console.log(`[merch] Confirmation email sent to ${order.customer_email} for order ${order.id}`);
        } catch (emailErr: any) {
          console.warn(`[merch] Failed to send confirmation email for order ${order.id}:`, emailErr.message);
        }
      }

      const finalStatus = printfulOrderId || gelatoOrderId ? "confirmed" : "paid_fulfillment_pending";
      res.json({
        orderId: order.id,
        printfulOrderId,
        gelatoOrderId,
        totalCents: order.total_cents,
        status: finalStatus,
      });
    } catch (error: any) {
      console.error("Error confirming merch checkout:", error);
      res.status(500).json({ error: "Failed to confirm checkout" });
    }
  });

  // Get a specific merch order
  app.get("/api/merch/order/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const orderResult = await pool.query(
        `SELECT * FROM merch_orders WHERE id = $1`,
        [orderId]
      );
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify user owns this order's organization
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      if (userEmail !== ADMIN_EMAIL) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || orderResult.rows[0].organization_id !== org.id) {
          return res.status(403).json({ error: "Not authorized to view this order" });
        }
      }

      const itemsResult = await pool.query(
        `SELECT * FROM merch_order_items WHERE order_id = $1`,
        [orderId]
      );

      // Enrich items with product details
      const items = itemsResult.rows.map((item: any) => ({
        ...item,
        product: getProduct(item.product_key),
      }));

      res.json({ order: orderResult.rows[0], items });
    } catch (error: any) {
      console.error("Error fetching merch order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Get all merch orders for an organization (auth required)
  app.get("/api/merch/orders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;

      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;
      let orgId: number | null = null;

      if (isAdminUser && orgIdParam) {
        orgId = orgIdParam;
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }

      if (!orgId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const ordersResult = await pool.query(
        `SELECT mo.*,
          (SELECT json_agg(json_build_object(
            'id', moi.id,
            'product_key', moi.product_key,
            'variant_id', moi.variant_id,
            'quantity', moi.quantity,
            'price_cents', moi.price_cents
          )) FROM merch_order_items moi WHERE moi.order_id = mo.id) as items
        FROM merch_orders mo
        WHERE mo.organization_id = $1
        ORDER BY mo.created_at DESC`,
        [orgId]
      );

      res.json({ orders: ordersResult.rows });
    } catch (error: any) {
      console.error("Error fetching merch orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Sync a merch order status from Printful (admin/manual check)
  app.post("/api/merch/order/:id/sync", isAuthenticated, async (req: any, res: Response) => {
    try {
      const email = req.user.claims.email;
      if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin only" });
      }

      const orderId = parseInt(req.params.id);
      const orderResult = await pool.query(
        `SELECT printful_order_id FROM merch_orders WHERE id = $1`,
        [orderId]
      );
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const printfulOrderId = orderResult.rows[0].printful_order_id;
      if (!printfulOrderId) {
        return res.status(400).json({ error: "Order has no Printful order ID" });
      }

      const printfulOrder = await getPrintfulOrder(parseInt(printfulOrderId));
      await pool.query(
        `UPDATE merch_orders SET printful_status = $1 WHERE id = $2`,
        [printfulOrder.status, orderId]
      );

      res.json({ orderId, printfulStatus: printfulOrder.status, printfulOrder });
    } catch (error: any) {
      console.error("Error syncing merch order:", error);
      res.status(500).json({ error: "Failed to sync order" });
    }
  });

  // --- Gelato Greeting Card Endpoints ---

  // Get available greeting card products
  app.get("/api/gelato/products", async (_req: Request, res: Response) => {
    try {
      res.json({ cards: getAllGelatoProducts() });
    } catch (error) {
      console.error("Error fetching Gelato products:", error);
      res.status(500).json({ error: "Failed to fetch card products" });
    }
  });

  // Check if greeting cards are available + return sorted occasions
  app.get("/api/gelato/availability", async (_req: Request, res: Response) => {
    const available = !!process.env.GELATO_API_KEY;
    const month = new Date().getMonth();
    const occasions = sortOccasionsForDisplay(month);
    res.json({ available, occasions });
  });

  // Get all card occasions sorted for current month
  app.get("/api/cards/occasions", async (_req: Request, res: Response) => {
    const month = new Date().getMonth();
    res.json({ occasions: sortOccasionsForDisplay(month) });
  });

  // Generate card preview (returns PNG image, cached)
  app.post("/api/cards/preview", publicExpensiveRateLimiter, async (req: Request, res: Response) => {
    try {
      const { portraitId, occasion: occasionId, format, petName } = req.body;
      if (!portraitId || !occasionId) {
        return res.status(400).json({ error: "portraitId and occasion are required" });
      }

      const occasion = getOccasion(occasionId);
      if (!occasion) {
        return res.status(400).json({ error: `Unknown occasion: ${occasionId}` });
      }

      const cardFormat = format || "flat";
      const cacheKey = `${portraitId}-${occasionId}-${cardFormat}`;

      // Check cache first
      const cached = getCachedPreview(cacheKey);
      if (cached) {
        res.set("Content-Type", "image/png");
        res.set("Cache-Control", "public, max-age=900");
        return res.send(cached);
      }

      // Fetch portrait image
      const portrait = await storage.getPortrait(portraitId);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).json({ error: "Portrait not found" });
      }

      const name = petName || "Your Pet";
      let previewBuf: Buffer;

      if (cardFormat === "folded") {
        // Show the front cover (outside artwork, top half)
        previewBuf = await generateFoldedOutsideArtwork(portrait.generatedImageUrl, occasion, name, "Your Business");
      } else {
        previewBuf = await generateFlatCardArtwork(portrait.generatedImageUrl, occasion, name, "Your Business");
      }

      // Resize to a smaller preview (600px wide)
      const { default: sharpLib } = await import("sharp");
      const preview = await sharpLib(previewBuf).resize(600, null, { fit: "inside" }).png().toBuffer();

      setCachedPreview(cacheKey, preview);
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=900");
      res.send(preview);
    } catch (error: any) {
      console.error("Error generating card preview:", error);
      res.status(500).json({ error: "Failed to generate preview" });
    }
  });

  // Create a greeting card order via Gelato (rate-limited to prevent abuse)
  app.post("/api/gelato/order", publicExpensiveRateLimiter, async (req: Request, res: Response) => {
    try {
      const { items, customer, address, artworkUrls } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one card item is required" });
      }
      if (!customer?.name || !address?.address1 || !address?.city || !address?.state || !address?.zip) {
        return res.status(400).json({ error: "Customer name and complete shipping address are required" });
      }
      if (!artworkUrls || !Array.isArray(artworkUrls) || artworkUrls.length === 0) {
        return res.status(400).json({ error: "Artwork URL(s) are required" });
      }

      const { getGelatoProduct: getGelatoCardProduct } = await import("../gelato-config");
      const { createGelatoOrder, buildCardOrderItem } = await import("../gelato");

      // Validate items and calculate total
      let subtotalCents = 0;
      const gelatoItems: any[] = [];
      const dbItems: Array<{ productKey: string; quantity: number; priceCents: number }> = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = getGelatoCardProduct(item.productKey);
        if (!product) {
          return res.status(400).json({ error: `Unknown card product: ${item.productKey}` });
        }
        const qty = item.quantity || 1;
        subtotalCents += product.priceCents * qty;

        const files = artworkUrls.map((url: string, idx: number) => ({
          type: idx === 0 ? "default" : "back",
          url,
        }));

        gelatoItems.push(
          buildCardOrderItem(product.productUid, qty, files, `item-${i}`)
        );
        dbItems.push({
          productKey: item.productKey,
          quantity: qty,
          priceCents: product.priceCents,
        });
      }

      const nameParts = customer.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      const orgId = req.body.orgId || null;
      const orderResult = await pool.query(
        `INSERT INTO merch_orders (
          organization_id, dog_id, portrait_id,
          customer_name, customer_email, customer_phone,
          shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
          total_cents, shipping_cents, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          orgId, req.body.dogId || null, req.body.portraitId || null,
          customer.name, customer.email || null, customer.phone || null,
          address.address1, address.city, address.state, address.zip, address.country || "US",
          subtotalCents, 0, "pending",
        ]
      );
      const merchOrderId = orderResult.rows[0].id;

      for (const item of dbItems) {
        await pool.query(
          `INSERT INTO merch_order_items (order_id, product_key, variant_id, quantity, price_cents)
           VALUES ($1, $2, $3, $4, $5)`,
          [merchOrderId, item.productKey, 0, item.quantity, item.priceCents]
        );
      }

      try {
        const gelatoOrder = await createGelatoOrder(
          gelatoItems,
          {
            firstName,
            lastName,
            addressLine1: address.address1,
            city: address.city,
            state: address.state,
            postCode: address.zip,
            country: address.country || "US",
            email: customer.email,
            phone: customer.phone,
          },
          `gelato-${merchOrderId}`,
          `customer-${merchOrderId}`,
        );

        await pool.query(
          `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
          [gelatoOrder.id, gelatoOrder.fulfillmentStatus, merchOrderId]
        );

        res.json({
          orderId: merchOrderId,
          gelatoOrderId: gelatoOrder.id,
          totalCents: subtotalCents,
          status: "submitted",
        });
      } catch (gelatoErr: any) {
        console.error(`[gelato] Order creation failed for merch_order ${merchOrderId}:`, gelatoErr.message);
        await pool.query(
          `UPDATE merch_orders SET status = 'failed', printful_status = $1 WHERE id = $2`,
          [gelatoErr.message, merchOrderId]
        );
        res.status(500).json({ error: "Failed to submit card order", orderId: merchOrderId });
      }
    } catch (error: any) {
      console.error("Error creating Gelato order:", error);
      res.status(500).json({ error: "Failed to create card order" });
    }
  });

  // Admin: Discover Gelato card product UIDs from catalog
  app.get("/api/gelato/discover-products", isAuthenticated, async (req: any, res: Response) => {
    const email = req.user.claims.email;
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin only" });
    }

    try {
      const { searchCardProducts, searchFoldedCardProducts, listCatalogs } = await import("../gelato");
      const catalogs = await listCatalogs();
      const flatCards = await searchCardProducts();
      const foldedCards = await searchFoldedCardProducts();
      res.json({ catalogs, flatCards, foldedCards });
    } catch (error: any) {
      console.error("Error discovering Gelato products:", error);
      res.status(500).json({ error: "Failed to discover products" });
    }
  });
}
