import crypto from 'crypto';
import { getStripeClient, getWebhookSecret, mapStripeStatusToInternal } from './stripeClient';
import { storage } from './storage';
import { pool } from './db';
import { stripeService } from './stripeService';
import { handleCancellation } from './subscription';
import { getProduct } from './printful-config';
import { createOrder as createPrintfulOrder, confirmOrder as confirmPrintfulOrder, buildOrderItem, type PrintfulRecipient } from './printful';
import { sendEmail, isEmailConfigured, buildOrderConfirmationEmail } from './routes/email';
import { recordMerchEarnings } from './merch-payouts';

export class WebhookHandlers {

  // --- Gelato order status webhook ---
  static async processGelatoWebhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<{ status: number; body: any }> {
    const gelatoSecret = process.env.GELATO_WEBHOOK_SECRET;
    if (gelatoSecret) {
      if (!signatureHeader) {
        console.warn('[gelato-webhook] Missing signature header — rejecting');
        return { status: 401, body: { error: 'Missing webhook signature' } };
      }
      const expected = crypto.createHmac('sha256', gelatoSecret).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
        console.warn('[gelato-webhook] Invalid signature — rejecting');
        return { status: 401, body: { error: 'Invalid webhook signature' } };
      }
    }

    const body = JSON.parse(rawBody.toString());
    const { event, orderId, orderReferenceId, fulfillmentStatus, items } = body;
    console.log(`[gelato-webhook] Received: ${event} for order ${orderReferenceId || orderId}`);

    if (event !== 'order_status_updated' && event !== 'order_item_status_updated') {
      return { status: 200, body: { received: true } };
    }
    if (!orderReferenceId) {
      return { status: 200, body: { received: true } };
    }

    const merchOrderId = orderReferenceId.startsWith('gelato-')
      ? parseInt(orderReferenceId.replace('gelato-', ''))
      : null;
    if (!merchOrderId || isNaN(merchOrderId)) {
      return { status: 200, body: { received: true } };
    }

    let appStatus: string | null = null;
    switch (fulfillmentStatus) {
      case 'shipped':
      case 'in_transit':
        appStatus = 'shipped';
        break;
      case 'delivered':
        appStatus = 'delivered';
        break;
      case 'failed':
      case 'returned':
        appStatus = 'failed';
        break;
      case 'canceled':
        appStatus = 'canceled';
        break;
      case 'in_production':
      case 'printed':
        appStatus = 'fulfilled';
        break;
    }

    const updateFields = ['printful_status = $1'];
    const updateValues: any[] = [fulfillmentStatus];
    let paramIdx = 2;

    if (appStatus) {
      updateFields.push(`status = $${paramIdx}`);
      updateValues.push(appStatus);
      paramIdx++;
    }
    if (orderId) {
      updateFields.push(`printful_order_id = $${paramIdx}`);
      updateValues.push(orderId);
      paramIdx++;
    }

    updateValues.push(merchOrderId);
    await pool.query(
      `UPDATE merch_orders SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
      updateValues
    );

    if (fulfillmentStatus === 'shipped' && items?.[0]?.fulfillments?.[0]?.trackingUrl) {
      const tracking = items[0].fulfillments[0];
      console.log(`[gelato-webhook] Tracking for order ${merchOrderId}: ${tracking.trackingUrl}`);
    }

    console.log(`[gelato-webhook] Updated merch_order ${merchOrderId}: ${fulfillmentStatus} → ${appStatus || 'unchanged'}`);
    return { status: 200, body: { received: true } };
  }

  // --- Printful order status webhook ---
  static async processPrintfulWebhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<{ status: number; body: any }> {
    const printfulSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (printfulSecret) {
      if (!signatureHeader) {
        console.warn('[printful-webhook] Missing signature header — rejecting');
        return { status: 401, body: { error: 'Missing webhook signature' } };
      }
      const expected = crypto.createHmac('sha256', printfulSecret).update(rawBody).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
        console.warn('[printful-webhook] Invalid signature — rejecting');
        return { status: 401, body: { error: 'Invalid webhook signature' } };
      }
    }

    const body = JSON.parse(rawBody.toString());
    const { type, data } = body;
    console.log(`[printful-webhook] Received event: ${type}`);

    if (!data?.order?.external_id) {
      return { status: 200, body: { received: true } };
    }

    const merchOrderId = parseInt(data.order.external_id);
    if (isNaN(merchOrderId)) {
      return { status: 200, body: { received: true } };
    }

    const printfulStatus = data.order.status || type;
    let appStatus: string | null = null;

    switch (type) {
      case 'package_shipped':
        appStatus = 'shipped';
        break;
      case 'order_failed':
        appStatus = 'failed';
        break;
      case 'order_canceled':
        appStatus = 'canceled';
        break;
      case 'order_created':
        appStatus = 'submitted';
        break;
      case 'order_updated':
        break;
    }

    const updateFields = ['printful_status = $1'];
    const updateValues: any[] = [printfulStatus];
    let paramIdx = 2;

    if (appStatus) {
      updateFields.push(`status = $${paramIdx}`);
      updateValues.push(appStatus);
      paramIdx++;
    }
    if (data.order.id) {
      updateFields.push(`printful_order_id = $${paramIdx}`);
      updateValues.push(String(data.order.id));
      paramIdx++;
    }

    updateValues.push(merchOrderId);
    await pool.query(
      `UPDATE merch_orders SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
      updateValues
    );

