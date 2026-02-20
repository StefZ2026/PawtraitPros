import { getStripeClient, getPriceId } from './stripeClient';

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
        description: 'Additional pet slot for your rescue organization ($3/month per slot)',
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
}

export const stripeService = new StripeService();
