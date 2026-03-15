/**
 * Stripe Connect Express — Integration for Business Payouts
 *
 * Enables sending merch earnings (30% of margin) to business bank accounts.
 * Uses Stripe Connect Express accounts — businesses complete onboarding via Stripe's hosted flow.
 *
 * Uses the LIVE Stripe client — payouts are always real money.
 */

import { getStripeClient } from './stripeClient';

// Always use live Stripe for Connect (payouts are real money)
function getLiveStripe() {
  return getStripeClient(false); // false = live mode
}

/**
 * Create a Stripe Connect Express account for a business.
 */
export async function createConnectAccount(orgName: string, contactEmail: string): Promise<string> {
  const stripe = getLiveStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: contactEmail,
    business_type: 'company',
    company: {
      name: orgName,
    },
    capabilities: {
      transfers: { requested: true },
    },
  });
  return account.id;
}

/**
 * Create an onboarding link for a Connect account.
 * Redirects the user to Stripe's hosted onboarding flow.
 */
export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
  const stripe = getLiveStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

/**
 * Check if a Connect account has completed onboarding and can receive payouts.
 */
export async function checkAccountStatus(accountId: string): Promise<{
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const stripe = getLiveStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    payoutsEnabled: account.payouts_enabled || false,
    chargesEnabled: account.charges_enabled || false,
    detailsSubmitted: account.details_submitted || false,
  };
}

/**
 * Create a transfer to a Connect account (payout to business).
 */
export async function createTransfer(
  accountId: string,
  amountCents: number,
  metadata: Record<string, string> = {},
): Promise<string> {
  const stripe = getLiveStripe();
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: accountId,
    metadata,
  });
  return transfer.id;
}
