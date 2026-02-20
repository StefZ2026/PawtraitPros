import { storage } from './storage';
import type { Organization, SubscriptionPlan } from '@shared/schema';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function getTrialEndDate(org: { trialEndsAt: Date | null; createdAt: Date }): Date | null {
  if (org.trialEndsAt) return new Date(org.trialEndsAt);
  if (org.createdAt) return new Date(new Date(org.createdAt).getTime() + TRIAL_DURATION_MS);
  return null;
}

export function isTrialExpired(org: { subscriptionStatus: string | null; trialEndsAt: Date | null; createdAt: Date }): boolean {
  if (org.subscriptionStatus !== 'trial') return false;
  const trialEnd = getTrialEndDate(org);
  return trialEnd ? trialEnd < new Date() : false;
}

export function isWithinTrialWindow(org: { trialEndsAt: Date | null; createdAt: Date }): boolean {
  const trialEnd = getTrialEndDate(org);
  return trialEnd ? trialEnd > new Date() : false;
}

export async function getFreeTrial(): Promise<SubscriptionPlan | undefined> {
  const plans = await storage.getAllSubscriptionPlans();
  return plans.find(p => p.name === 'Free Trial');
}

export async function revertToFreeTrial(orgId: number): Promise<boolean> {
  const freeTrial = await getFreeTrial();
  if (!freeTrial) return false;

  await storage.updateOrganizationStripeInfo(orgId, {
    subscriptionStatus: 'trial',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
  await storage.updateOrganization(orgId, {
    planId: freeTrial.id,
    additionalPetSlots: 0,
  });
  return true;
}

export async function handleCancellation(orgId: number, org: { trialEndsAt: Date | null; createdAt: Date }): Promise<'reverted_to_trial' | 'canceled'> {
  if (isWithinTrialWindow(org)) {
    const reverted = await revertToFreeTrial(orgId);
    if (reverted) return 'reverted_to_trial';
  }

  await storage.updateOrganizationStripeInfo(orgId, {
    subscriptionStatus: 'canceled',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
  await storage.updateOrganization(orgId, {
    additionalPetSlots: 0,
    planId: null,
  });
  return 'canceled';
}

export function canStartFreeTrial(org: { hasUsedFreeTrial: boolean; trialEndsAt: Date | null }): boolean {
  if (org.hasUsedFreeTrial) return false;
  if (org.trialEndsAt) return false;
  return true;
}

export async function markFreeTrialUsed(orgId: number): Promise<void> {
  await storage.updateOrganization(orgId, { hasUsedFreeTrial: true } as any);
}