    console.log(`[printful-webhook] Updated merch_order ${merchOrderId}: ${type} → ${appStatus || 'status unchanged'}`);
    return { status: 200, body: { received: true } };
  }

  // --- Stripe webhook ---
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
          const addonPriceId = await stripeService.getOrCreateAddonPriceId(testMode);
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

        // Referral commission: 5% of subscription payments for first 12 months
        if (org.referredByOrgId && (data.billing_reason === 'subscription_create' || data.billing_reason === 'subscription_cycle')) {
          try {
            // Set referral start date on first subscription payment
            if (!org.referralStartDate) {
              await storage.updateOrganization(org.id, { referralStartDate: new Date() } as any);
              console.log(`[webhook] Referral start date set for org ${org.id}`);
            }

            const startDate = org.referralStartDate || new Date();
            const monthsElapsed = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365 / 12);

            if (monthsElapsed < 12) {
              // Get subscription line items only (exclude add-ons/merch)
              const subscriptionAmount = data.lines?.data
                ?.filter((line: any) => line.type === 'subscription')
                ?.reduce((sum: number, line: any) => sum + (line.amount || 0), 0) || data.amount_paid || 0;

              if (subscriptionAmount > 0) {
                const commissionCents = Math.round(subscriptionAmount * 0.05);
                const invoiceId = data.id || `inv_${Date.now()}`;

                await storage.createReferralCommission({
                  referrerOrgId: org.referredByOrgId,
                  referredOrgId: org.id,
                  stripeInvoiceId: invoiceId,
                  invoiceAmountCents: subscriptionAmount,
                  commissionCents,
                });

                // Apply credit to referrer's Stripe balance
                const referrerOrg = await storage.getOrganization(org.referredByOrgId);
                if (referrerOrg?.stripeCustomerId) {
                  const testMode = referrerOrg.stripeTestMode;
                  const stripe = getStripeClient(testMode);
                  await stripe.customers.createBalanceTransaction(referrerOrg.stripeCustomerId, {
                    amount: -commissionCents, // negative = credit
                    currency: 'usd',
                    description: `Referral credit — thanks for referring ${org.name}!`,
                  });

                  // Mark as applied
                  const commissions = await storage.getReferralCommissions(org.referredByOrgId);
                  const latest = commissions.find((c: any) => c.stripe_invoice_id === invoiceId);
                  if (latest) {
                    await storage.markReferralCreditApplied(latest.id);
                  }

                  console.log(`[webhook] Referral commission: $${(commissionCents / 100).toFixed(2)} credited to org ${referrerOrg.id} (${referrerOrg.name}) for referring org ${org.id} (${org.name})`);
                } else {
                  console.log(`[webhook] Referral commission recorded for org ${org.referredByOrgId} but no Stripe customer to credit`);
                }
              }
            } else {
              console.log(`[webhook] Referral window expired for org ${org.id} (${monthsElapsed.toFixed(1)} months elapsed)`);
            }
          } catch (refErr: any) {
            console.error(`[webhook] Referral commission error for org ${org.id}:`, refErr.message);
          }
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

        // Capture actual tax and total from Stripe (includes automatic tax if enabled)
        const actualTotalCents = data.amount_total || order.total_cents;
        const taxCents = data.total_details?.amount_tax || 0;

        // Mark as paid and update with actual amounts
        await pool.query(
          `UPDATE merch_orders SET status = 'paid', total_cents = $1, tax_cents = $2 WHERE id = $3`,
          [actualTotalCents, taxCents, order.id]
        );

        // Record merch earnings (70/30 split)
        await recordMerchEarnings(order.id, order.organization_id);

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

              await sendEmail(order.customer_email, subject, html, attachments, orgName);
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

      case 'checkout.session.expired': {
        // Customer abandoned Stripe checkout — delete the unpaid order
        const expiredMerchOrderId = data.metadata?.merchOrderId;
        if (!expiredMerchOrderId) break;

        const expiredOrder = await pool.query(
          `SELECT id, status FROM merch_orders WHERE id = $1`,
          [parseInt(expiredMerchOrderId)]
        );
        if (expiredOrder.rows.length === 0) break;
        if (expiredOrder.rows[0].status !== 'awaiting_payment') break;

        await pool.query(`DELETE FROM merch_order_items WHERE order_id = $1`, [parseInt(expiredMerchOrderId)]);
        await pool.query(`DELETE FROM merch_orders WHERE id = $1`, [parseInt(expiredMerchOrderId)]);
        console.log(`[webhook] Deleted expired merch order ${expiredMerchOrderId}`);
        break;
      }

      default:
        break;
    }
  }
}
