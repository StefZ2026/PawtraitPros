// Stripe client integration for Pawtrait Pros
// Supports dual mode: test keys for testing, live keys for production

import Stripe from 'stripe';

// Test mode Stripe client
const testStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
});

// Live mode Stripe client
const liveStripe = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
});

// IMPORTANT: undefined defaults to test mode for backward compat
// (org.stripeTestMode is not in Drizzle schema, reads as undefined)
// Only explicit `false` triggers live mode
export function getStripeClient(testMode?: boolean): Stripe {
  return testMode === false ? liveStripe : testStripe;
}

export function getStripePublishableKey(testMode?: boolean): string {
  return testMode === false
    ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY!
    : process.env.STRIPE_PUBLISHABLE_KEY!;
}

export function getWebhookSecret(testMode?: boolean): string {
  return testMode === false
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET!
    : process.env.STRIPE_WEBHOOK_SECRET!;
}

// Map test price IDs → live price IDs
const TEST_TO_LIVE_PRICE: Record<string, string> = {
  'price_1T1NpB2LfX3IuyBIb44I2uwq': 'price_1SxgIU2LfX3IuyBI3iXCfRn5', // Starter $39
  'price_1T1NpC2LfX3IuyBIBj9Mdx3f': 'price_1SxgIU2LfX3IuyBIbG1jtLcC', // Professional $79
  'price_1T1NpC2LfX3IuyBIPtezJkZ0': 'price_1SxgIU2LfX3IuyBIUy4rwplJ', // Executive $349
};

// Get the correct price ID for the given Stripe mode
// Only explicit false → live price mapping; undefined/true → keep test price
export function getPriceId(priceId: string, testMode?: boolean): string {
  if (testMode === false) return TEST_TO_LIVE_PRICE[priceId] || priceId;
  return priceId;
}

// Map any price ID (test or live) to internal plan
export const STRIPE_PLAN_PRICE_MAP: Record<string, { id: number; name: string }> = {
  // Test price IDs
  'price_1T1NpB2LfX3IuyBIb44I2uwq': { id: 6, name: 'Starter' },
  'price_1T1NpC2LfX3IuyBIBj9Mdx3f': { id: 7, name: 'Professional' },
  'price_1T1NpC2LfX3IuyBIPtezJkZ0': { id: 8, name: 'Executive' },
  // Live price IDs
  'price_1SxgIU2LfX3IuyBI3iXCfRn5': { id: 6, name: 'Starter' },
  'price_1SxgIU2LfX3IuyBIbG1jtLcC': { id: 7, name: 'Professional' },
  'price_1SxgIU2LfX3IuyBIUy4rwplJ': { id: 8, name: 'Executive' },
};

export function mapStripeStatusToInternal(
  stripeStatus: string,
  currentStatus?: string | null
): string {
  switch (stripeStatus) {
    case 'active': return 'active';
    case 'trialing': return 'trial';
    case 'past_due': return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled';
    default:
      return currentStatus || 'inactive';
  }
}
