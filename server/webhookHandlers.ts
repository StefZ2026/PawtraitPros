import { getStripeClient, getWebhookSecret, mapStripeStatusToInternal } from './stripeClient';
import { storage } from './storage';
import { pool } from './db';
import { stripeService } from './stripeService';
import { handleCancellation } from './subscription';
import { getProduct } from './printful-config';
import { createOrder as createPrintfulOrder, confirmOrder as confirmPrintfulOrder, buildOrderItem, type PrintfulRecipient } from './printful';
import { sendEmail, isEmailConfigured, buildOrderConfirmationEmail } from './routes/email';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Try live webhook secret first, then test
    let event;
    const liveStripe = getStripeClient(false);
    const testStripe = getStripeClient(true);
    const liveSecret = getWebhookSecret(false);
    const testSecret = getWebhookSecret(true);

    try {
      event = liveStripe.webhooks.constructEvent(payload, signature, liveSecret);
    } catch {
      // If live verification fails, try test webhook secret
      event = testStripe.webhooks.constructEvent(payload, signature, testSecret);
    }

    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: any): Promise<void> {
    const type = event.type;
    const data = event.data?.object;

    if (!data) return;

    switch (type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id;
        if (!customerId) break;

        const orgs = await storage.getAllOrganizations();
        const org = orgs.find(o => o.stripeCustomerId === customerId);
        if (!org) {
          console.log(`[webhook] No org found for Stripe customer ${customerId}`);
          break;
        }

        const testMode = org.stripeTestMode;
        const newStatus = mapStripeStatusToInternal(data.status, org.subscriptionStatus);

        if (newStatus === 'canceled') {
          const result = await handleCancellation(org.id, org);
          console.log(`[webhook] Subscription canceled for org ${org.id}: ${result}`);
          break;
        }

        await storage.updateOrganizationStripeInfo(org.id, {
          subscriptionStatus: newStatus,
          stripeSubscriptionId: data.id,
        });

        if (data.status === 'active' && data.current_period_start) {
          const periodStart = new Date(data.current_period_start * 1000);
          const existingStart = org.billingCycleStart;
          if (!existingStart || existingStart.getMonth() !== periodStart.getMonth() || existingStart.getFullYear() !== periodStart.getFullYear()) {
            await storage.updateOrganization(org.id, {
              billingCycleStart: periodStart,
            });
            await storage.syncOrgCredits(org.id);
          }
        }

        try {
          const addonPriceId = await stripeService.getAddonPriceId(testMode);
          const subItems = data.items?.data || [];
          const addonItem = subItems.find((item: any) => {
            const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
            return priceId === addonPriceId;
          });
          const addonQuantity = addonItem ? Math.min(addonItem.quantity || 0, 5) : 0;

          if (addonQuantity !== (org.additionalPetSlots || 0)) {
            await storage.updateOrganization(org.id, { additionalPetSlots: addonQuantity });
            console.log(`[webhook] Synced add-on slots for org ${org.id}: ${addonQuantity}`);
          }
        } catch (addonErr: any) {
          console.error(`[webhook] Error syncing add-on slots for org ${org.id}:`, addonErr.message);
        }

        console.log(`[webhook] Updated org ${org.id} subscription: ${newStatus}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id;
        if (!customerId) break;

        const orgs = await storage.getAllOrganizations();
        const org = orgs.find(o => o.stripeCustomerId === customerId);
        if (!org) break;

        if (data.billing_reason === 'subscription_cycle') {
          const periodStart = data.period_start
            ? new Date(data.period_start * 1000)
            : new Date();

          const updateFields: any = { billingCycleStart: periodStart };

          if (org.pendingPlanId) {
            const pendingPlan = await storage.getSubscriptionPlan(org.pendingPlanId);
            if (pendingPlan) {
              updateFields.planId = pendingPlan.id;
              updateFields.pendingPlanId = null;
              updateFields.additionalPetSlots = 0;
              console.log(`[webhook] Applied pending plan change for org ${org.id}: plan ${pendingPlan.name}`);
            } else {
              updateFields.pendingPlanId = null;
            }
          }

          await storage.updateOrganization(org.id, updateFields);
          await storage.syncOrgCredits(org.id);
          console.log(`[webhook] Synced credits for org ${org.id} on billing cycle`);
        }
        break;
      }

      case 'checkout.session.completed': {
        // Handle merch order payments — safety net in case customer doesn't return to page
        const merchOrderId = data.metadata?.merchOrderId;
        if (!merchOrderId) break; // Not a merch order checkout

        const orderResult = await pool.query(
          `SELECT * FROM merch_orders WHERE id = $1`,
          [parseInt(merchOrderId)]
        );
        if (orderResult.rows.length === 0) break;

        const order = orderResult.rows[0];
        if (order.status !== 'awaiting_payment') {
          console.log(`[webhook] Merch order ${merchOrderId} already processed (status: ${order.status})`);
          break;
        }

        if (data.payment_status !== 'paid') break;

        // Mark as paid
        await pool.query(
          `UPDATE merch_orders SET status = 'paid' WHERE id = $1`,
          [order.id]
        );

        // Get order items for Printful
        const itemsResult = await pool.query(
          `SELECT * FROM merch_order_items WHERE order_id = $1`,
          [order.id]
        );

        const imageUrl = data.metadata?.imageUrl;
        if (!imageUrl) {
          console.error(`[webhook] No imageUrl in session metadata for merch order ${order.id}`);
          break;
        }

        // Submit to Printful
        const recipient: PrintfulRecipient = {
          name: order.customer_name,
          address1: order.shipping_street,
          city: order.shipping_city,
          state_code: order.shipping_state,
          zip: order.shipping_zip,
          country_code: order.shipping_country || 'US',
          email: order.customer_email,
          phone: order.customer_phone,
        };

        try {
          const printfulItems = itemsResult.rows.map((item: any) =>
            buildOrderItem(item.variant_id, item.quantity, imageUrl)
          );
          const printfulOrder = await createPrintfulOrder(recipient, printfulItems, String(order.id));

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
            console.warn(`[webhook] Auto-confirm failed for order ${order.id}:`, confirmErr.message);
          }

          // Send confirmation email with watermarked portrait
          if (order.customer_email && isEmailConfigured()) {
            try {
              const org = await storage.getOrganization(order.organization_id);
              const itemDescriptions = itemsResult.rows.map((item: any) => {
                const product = getProduct(item.product_key);
                return `${product?.name || item.product_key} x${item.quantity}`;
              });
              const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
              const dogName = dogResult?.name || 'your pet';
              const orgName = org?.name || 'Pawtrait Pros';

              const { subject, html } = buildOrderConfirmationEmail(orgName, dogName, order.id, order.total_cents, itemDescriptions);

              let attachments: Array<{ filename: string; content: Buffer }> | undefined;
              if (order.portrait_id) {
                try {
                  const baseUrl = process.env.APP_URL || 'https://pawtraitpros.com';
                  const downloadRes = await fetch(`${baseUrl}/api/portraits/${order.portrait_id}/download`);
                  if (downloadRes.ok) {
                    const buffer = Buffer.from(await downloadRes.arrayBuffer());
                    attachments = [{ filename: `${dogName.replace(/[^a-zA-Z0-9]/g, '-')}-portrait.png`, content: buffer }];
                  }
                } catch (dlErr: any) {
                  console.warn(`[webhook] Failed to fetch watermarked portrait:`, dlErr.message);
                }
              }

              await sendEmail(order.customer_email, subject, html, attachments);
              console.log(`[webhook] Confirmation email sent for merch order ${order.id}`);
            } catch (emailErr: any) {
              console.warn(`[webhook] Failed to send confirmation email for order ${order.id}:`, emailErr.message);
            }
          }

          console.log(`[webhook] Merch order ${order.id} fulfilled via webhook`);
        } catch (printfulErr: any) {
          console.error(`[webhook] Printful order failed for paid order ${order.id}:`, printfulErr.message);
          await pool.query(
            `UPDATE merch_orders SET status = 'paid_fulfillment_pending', printful_status = $1 WHERE id = $2`,
            [printfulErr.message, order.id]
          );
        }
        break;
      }

      default:
        break;
    }
  }
}
