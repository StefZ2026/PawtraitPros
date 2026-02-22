import { storage } from "../storage";
import { getStripeClient, mapStripeStatusToInternal, STRIPE_PLAN_PRICE_MAP } from "../stripeClient";
import { handleCancellation, isWithinTrialWindow, revertToFreeTrial, getFreeTrial, markFreeTrialUsed } from "../subscription";
import { ADMIN_EMAIL } from "./helpers";

export async function runStartupHealthCheck(): Promise<void> {
  if (ADMIN_EMAIL) {
    const allOrgsStartup = await storage.getAllOrganizations();
    const users = await storage.getAllUsers();
    let adminUserId: string | null = null;
    const adminUser = users.find((u: any) => u.email === ADMIN_EMAIL);
    if (adminUser) adminUserId = adminUser.id;
    if (adminUserId) {
      const adminOrgs = allOrgsStartup.filter(o => o.ownerId === adminUserId);
      for (const adminOrg of adminOrgs) {
        await storage.clearOrganizationOwner(adminOrg.id);
        console.log(`[startup] Removed admin ownership from "${adminOrg.name}" (ID ${adminOrg.id}) — admin should not own any business`);
      }
    }
  }

  try {
    const allOrgsForSync = await storage.getAllOrganizations();
    const orgsWithStripe = allOrgsForSync.filter(o => o.stripeSubscriptionId);
    for (const org of orgsWithStripe) {
      try {
        const stripe = getStripeClient(org.stripeTestMode);
        const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId!);
        const newStatus = mapStripeStatusToInternal(sub.status, org.subscriptionStatus);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const matchedPlan = priceId ? STRIPE_PLAN_PRICE_MAP[priceId] : undefined;
        const changes: string[] = [];
        const orgUpdates: any = {};

        if (newStatus === 'canceled') {
          const result = await handleCancellation(org.id, org);
          console.log(`[startup] Stripe sync for "${org.name}" (ID ${org.id}): ${result}`);
          continue;
        }

        if (newStatus !== org.subscriptionStatus) {
          await storage.updateOrganizationStripeInfo(org.id, {
            subscriptionStatus: newStatus,
            stripeSubscriptionId: org.stripeSubscriptionId!,
          });
          changes.push(`status: ${org.subscriptionStatus} → ${newStatus}`);
        }

        if (matchedPlan && matchedPlan.id !== org.planId) {
          orgUpdates.planId = matchedPlan.id;
          changes.push(`plan: → ${matchedPlan.name}`);
        }

        if (sub.status === 'active' && (sub as any).current_period_start) {
          const periodStart = new Date((sub as any).current_period_start * 1000);
          if (!org.billingCycleStart || org.billingCycleStart.getTime() !== periodStart.getTime()) {
            orgUpdates.billingCycleStart = periodStart;
            changes.push(`billing cycle updated`);
          }
        }

        if (Object.keys(orgUpdates).length > 0) {
          await storage.updateOrganization(org.id, orgUpdates);
        }

        if (changes.length > 0) {
          console.log(`[startup] Stripe sync for "${org.name}" (ID ${org.id}): ${changes.join(', ')}`);
        }
      } catch (stripeErr: any) {
        if (stripeErr?.type === 'StripeInvalidRequestError' || stripeErr?.statusCode === 404 || stripeErr?.code === 'resource_missing') {
          console.warn(`[startup] Stale Stripe subscription for "${org.name}" (ID ${org.id}), cleaning up`);
          const result = await handleCancellation(org.id, org);
          console.log(`[startup] Stale sub cleanup for "${org.name}": ${result}`);
        } else {
          console.error(`[startup] Stripe sync error for "${org.name}" (ID ${org.id}):`, stripeErr.message);
        }
      }
    }

    if (orgsWithStripe.length > 0) {
      console.log(`[startup] Stripe sync complete: checked ${orgsWithStripe.length} org(s)`);
    }
  } catch (syncErr: any) {
    console.error("[startup] Stripe sync failed:", syncErr.message);
  }

  try {
    const stripe = getStripeClient(true);
    const dbPlans = await storage.getAllSubscriptionPlans();
    let plansSynced = 0;
    for (const plan of dbPlans) {
      if (!plan.stripePriceId) continue;
      try {
        const price = await stripe.prices.retrieve(plan.stripePriceId, { expand: ['product'] });
        const product = price.product as any;
        if (product && !product.deleted) {
          const dbUpdates: Record<string, any> = {};
          if (product.name && product.name !== plan.name) {
            dbUpdates.name = product.name;
          }
          if (product.description !== undefined && product.description !== null && product.description !== plan.description) {
            dbUpdates.description = product.description;
          }
          if (product.id && product.id !== plan.stripeProductId) {
            dbUpdates.stripeProductId = product.id;
          }
          if (Object.keys(dbUpdates).length > 0) {
            await storage.updateSubscriptionPlan(plan.id, dbUpdates);
            plansSynced++;
            console.log(`[startup] Synced plan "${plan.name}" from Stripe: ${JSON.stringify(dbUpdates)}`);
          }
        }
      } catch (prodErr: any) {
        console.warn(`[startup] Could not sync Stripe product for plan "${plan.name}":`, prodErr.message);
      }
    }
    if (plansSynced > 0) {
      console.log(`[startup] Updated ${plansSynced} plan(s) from Stripe product data`);
    }
  } catch (descSyncErr: any) {
    console.warn("[startup] Stripe product sync failed:", descSyncErr.message);
  }

  const seqFixes = await storage.repairSequences();
  if (seqFixes.length > 0) {
    console.log(`[startup] Repaired DB sequences: ${seqFixes.join(', ')}`);
  }

  const creditResults = await storage.recalculateAllOrgCredits();
  if (creditResults.length > 0) {
    console.log(`[startup] Recalculated credits for ${creditResults.length} org(s):`, creditResults);
  }

  const allOrgs = await storage.getAllOrganizations();
  const allPlans = await storage.getAllSubscriptionPlans();
  const freeTrialPlan = await getFreeTrial();
  const issues: string[] = [];
  const fixes: string[] = [];

  for (const org of allOrgs) {
    if (org.subscriptionStatus === 'active' && !org.stripeSubscriptionId) {
      const result = await handleCancellation(org.id, org);
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) active without subscription → ${result}`);
    }

    if (org.stripeCustomerId && !org.stripeSubscriptionId && org.subscriptionStatus !== 'active') {
      try {
        const stripe = getStripeClient(org.stripeTestMode);
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if ((customer as any).deleted) {
          await storage.updateOrganizationStripeInfo(org.id, { stripeCustomerId: null, stripeSubscriptionId: null });
          fixes.push(`FIXED: "${org.name}" (ID ${org.id}) cleared deleted Stripe customer`);
        }
      } catch (custErr: any) {
        if (custErr?.type === 'StripeInvalidRequestError' || custErr?.statusCode === 404 || custErr?.code === 'resource_missing') {
          await storage.updateOrganizationStripeInfo(org.id, { stripeCustomerId: null, stripeSubscriptionId: null });
          fixes.push(`FIXED: "${org.name}" (ID ${org.id}) cleared stale Stripe customer`);
        }
      }
    }

    if (org.subscriptionStatus === 'canceled' && !org.stripeSubscriptionId && isWithinTrialWindow(org)) {
      const reverted = await revertToFreeTrial(org.id);
      if (reverted) {
        fixes.push(`FIXED: "${org.name}" (ID ${org.id}) canceled without Stripe sub, still in trial → reverted to Free Trial`);
      }
    }

    if (org.subscriptionStatus === 'trial' && !org.trialEndsAt && org.createdAt) {
      const trialEndsAt = new Date(new Date(org.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      await storage.updateOrganization(org.id, { trialEndsAt });
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) backfilled trialEndsAt`);
    }

    if (!org.hasUsedFreeTrial && (org.subscriptionStatus === 'trial' || org.trialEndsAt)) {
      await markFreeTrialUsed(org.id);
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) marked hasUsedFreeTrial`);
    }

    const dogCount = (await storage.getDogsByOrganization(org.id)).length;

    if (!org.planId && (dogCount > 0 || org.subscriptionStatus === 'trial')) {
      if (freeTrialPlan) {
        await storage.updateOrganization(org.id, {
          planId: freeTrialPlan.id,
          subscriptionStatus: 'trial',
          billingCycleStart: org.billingCycleStart || org.createdAt || new Date(),
        });
        fixes.push(`FIXED: "${org.name}" (ID ${org.id}) assigned Free Trial plan`);
      } else {
        issues.push(`CRITICAL: "${org.name}" (ID ${org.id}) has no plan and Free Trial not found`);
      }
      continue;
    }

    if (org.planId && dogCount > 0) {
      const plan = allPlans.find(p => p.id === org.planId);
      if (plan?.dogsLimit) {
        const effectiveLimit = plan.dogsLimit + (org.additionalPetSlots || 0);
        if (dogCount > effectiveLimit) {
          issues.push(`WARNING: "${org.name}" (ID ${org.id}) has ${dogCount} pet(s) but limit is ${effectiveLimit} (${plan.name})`);
        }
      }
    }
  }

  if (fixes.length > 0) {
    console.log(`[startup] Auto-fixed ${fixes.length} org(s):\n${fixes.join("\n")}`);
    const recount = await storage.recalculateAllOrgCredits();
    if (recount.length > 0) {
      console.log(`[startup] Re-recalculated credits after fixes:`, recount);
    }
  }
  if (issues.length > 0) {
    console.log(`[startup] Data integrity issues found:\n${issues.join("\n")}`);
  }
}
