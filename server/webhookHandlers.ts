import { getStripeClient, getWebhookSecret, mapStripeStatusToInternal } from './stripeClient';
import { storage } from './storage';
import { stripeService } from './stripeService';
import { handleCancellation } from './subscription';

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

      default:
        break;
    }
  }
}
