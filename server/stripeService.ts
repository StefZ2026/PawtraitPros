import { getStripeClient, getPriceId } from './stripeClient';
import { db } from './db';
import { subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';

let cachedTestAddonPriceId: string | null = null;
let cachedLiveAddonPriceId: string | null = null;

// Helper: normalize undefined → true (test mode) for cache/branching
function isTestMode(testMode?: boolean): boolean {
  return testMode !== false;
}

export class StripeService {
  async createCustomer(email: string, orgId: number, organizationName: string, testMode?: boolean) {
    const stripe = getStripeClient(testMode);
    return await stripe.customers.create({
      email,
      name: organizationName,
      metadata: { orgId: String(orgId), organizationName },
    });
  }

  async retrieveCustomer(customerId: string, testMode?: boolean) {
    const stripe = getStripeClient(testMode);
    return await stripe.customers.retrieve(customerId);
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    testMode?: boolean,
    trialDays?: number,
    metadata?: Record<string, string>
  ) {
    const stripe = getStripeClient(testMode);
    const effectivePriceId = getPriceId(priceId, testMode);

    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: effectivePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    if (trialDays && trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
    }

    if (metadata) {
      sessionParams.metadata = metadata;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string, testMode?: boolean) {
    const stripe = getStripeClient(testMode);
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async retrieveCheckoutSession(sessionId: string, testMode?: boolean) {
    const stripe = getStripeClient(testMode);
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  }

  async retrieveSubscription(subscriptionId: string, testMode?: boolean) {
    const stripe = getStripeClient(testMode);
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  async getOrCreateAddonPriceId(testMode?: boolean): Promise<string> {
    const test = isTestMode(testMode);
    const cached = test ? cachedTestAddonPriceId : cachedLiveAddonPriceId;
    if (cached) return cached;

    if (process.env.STRIPE_ADDON_PRICE_ID) {
      const val = process.env.STRIPE_ADDON_PRICE_ID;
      if (test) cachedTestAddonPriceId = val;
      else cachedLiveAddonPriceId = val;
      return val;
    }

    const stripe = getStripeClient(testMode);

    const products = await stripe.products.search({
      query: "metadata['type']:'pet_slot_addon'",
    });

    let product;
    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: 'Extra Pet Slot',
        description: 'Additional pet slot for your business ($3/month per slot)',
        metadata: { type: 'pet_slot_addon' },
      });
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: 'recurring',
    });

    let price = prices.data.find(
      p => p.unit_amount === 300 && p.recurring?.interval === 'month'
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 300,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { type: 'pet_slot_addon' },
      });
    }

    if (test) cachedTestAddonPriceId = price.id;
    else cachedLiveAddonPriceId = price.id;
    return price.id;
  }

  async updateAddonSlots(subscriptionId: string, quantity: number, testMode?: boolean): Promise<void> {
    const stripe = getStripeClient(testMode);
    const addonPriceId = await this.getOrCreateAddonPriceId(testMode);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const existingItem = subscription.items.data.find((item: any) => {
      const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
      return priceId === addonPriceId;
    });

    if (quantity === 0 && existingItem) {
      await stripe.subscriptionItems.del(existingItem.id, {
        proration_behavior: 'create_prorations',
      } as any);
    } else if (quantity > 0 && existingItem) {
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity,
        proration_behavior: 'create_prorations',
      } as any);
    } else if (quantity > 0 && !existingItem) {
      await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price: addonPriceId,
        quantity,
        proration_behavior: 'create_prorations',
      } as any);
    }
  }

  async removeAddonFromSubscription(subscriptionId: string, testMode?: boolean): Promise<void> {
    const stripe = getStripeClient(testMode);
    const addonPriceId = await this.getOrCreateAddonPriceId(testMode);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const existingItem = subscription.items.data.find((item: any) => {
      const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
      return priceId === addonPriceId;
    });

    if (existingItem) {
      await stripe.subscriptionItems.del(existingItem.id, {
        proration_behavior: 'create_prorations',
      } as any);
    }
  }

  async getAddonPriceId(testMode?: boolean): Promise<string> {
    return this.getOrCreateAddonPriceId(testMode);
  }

  async scheduleDowngrade(subscriptionId: string, newPriceId: string, testMode?: boolean): Promise<{ currentPeriodEnd: Date }> {
    const stripe = getStripeClient(testMode);
    const addonPriceId = await this.getOrCreateAddonPriceId(testMode);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

    const mainItem = subscription.items.data.find((item: any) => {
      const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
      return priceId !== addonPriceId;
    }) || subscription.items.data[0];

    const effectivePriceId = getPriceId(newPriceId, testMode);

    await stripe.subscriptions.update(subscriptionId, {
      proration_behavior: 'none',
      items: [{
        id: mainItem.id,
        price: effectivePriceId,
      }],
      cancel_at_period_end: false,
    } as any);

    const periodEnd = new Date(subscription.current_period_end * 1000);

    return { currentPeriodEnd: periodEnd };
  }

  async getSubscriptionPeriodEnd(subscriptionId: string, testMode?: boolean): Promise<Date | null> {
    const stripe = getStripeClient(testMode);
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
      return new Date(subscription.current_period_end * 1000);
    } catch {
      return null;
    }
  }
  /**
   * Ensure Stripe products + prices exist for all vertical-specific plans.
   * Idempotent — safe to run on every startup. Only creates what's missing.
   * testMode=true stores in stripePriceId/stripeProductId,
   * testMode=false stores in stripeLivePriceId/stripeProductLiveId.
   */
  async ensureVerticalPlanProducts(testMode?: boolean): Promise<void> {
    const test = isTestMode(testMode);
    const stripe = getStripeClient(testMode);

    const allPlans = await db.select().from(subscriptionPlans);

    for (const plan of allPlans) {
      if (!plan.vertical) continue; // skip legacy plans
      if (plan.priceMonthly === 0) continue; // skip free/trial plans

      const existingPrice = test ? plan.stripePriceId : plan.stripeLivePriceId;
      if (existingPrice) continue; // already set up for this mode

      try {
        // Search for existing product by metadata
        const products = await stripe.products.search({
          query: `metadata['prosplanid']:'${plan.id}'`,
        });

        let product;
        if (products.data.length > 0) {
          product = products.data[0];
        } else {
          product = await stripe.products.create({
            name: plan.name,
            description: plan.description || `${plan.name} plan`,
            metadata: {
              prosplanid: String(plan.id),
              vertical: plan.vertical || '',
              unitType: plan.unitType || '',
            },
          });
        }

        // Look for matching price on the product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          type: 'recurring',
        });

        let price = prices.data.find(
          p => p.unit_amount === plan.priceMonthly && p.recurring?.interval === 'month'
        );

        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.priceMonthly,
            currency: 'usd',
            recurring: { interval: 'month' },
            metadata: { prosplanid: String(plan.id) },
          });
        }

        // Store IDs on the plan row
        const updateData: Record<string, any> = {};
        if (test) {
          updateData.stripePriceId = price.id;
          updateData.stripeProductId = product.id;
        } else {
          updateData.stripeLivePriceId = price.id;
          updateData.stripeProductLiveId = product.id;
        }

        await db.update(subscriptionPlans).set(updateData).where(eq(subscriptionPlans.id, plan.id));
        console.log(`[stripe] Ensured ${test ? 'test' : 'live'} product/price for plan ${plan.id} (${plan.name})`);
      } catch (err: any) {
        console.error(`[stripe] Error ensuring product for plan ${plan.id}:`, err.message);
      }
    }
  }
}

export const stripeService = new StripeService();
