import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { PRINTFUL_PRODUCTS, getProductsByCategory, getProduct, getFrameSizes, getFrameColors } from "../printful-config";
import { createOrder as createPrintfulOrder, confirmOrder as confirmPrintfulOrder, getOrder as getPrintfulOrder, buildOrderItem, estimateShipping, type PrintfulRecipient } from "../printful";
import { ADMIN_EMAIL } from "./helpers";

export function registerMerchRoutes(app: Express): void {
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
      res.status(500).json({ error: error.message || "Failed to estimate shipping" });
    }
  });

  // Create a merch order
  app.post("/api/merch/order", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { items, customer, address, imageUrl, portraitId, dogId, orgId } = req.body;

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

      // Validate all items and calculate total
      let subtotalCents = 0;
      const validatedItems: Array<{ productKey: string; variantId: number; quantity: number; priceCents: number }> = [];
      for (const item of items) {
        const product = getProduct(item.productKey);
        if (!product) {
          return res.status(400).json({ error: `Unknown product: ${item.productKey}` });
        }
        const qty = item.quantity || 1;
        subtotalCents += product.priceCents * qty;
        validatedItems.push({
          productKey: item.productKey,
          variantId: product.variantId,
          quantity: qty,
          priceCents: product.priceCents,
        });
      }

      // Estimate shipping to get cost
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
        const shippingItems = validatedItems.map(i => ({ variant_id: i.variantId, quantity: i.quantity }));
        const rates = await estimateShipping(recipient, shippingItems);
        if (rates.length > 0) {
          shippingCents = Math.round(parseFloat(rates[0].rate) * 100);
        }
      } catch (shippingErr: any) {
        console.warn("[merch] Shipping estimate failed, proceeding with $0:", shippingErr.message);
      }

      const totalCents = subtotalCents + shippingCents;

      // Create merch order in DB
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
          totalCents, shippingCents, "pending",
        ]
      );
      const merchOrderId = orderResult.rows[0].id;

      // Insert order items
      for (const item of validatedItems) {
        await pool.query(
          `INSERT INTO merch_order_items (order_id, product_key, variant_id, quantity, price_cents)
           VALUES ($1, $2, $3, $4, $5)`,
          [merchOrderId, item.productKey, item.variantId, item.quantity, item.priceCents]
        );
      }

      // Submit to Printful
      try {
        const printfulItems = validatedItems.map(item =>
          buildOrderItem(item.variantId, item.quantity, imageUrl)
        );
        const printfulOrder = await createPrintfulOrder(recipient, printfulItems, String(merchOrderId));

        // Update order with Printful ID
        await pool.query(
          `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
          [String(printfulOrder.id), printfulOrder.status, merchOrderId]
        );

        // Auto-confirm the order (submit for fulfillment)
        try {
          await confirmPrintfulOrder(printfulOrder.id);
          await pool.query(
            `UPDATE merch_orders SET status = 'confirmed' WHERE id = $1`,
            [merchOrderId]
          );
        } catch (confirmErr: any) {
          console.warn(`[merch] Auto-confirm failed for order ${merchOrderId}:`, confirmErr.message);
        }

        res.json({
          orderId: merchOrderId,
          printfulOrderId: printfulOrder.id,
          totalCents,
          shippingCents,
          subtotalCents,
          status: "submitted",
        });
      } catch (printfulErr: any) {
        console.error(`[merch] Printful order creation failed for order ${merchOrderId}:`, printfulErr.message);
        await pool.query(
          `UPDATE merch_orders SET status = 'failed', printful_status = $1 WHERE id = $2`,
          [printfulErr.message, merchOrderId]
        );
        res.status(500).json({ error: "Failed to submit order to fulfillment provider", orderId: merchOrderId });
      }
    } catch (error: any) {
      console.error("Error creating merch order:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  // Get a specific merch order
  app.get("/api/merch/order/:id", isAuthenticated, async (req: Request, res: Response) => {
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
      res.status(500).json({ error: error.message || "Failed to sync order" });
    }
  });

  // --- Gelato Holiday Card Endpoints ---

  // Get available holiday card products
  app.get("/api/gelato/products", async (_req: Request, res: Response) => {
    try {
      const { getAllGelatoProducts } = await import("../gelato-config");
      res.json({ cards: getAllGelatoProducts() });
    } catch (error) {
      console.error("Error fetching Gelato products:", error);
      res.status(500).json({ error: "Failed to fetch card products" });
    }
  });

  // Check if holiday cards are currently available (Nov-Dec only in v1)
  app.get("/api/gelato/availability", async (_req: Request, res: Response) => {
    const month = new Date().getMonth(); // 0-indexed
    const available = month === 10 || month === 11; // November or December
    res.json({ available, season: available ? "holiday" : null });
  });

  // Create a holiday card order via Gelato
  app.post("/api/gelato/order", async (req: Request, res: Response) => {
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
      res.status(500).json({ error: error.message || "Failed to create card order" });
    }
  });

  // Admin: Discover Gelato card product UIDs from catalog
  app.get("/api/gelato/discover-products", isAuthenticated, async (req: any, res: Response) => {
    const email = req.user.claims.email;
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin only" });
    }

    try {
      const { searchCardProducts, listCatalogs } = await import("../gelato");
      const catalogs = await listCatalogs();
      const cards = await searchCardProducts();
      res.json({ catalogs, cards });
    } catch (error: any) {
      console.error("Error discovering Gelato products:", error);
      res.status(500).json({ error: error.message || "Failed to discover products" });
    }
  });
}
