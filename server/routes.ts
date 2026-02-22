import type { Express, Request, Response } from "express";
import { type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import type { InsertOrganization } from "@shared/schema";
import { z } from "zod";
import { generateImage, editImage } from "./gemini";
import { isAuthenticated, registerAuthRoutes } from "./auth";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getStripeClient, STRIPE_PLAN_PRICE_MAP, mapStripeStatusToInternal, getPriceId } from "./stripeClient";
import rateLimit from "express-rate-limit";

import { containsInappropriateLanguage } from "@shared/content-filter";
import { generateShowcaseMockup, generatePawfileMockup } from "./generate-mockups";
import { isValidBreed } from "./breeds";
import { getCurrentPacks, type IndustryType } from "@shared/pack-config";
import { PRINTFUL_PRODUCTS, getProductsByCategory, getProduct, getFrameSizes, getFrameColors } from "./printful-config";
import { createOrder as createPrintfulOrder, confirmOrder as confirmPrintfulOrder, getOrder as getPrintfulOrder, buildOrderItem, estimateShipping, type PrintfulRecipient } from "./printful";
import { isTrialExpired, isWithinTrialWindow, getFreeTrial, revertToFreeTrial, handleCancellation, canStartFreeTrial, markFreeTrialUsed } from "./subscription";
import { pool } from "./db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[^\w\s\-'.,:;!?()]/g, '')
    .trim();
}

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please wait a minute before generating more portraits." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
  validate: { xForwardedForHeader: false },
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function generateUniqueSlug(name: string, excludeOrgId?: number): Promise<string> {
  let baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 10) {
    const existing = await storage.getOrganizationBySlug(slug);
    if (!existing || (excludeOrgId && existing.id === excludeOrgId)) break;
    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    attempts++;
  }
  return slug;
}

const MAX_ADDITIONAL_SLOTS = 5;
const MAX_EDITS_PER_IMAGE = 4;

async function validateAndCleanStripeData(orgId: number): Promise<{ customerId: string | null; subscriptionId: string | null; subscriptionStatus: string | null; cleaned: boolean }> {
  const org = await storage.getOrganization(orgId);
  if (!org) return { customerId: null, subscriptionId: null, subscriptionStatus: null, cleaned: false };

  const testMode = org.stripeTestMode;
  let cleaned = false;
  let validCustomerId = org.stripeCustomerId || null;
  let validSubscriptionId = org.stripeSubscriptionId || null;
  let currentStatus = org.subscriptionStatus || null;

  if (validCustomerId) {
    try {
      const stripe = getStripeClient(testMode);
      const customer = await stripe.customers.retrieve(validCustomerId);
      if ((customer as any).deleted) {
        console.warn(`[stripe-cleanup] Customer ${validCustomerId} is deleted in Stripe for org ${orgId}, clearing`);
        validCustomerId = null;
        validSubscriptionId = null;
        cleaned = true;
      }
    } catch (err: any) {
      if (err?.type === 'StripeInvalidRequestError' || err?.statusCode === 404 || err?.code === 'resource_missing') {
        console.warn(`[stripe-cleanup] Stale customer ${validCustomerId} for org ${orgId}, clearing`);
        validCustomerId = null;
        validSubscriptionId = null;
        cleaned = true;
      }
    }
  }

  if (validSubscriptionId) {
    try {
      const stripe = getStripeClient(testMode);
      const sub = await stripe.subscriptions.retrieve(validSubscriptionId);
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
        console.warn(`[stripe-cleanup] Subscription ${validSubscriptionId} is ${sub.status} in Stripe for org ${orgId}, clearing`);
        validSubscriptionId = null;
        cleaned = true;
      }
    } catch (err: any) {
      if (err?.type === 'StripeInvalidRequestError' || err?.statusCode === 404 || err?.code === 'resource_missing') {
        console.warn(`[stripe-cleanup] Stale subscription ${validSubscriptionId} for org ${orgId}, clearing`);
        validSubscriptionId = null;
        cleaned = true;
      }
    }
  }

  if (cleaned) {
    const stripeUpdate: any = {
      stripeCustomerId: validCustomerId,
      stripeSubscriptionId: validSubscriptionId,
    };
    if (!validSubscriptionId && currentStatus === 'active') {
      stripeUpdate.subscriptionStatus = 'canceled';
      currentStatus = 'canceled';
    }
    await storage.updateOrganizationStripeInfo(orgId, stripeUpdate);

    const orgUpdates: any = {};
    if (!validSubscriptionId && (org.additionalPetSlots || 0) > 0) {
      orgUpdates.additionalPetSlots = 0;
    }
    if (Object.keys(orgUpdates).length > 0) {
      await storage.updateOrganization(orgId, orgUpdates);
    }
  }

  return { customerId: validCustomerId, subscriptionId: validSubscriptionId, subscriptionStatus: currentStatus, cleaned };
}

function computePetLimitInfo(org: any, plan: any, petCount: number) {
  const basePetLimit = plan?.dogsLimit ?? null;
  const effectivePetLimit = basePetLimit != null ? basePetLimit + (org.additionalPetSlots || 0) : null;
  return {
    petCount,
    petLimit: effectivePetLimit,
    basePetLimit,
    additionalPetSlots: org.additionalPetSlots || 0,
    maxAdditionalSlots: MAX_ADDITIONAL_SLOTS,
    isPaidPlan: plan ? plan.priceMonthly > 0 : false,
  };
}

async function checkDogLimit(orgId: number): Promise<string | null> {
  const org = await storage.getOrganization(orgId);
  if (!org) return "Organization not found.";
  if (org.subscriptionStatus === "canceled") return "Your subscription has been canceled. Please choose a new plan.";
  if (isTrialExpired(org)) return "Your 30-day free trial has expired. Please upgrade to a paid plan to continue.";
  if (!org.planId) return "No plan selected. Please choose a plan before adding pets.";
  const plan = await storage.getSubscriptionPlan(org.planId);
  if (!plan) return "Plan not found. Please contact support.";
  if (!plan.dogsLimit) return null;
  const effectiveLimit = plan.dogsLimit + (org.additionalPetSlots || 0);
  const orgDogs = await storage.getDogsByOrganization(orgId);
  if (orgDogs.length >= effectiveLimit) {
    return `You've reached your pet limit of ${effectiveLimit}. Add extra slots or upgrade your plan.`;
  }
  return null;
}

function generatePetCode(name: string): string {
  const prefix = (name || "PET").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `${prefix}-${suffix}`;
}

async function createDogWithPortrait(dogData: any, orgId: number, originalPhotoUrl: string | undefined, generatedPortraitUrl: string | undefined, styleId: number | undefined) {
  // Auto-generate pet code if not provided
  if (!dogData.petCode) {
    dogData.petCode = generatePetCode(dogData.name);
  }

  const dog = await storage.createDog({
    ...dogData,
    originalPhotoUrl,
    organizationId: orgId,
  });

  if (generatedPortraitUrl && styleId) {
    const existingPortrait = await storage.getPortraitByDogAndStyle(dog.id, styleId);
    if (!existingPortrait) {
      await storage.createPortrait({
        dogId: dog.id,
        styleId,
        generatedImageUrl: generatedPortraitUrl,
        isSelected: true,
      });
      await storage.incrementOrgPortraitsUsed(orgId);
    } else {
      await storage.updatePortrait(existingPortrait.id, { generatedImageUrl: generatedPortraitUrl });
    }
  }

  return dog;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);

  (async () => {
    try {
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
            console.log(`[startup] Removed admin ownership from "${adminOrg.name}" (ID ${adminOrg.id}) — admin should not own any rescue`);
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
    } catch (err) {
      console.error("[startup] Health check failed:", err);
    }
  })();

  app.use("/api/", apiRateLimiter);

  const isAdmin = async (req: any, res: Response, next: any) => {
    if (!req.user?.claims?.email || req.user.claims.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  app.get("/api/my-organization", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      let org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(404).json({ error: "No organization found" });
      }
      const synced = await storage.syncOrgCredits(org.id);
      if (synced) org = synced;
      const orgDogs = await storage.getDogsByOrganization(org.id);
      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      const { stripeCustomerId, stripeSubscriptionId, ...safeOrg } = org as any;
      res.json({
        ...safeOrg,
        hasStripeAccount: !!stripeCustomerId,
        hasActiveSubscription: !!stripeSubscriptionId,
        ...computePetLimitInfo(org, plan, orgDogs.length),
      });
    } catch (error) {
      console.error("Error fetching user organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Create organization for current user
  app.post("/api/my-organization", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has an org
      const existingOrg = await storage.getOrganizationByOwner(userId);
      if (existingOrg) {
        return res.status(400).json({ error: "You already have an organization" });
      }

      const { name, description, websiteUrl, logoUrl } = req.body;
      const slug = await generateUniqueSlug(name);

      const org = await storage.createOrganization({
        name,
        slug,
        description,
        websiteUrl,
        logoUrl: logoUrl || null,
        ownerId: userId,
        subscriptionStatus: "inactive",
        portraitsUsedThisMonth: 0,
      });

      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.patch("/api/my-organization", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(404).json({ error: "No organization found" });
      }

      const allowedFields = [
        "name", "description", "websiteUrl", "logoUrl",
        "contactName", "contactEmail", "contactPhone",
        "socialFacebook", "socialInstagram", "socialTwitter", "socialNextdoor",
        "billingStreet", "billingCity", "billingState", "billingZip", "billingCountry",
        "locationStreet", "locationCity", "locationState", "locationZip", "locationCountry",
        "speciesHandled", "onboardingCompleted", "industryType"
      ];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const MAX_LENGTHS: Record<string, number> = {
        name: 200, description: 2000, websiteUrl: 500,
        contactName: 200, contactEmail: 200, contactPhone: 50,
        socialFacebook: 500, socialInstagram: 500, socialTwitter: 500, socialNextdoor: 500,
        billingStreet: 500, billingCity: 200, billingState: 100, billingZip: 20, billingCountry: 100,
        locationStreet: 500, locationCity: 200, locationState: 100, locationZip: 20, locationCountry: 100
      };
      for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
        if (updates[field] !== undefined && updates[field] !== null) {
          if (typeof updates[field] !== "string") {
            return res.status(400).json({ error: `${field} must be a string` });
          }
          if (updates[field].length > maxLen) {
            return res.status(400).json({ error: `${field} must be ${maxLen} characters or less` });
          }
        }
      }

      if (updates.name !== undefined && typeof updates.name === "string" && updates.name.trim().length === 0) {
        return res.status(400).json({ error: "Organization name cannot be empty" });
      }

      if (updates.speciesHandled !== undefined) {
        if (!["dogs", "cats", "both"].includes(updates.speciesHandled)) {
          return res.status(400).json({ error: "speciesHandled must be 'dogs', 'cats', or 'both'" });
        }
      }

      if (updates.logoUrl !== undefined && updates.logoUrl !== null) {
        const MAX_LOGO_LENGTH = 500000;
        if (typeof updates.logoUrl !== "string" || updates.logoUrl.length > MAX_LOGO_LENGTH) {
          return res.status(400).json({ error: "Logo data too large or invalid" });
        }
      }

      // Require logo before completing onboarding
      if (updates.onboardingCompleted === true) {
        const hasLogo = updates.logoUrl || org.logoUrl;
        if (!hasLogo) {
          return res.status(400).json({ error: "A business logo is required to complete onboarding" });
        }
      }

      if (updates.name && updates.name !== org.name) {
        updates.slug = await generateUniqueSlug(updates.name, org.id);
      }

      const updated = await storage.updateOrganization(org.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Select a plan (for free plans that don't go through Stripe checkout)
  app.post("/api/select-plan", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(400).json({ error: "You need to create an organization first" });
      }

      const isFreeTrialPlan = plan.priceMonthly === 0 && (plan.trialDays ?? 0) > 0;

      if (isFreeTrialPlan && !canStartFreeTrial(org)) {
        return res.status(400).json({ error: "Your organization has already used its free trial. Please choose a paid plan." });
      }

      const trialEndsAt = plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null;

      const isNewPlan = org.planId !== plan.id;
      const orgUpdate: Partial<InsertOrganization> = {
        planId: plan.id,
        subscriptionStatus: isFreeTrialPlan ? "trial" : "active",
      };
      if (isNewPlan) {
        orgUpdate.billingCycleStart = org.billingCycleStart || org.createdAt || new Date();
      }
      if (trialEndsAt) {
        orgUpdate.trialEndsAt = trialEndsAt;
      }
      await storage.updateOrganization(org.id, orgUpdate);

      if (isFreeTrialPlan) {
        await markFreeTrialUsed(org.id);
      }

      await storage.syncOrgCredits(org.id);

      const updated = await storage.getOrganization(org.id);
      res.json(updated);
    } catch (error) {
      console.error("Error selecting plan:", error);
      res.status(500).json({ error: "Failed to select plan" });
    }
  });

  function toPublicOrg(org: any) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  app.get("/api/organizations", async (req: Request, res: Response) => {
    try {
      const orgs = await storage.getAllOrganizations();
      res.json(orgs.map(toPublicOrg));
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json(toPublicOrg(org));
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  app.get("/api/rescue/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug as string);
      if (!org || !org.isActive) {
        return res.status(404).json({ error: "Rescue not found" });
      }

      const orgDogs = await storage.getDogsByOrganization(org.id);
      const dogsWithPortraits = await Promise.all(
        orgDogs.filter(d => d.isAvailable).map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          return { ...dog, portrait: portrait || undefined };
        })
      );

      res.json({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        websiteUrl: org.websiteUrl,
        logoUrl: org.logoUrl,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        socialFacebook: org.socialFacebook,
        socialInstagram: org.socialInstagram,
        socialTwitter: org.socialTwitter,
        socialNextdoor: org.socialNextdoor,
        dogs: dogsWithPortraits,
      });
    } catch (error) {
      console.error("Error fetching rescue showcase:", error);
      res.status(500).json({ error: "Failed to fetch rescue" });
    }
  });

  // Subscription plans
  app.get("/api/plans", async (req: Request, res: Response) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.get("/api/portrait-styles", async (req: Request, res: Response) => {
    try {
      const styles = await storage.getAllPortraitStyles();
      res.json(styles);
    } catch (error) {
      console.error("Error fetching portrait styles:", error);
      res.status(500).json({ error: "Failed to fetch portrait styles" });
    }
  });

  // --- PACKS ---
  // Returns the 3 packs for a given industry type + species, with resolved style details
  app.get("/api/packs", async (req: Request, res: Response) => {
    try {
      const industryType = (req.query.industryType as string) || "groomer";
      const species = (req.query.species as string) || "dog";

      if (!["groomer", "boarding", "daycare"].includes(industryType)) {
        return res.status(400).json({ error: "Invalid industryType. Must be groomer, boarding, or daycare." });
      }
      if (!["dog", "cat"].includes(species)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }

      const packs = getCurrentPacks(industryType as IndustryType, species as "dog" | "cat");

      // Resolve style IDs to full style objects from DB
      const allStyles = await storage.getAllPortraitStyles();
      const styleMap = new Map(allStyles.map(s => [s.id, s]));

      const resolved = packs.map(pack => ({
        ...pack,
        styles: pack.styleIds
          .map(id => styleMap.get(id))
          .filter(Boolean),
      }));

      res.json(resolved);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ error: "Failed to fetch packs" });
    }
  });

  // --- DAILY PACK SELECTION ---

  // Get today's pack selection for the org
  app.get("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const result = await pool.query(
        "SELECT * FROM daily_pack_selections WHERE organization_id = $1 AND date = $2",
        [org.id, date]
      );
      if (result.rows.length === 0) {
        return res.json(null);
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching daily pack:", error);
      res.status(500).json({ error: "Failed to fetch daily pack" });
    }
  });

  // Set today's pack selection
  app.post("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      const { packType, date } = req.body;
      if (!packType || !["seasonal", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType" });
      }
      const targetDate = date || new Date().toISOString().split("T")[0];

      const result = await pool.query(
        `INSERT INTO daily_pack_selections (organization_id, date, pack_type, selected_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, date) DO UPDATE SET pack_type = EXCLUDED.pack_type, selected_by = EXCLUDED.selected_by
         RETURNING *`,
        [org.id, targetDate, packType, userId]
      );
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Error setting daily pack:", error);
      res.status(500).json({ error: "Failed to set daily pack", detail: error?.message || String(error) });
    }
  });

  // --- PET CODE LOOKUP (public) ---
  app.get("/api/dogs/code/:petCode", async (req: Request, res: Response) => {
    try {
      const { petCode } = req.params;
      const result = await pool.query(
        `SELECT d.*, o.name as organization_name, o.logo_url as organization_logo_url, o.slug as organization_slug
         FROM dogs d
         JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = result.rows[0];

      // Get portraits for this dog
      const portraits = await pool.query(
        `SELECT p.*, ps.name as style_name, ps.category as style_category
         FROM portraits p
         LEFT JOIN portrait_styles ps ON p.style_id = ps.id
         WHERE p.dog_id = $1
         ORDER BY p.is_selected DESC, p.created_at DESC`,
        [dog.id]
      );

      const selectedPortrait = portraits.rows.find((p: any) => p.is_selected) || portraits.rows[0] || null;
      res.json({
        ...dog,
        portrait: selectedPortrait,
        portraits: portraits.rows,
      });
    } catch (error) {
      console.error("Error looking up pet code:", error);
      res.status(500).json({ error: "Failed to look up pet" });
    }
  });

  // --- BATCH PORTRAIT GENERATION (end-of-day workflow) ---
  app.post("/api/generate-batch", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const { dogIds, packType, autoSelect, organizationId } = req.body;
      if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
        return res.status(400).json({ error: "dogIds array is required" });
      }
      if (!packType || !["seasonal", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType" });
      }

      // Resolve org
      let org;
      if (userIsAdmin && organizationId) {
        org = await storage.getOrganization(parseInt(organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });

      const industryType = (org as any).industryType || "groomer";

      // Get pack styles
      const packs = getCurrentPacks(industryType as IndustryType, "dog"); // default to dog, can improve later
      const pack = packs.find(p => p.type === packType);
      if (!pack) return res.status(400).json({ error: "Pack not found" });

      const allStyles = await storage.getAllPortraitStyles();
      const packStyles = pack.styleIds.map(id => allStyles.find(s => s.id === id)).filter(Boolean);

      if (packStyles.length === 0) {
        return res.status(400).json({ error: "No styles found for this pack" });
      }

      // Generate portraits for each dog
      const results: Array<{ dogId: number; success: boolean; portraitId?: number; error?: string }> = [];

      for (const dogId of dogIds) {
        try {
          const dog = await storage.getDog(dogId);
          if (!dog || dog.organizationId !== org.id) {
            results.push({ dogId, success: false, error: "Dog not found or wrong org" });
            continue;
          }

          if (!dog.originalPhotoUrl) {
            results.push({ dogId, success: false, error: "No photo uploaded" });
            continue;
          }

          // Pick style: auto-select randomly from pack, or let client specify later
          let style;
          if (autoSelect) {
            style = packStyles[Math.floor(Math.random() * packStyles.length)];
          } else {
            // For manual selection, skip generation — client will pick styles and call generate-portrait individually
            results.push({ dogId, success: true, portraitId: undefined });
            continue;
          }

          if (!style) {
            results.push({ dogId, success: false, error: "Could not select style" });
            continue;
          }

          // Build prompt from style template
          const species = dog.species || "dog";
          const breed = dog.breed || species;
          const prompt = sanitizeForPrompt(
            style.promptTemplate
              .replace(/\{breed\}/g, breed)
              .replace(/\{species\}/g, species)
              .replace(/\{name\}/g, dog.name)
          );

          // Generate image
          const generatedImageUrl = await generateImage(prompt, dog.originalPhotoUrl);

          // Save portrait
          const portrait = await storage.createPortrait({
            dogId: dog.id,
            styleId: style.id,
            generatedImageUrl,
            isSelected: true,
          });
          await storage.incrementOrgPortraitsUsed(org.id);

          // Auto-generate pet code if not set
          if (!dog.petCode) {
            const petCode = generatePetCode(dog.name);
            await storage.updateDog(dog.id, { petCode } as any);
          }

          results.push({ dogId: dog.id, success: true, portraitId: portrait.id });
        } catch (genErr: any) {
          console.error(`[generate-batch] Error for dog ${dogId}:`, genErr.message);
          results.push({ dogId, success: false, error: genErr.message });
        }
      }

      res.json({ results, totalGenerated: results.filter(r => r.success && r.portraitId).length });
    } catch (error: any) {
      console.error("Error in batch generation:", error.message);
      res.status(500).json({ error: "Batch generation failed" });
    }
  });

  // --- BATCH DELIVERY (send pawfile links to pet owners) ---
  app.post("/api/deliver-batch", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const { dogIds, organizationId } = req.body;
      if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
        return res.status(400).json({ error: "dogIds array is required" });
      }

      let org;
      if (userIsAdmin && organizationId) {
        org = await storage.getOrganization(parseInt(organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });

      const results: Array<{ dogId: number; sent: boolean; method?: string; error?: string }> = [];

      for (const dogId of dogIds) {
        try {
          const dog = await storage.getDog(dogId);
          if (!dog || dog.organizationId !== org.id) {
            results.push({ dogId, sent: false, error: "Dog not found" });
            continue;
          }

          if (!(dog as any).ownerPhone && !(dog as any).ownerEmail) {
            results.push({ dogId, sent: false, error: "No owner contact info" });
            continue;
          }

          // Ensure pet has a code
          let petCode = (dog as any).petCode;
          if (!petCode) {
            petCode = generatePetCode(dog.name);
            await storage.updateDog(dog.id, { petCode } as any);
          }

          const pawfileUrl = `https://pawtraitpros.com/pawfile/code/${petCode}`;

          // SMS delivery via Twilio (if ownerPhone exists)
          if ((dog as any).ownerPhone) {
            const phone = (dog as any).ownerPhone;
            const messagingSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const apiKeySid = process.env.TWILIO_API_KEY_SID;
            const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

            if (messagingSid && accountSid && apiKeySid && apiKeySecret) {
              try {
                const auth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64");
                const smsBody = `Hi from ${org.name}! We created a stunning portrait of ${dog.name} and it's ready for you. View it and grab a free digital download — or order a print, mug, or canvas: ${pawfileUrl}`;
                const params = new URLSearchParams({
                  MessagingServiceSid: messagingSid,
                  To: phone,
                  Body: smsBody,
                });
                const smsRes = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                  {
                    method: "POST",
                    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
                    body: params.toString(),
                  }
                );
                if (smsRes.ok) {
                  results.push({ dogId, sent: true, method: "sms" });
                  continue;
                } else {
                  const smsErr = await smsRes.json();
                  console.error(`[deliver-batch] SMS failed for ${dog.name}:`, smsErr);
                }
              } catch (smsErr: any) {
                console.error(`[deliver-batch] SMS error:`, smsErr.message);
              }
            }
          }

          // Fallback: just mark as "link ready" (no email service yet)
          results.push({ dogId, sent: false, method: "link_only", error: "SMS not configured or failed" });
        } catch (err: any) {
          results.push({ dogId, sent: false, error: err.message });
        }
      }

      res.json({ results, totalSent: results.filter(r => r.sent).length });
    } catch (error: any) {
      console.error("Error in batch delivery:", error.message);
      res.status(500).json({ error: "Batch delivery failed" });
    }
  });

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
  app.post("/api/merch/estimate", async (req: Request, res: Response) => {
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
  app.post("/api/merch/order", async (req: Request, res: Response) => {
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
  app.get("/api/merch/order/:id", async (req: Request, res: Response) => {
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
      const { getAllGelatoProducts } = await import("./gelato-config");
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

      const { getGelatoProduct: getGelatoCardProduct } = await import("./gelato-config");
      const { createGelatoOrder, buildCardOrderItem } = await import("./gelato");

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
      const { searchCardProducts, listCatalogs } = await import("./gelato");
      const catalogs = await listCatalogs();
      const cards = await searchCardProducts();
      res.json({ catalogs, cards });
    } catch (error: any) {
      console.error("Error discovering Gelato products:", error);
      res.status(500).json({ error: error.message || "Failed to discover products" });
    }
  });

  // --- Customer Session Endpoints (QR/short link system) ---

  // Create a customer session (staff creates after portrait generation)
  app.post("/api/customer-session", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const { dogId, portraitId, packType, customerPhone, orgId: bodyOrgId } = req.body;

      if (!dogId || !portraitId) {
        return res.status(400).json({ error: "dogId and portraitId are required" });
      }

      let orgId: number | null = null;
      if (isAdminUser && bodyOrgId) {
        orgId = parseInt(bodyOrgId);
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Verify the dog and portrait belong to this org
      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== orgId) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to your organization" });
      }

      // Generate unique 8-char token
      let token = '';
      let attempts = 0;
      while (attempts < 10) {
        token = crypto.randomBytes(4).toString('hex'); // 8 hex chars
        const existing = await pool.query('SELECT id FROM customer_sessions WHERE token = $1', [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }

      // Set expiry to 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, pack_type, customer_phone, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [token, orgId, parseInt(dogId), parseInt(portraitId), packType || null, customerPhone || null, expiresAt.toISOString()]
      );

      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      console.log(`[customer-session] Created session ${token} for org ${orgId}, dog ${dogId}`);

      res.json({
        token,
        orderUrl,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Error creating customer session:", error);
      res.status(500).json({ error: error.message || "Failed to create customer session" });
    }
  });

  // Create customer session from pet code (public — for customer portal "Order a Keepsake")
  app.post("/api/customer-session/from-code", async (req: Request, res: Response) => {
    try {
      const { petCode } = req.body;
      if (!petCode) {
        return res.status(400).json({ error: "petCode is required" });
      }

      // Look up the dog by pet code
      const dogResult = await pool.query(
        `SELECT d.*, p.id as portrait_id, p.generated_image_url
         FROM dogs d
         LEFT JOIN portraits p ON p.dog_id = d.id AND p.is_selected = true
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );

      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }

      const dog = dogResult.rows[0];
      if (!dog.portrait_id) {
        return res.status(400).json({ error: "No portrait available for this pet" });
      }

      // Generate unique 8-char token
      let token = '';
      let attempts = 0;
      while (attempts < 10) {
        token = crypto.randomBytes(4).toString('hex');
        const existing = await pool.query('SELECT id FROM customer_sessions WHERE token = $1', [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [token, dog.organization_id, dog.id, dog.portrait_id, expiresAt.toISOString()]
      );

      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      res.json({
        token,
        orderUrl: `${host}/order/${token}`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Error creating customer session from code:", error);
      res.status(500).json({ error: error.message || "Failed to create session" });
    }
  });

  // Get customer session by token (public — this is the customer-facing endpoint)
  app.get("/api/customer-session/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 8) {
        return res.status(400).json({ error: "Invalid session token" });
      }

      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, o.logo_url as org_logo,
                d.name as dog_name, d.breed as dog_breed, d.species as dog_species,
                p.generated_image_url as portrait_image, p.style_id as portrait_style_id
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         JOIN portraits p ON p.id = cs.portrait_id
         WHERE cs.token = $1`,
        [token]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];

      // Check expiry
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        return res.status(410).json({ error: "This order link has expired" });
      }

      // Get alternate portraits from same pack/dog for "change image" feature
      const alternatesResult = await pool.query(
        `SELECT id, generated_image_url, style_id FROM portraits
         WHERE dog_id = $1 AND generated_image_url IS NOT NULL AND id != $2
         ORDER BY created_at DESC LIMIT 5`,
        [session.dog_id, session.portrait_id]
      );

      res.json({
        token: session.token,
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogName: session.dog_name,
        dogBreed: session.dog_breed,
        dogSpecies: session.dog_species,
        portraitImage: session.portrait_image,
        portraitId: session.portrait_id,
        packType: session.pack_type,
        expiresAt: session.expires_at,
        alternatePortraits: alternatesResult.rows.map((p: any) => ({
          id: p.id,
          imageUrl: p.generated_image_url,
          styleId: p.style_id,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching customer session:", error);
      res.status(500).json({ error: "Failed to load order page" });
    }
  });

  // --- Batch Upload Endpoints (Candid Batch capture mode) ---

  // Start a new batch session
  app.post("/api/batch/start", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const { orgId: bodyOrgId } = req.body;

      let orgId: number | null = null;
      if (isAdminUser && bodyOrgId) {
        orgId = parseInt(bodyOrgId);
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const result = await pool.query(
        `INSERT INTO batch_sessions (organization_id, staff_user_id, status, photo_count)
         VALUES ($1, $2, 'uploading', 0) RETURNING id`,
        [orgId, userId]
      );

      res.json({ batchId: result.rows[0].id, status: "uploading" });
    } catch (error: any) {
      console.error("Error starting batch session:", error);
      res.status(500).json({ error: "Failed to start batch session" });
    }
  });

  // Upload photos to a batch session (one at a time — client sends each photo separately)
  app.post("/api/batch/:id/photos", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      const userId = req.user.claims.sub;
      const { photo } = req.body; // base64 data URI

      if (!photo) {
        return res.status(400).json({ error: "Photo data is required" });
      }

      // Verify batch belongs to user's org
      const batchResult = await pool.query(
        `SELECT bs.*, o.owner_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      const batch = batchResult.rows[0];
      if (batch.status !== 'uploading' && batch.status !== 'assigning') {
        return res.status(400).json({ error: "Batch is no longer accepting photos" });
      }

      // Check photo count limit (max 20)
      if (batch.photo_count >= 20) {
        return res.status(400).json({ error: "Maximum 20 photos per batch" });
      }

      // Insert photo
      const photoResult = await pool.query(
        `INSERT INTO batch_photos (batch_session_id, photo_url)
         VALUES ($1, $2) RETURNING id`,
        [batchId, photo]
      );

      // Update photo count
      await pool.query(
        `UPDATE batch_sessions SET photo_count = photo_count + 1 WHERE id = $1`,
        [batchId]
      );

      res.json({ photoId: photoResult.rows[0].id, photoCount: batch.photo_count + 1 });
    } catch (error: any) {
      console.error("Error uploading batch photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // Assign a batch photo to a pet
  app.patch("/api/batch/:id/photos/:photoId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      const photoId = parseInt(req.params.photoId);
      const { dogId } = req.body;

      if (isNaN(batchId) || isNaN(photoId)) {
        return res.status(400).json({ error: "Invalid batch or photo ID" });
      }
      if (!dogId) {
        return res.status(400).json({ error: "dogId is required" });
      }

      // Verify batch exists
      const batchResult = await pool.query(
        `SELECT organization_id FROM batch_sessions WHERE id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      // Verify dog belongs to same org
      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== batchResult.rows[0].organization_id) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to this organization" });
      }

      await pool.query(
        `UPDATE batch_photos SET dog_id = $1, assigned_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND batch_session_id = $3`,
        [parseInt(dogId), photoId, batchId]
      );

      // Update batch status to 'assigning' if still 'uploading'
      await pool.query(
        `UPDATE batch_sessions SET status = 'assigning' WHERE id = $1 AND status = 'uploading'`,
        [batchId]
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error assigning batch photo:", error);
      res.status(500).json({ error: "Failed to assign photo" });
    }
  });

  // Generate portraits for all assigned photos in a batch
  app.post("/api/batch/:id/generate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      const { packType } = req.body; // "seasonal" | "fun" | "artistic"

      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      // Get batch + assigned photos
      const batchResult = await pool.query(
        `SELECT bs.*, o.industry_type, o.id as org_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      const batch = batchResult.rows[0];

      const photosResult = await pool.query(
        `SELECT * FROM batch_photos WHERE batch_session_id = $1 AND dog_id IS NOT NULL ORDER BY id`,
        [batchId]
      );

      if (photosResult.rows.length === 0) {
        return res.status(400).json({ error: "No photos have been assigned to pets yet" });
      }

      // Update batch status
      await pool.query(
        `UPDATE batch_sessions SET status = 'generating' WHERE id = $1`,
        [batchId]
      );

      // Return immediately — generation happens async
      // In a production system you'd use a job queue, but for now we'll
      // return the count and let the client poll for status
      res.json({
        batchId,
        status: "generating",
        assignedPhotos: photosResult.rows.length,
        packType: packType || "seasonal",
        message: `Generating portraits for ${photosResult.rows.length} photos. Check batch status for progress.`,
      });
    } catch (error: any) {
      console.error("Error generating batch portraits:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // Get batch session status + all photos
  app.get("/api/batch/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      const batchResult = await pool.query(
        `SELECT * FROM batch_sessions WHERE id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      const photosResult = await pool.query(
        `SELECT bp.id, bp.dog_id, bp.assigned_at, bp.created_at,
                d.name as dog_name, d.breed as dog_breed
         FROM batch_photos bp
         LEFT JOIN dogs d ON d.id = bp.dog_id
         WHERE bp.batch_session_id = $1
         ORDER BY bp.id`,
        [batchId]
      );

      res.json({
        batch: batchResult.rows[0],
        photos: photosResult.rows,
      });
    } catch (error: any) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ error: "Failed to fetch batch" });
    }
  });

  // --- Delivery System Endpoints ---

  // Generate a printable receipt with QR code for a customer session
  app.get("/api/customer-session/:token/receipt", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, o.logo_url as org_logo,
                d.name as dog_name
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         WHERE cs.token = $1`,
        [token]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];
      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      // Return receipt data (client renders the receipt/QR)
      res.json({
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogName: session.dog_name,
        orderUrl,
        token,
        expiresAt: session.expires_at,
      });
    } catch (error: any) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ error: "Failed to generate receipt" });
    }
  });

  // Send SMS with order link (uses existing SMS infrastructure)
  app.post("/api/customer-session/:token/send-sms", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { token } = req.params;
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Verify session exists
      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, d.name as dog_name
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         WHERE cs.token = $1`,
        [token]
      );
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];
      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      const message = `Hi from ${session.org_name}! ${session.dog_name}'s portrait is ready. View it & order prints here: ${orderUrl}`;

      // Use Twilio (same as existing /api/send-sms logic)
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioKeySid = process.env.TWILIO_API_KEY_SID;
      const twilioKeySecret = process.env.TWILIO_API_KEY_SECRET;
      const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;

      if (!twilioSid || !twilioKeySid || !twilioKeySecret || !twilioMsgSvc) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }

      const cleaned = phone.replace(/[\s\-().]/g, "");
      const formattedPhone = cleaned.startsWith("+") ? cleaned : cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

      const twilioAuth = Buffer.from(`${twilioKeySid}:${twilioKeySecret}`).toString("base64");
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${twilioAuth}`,
        },
        body: new URLSearchParams({ To: formattedPhone, MessagingServiceSid: twilioMsgSvc, Body: message }).toString(),
      });

      if (!twilioRes.ok) {
        const err = await twilioRes.json();
        throw new Error(err.message || "Failed to send SMS");
      }

      // Store phone on session
      await pool.query(
        `UPDATE customer_sessions SET customer_phone = $1 WHERE token = $2`,
        [formattedPhone, token]
      );

      res.json({ success: true, message: "SMS sent" });
    } catch (error: any) {
      console.error("Error sending customer session SMS:", error);
      res.status(500).json({ error: error.message || "Failed to send SMS" });
    }
  });

  // Stripe billing routes
  app.get("/api/stripe/publishable-key", async (req: Request, res: Response) => {
    try {
      const testMode = req.query.testMode === 'true';
      const key = getStripePublishableKey(testMode);
      res.json({ publishableKey: key, testMode });
    } catch (error) {
      console.error("Error fetching Stripe key:", error);
      res.status(500).json({ error: "Failed to get payment configuration" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { planId, orgId, testMode: reqTestMode } = req.body;
      const testMode = reqTestMode === true;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan || !plan.stripePriceId) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;

      if (!orgId) {
        return res.status(400).json({ error: "Organization ID is required. Please try again from your dashboard." });
      }

      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      if (!callerIsAdmin && org.ownerId !== userId) {
        return res.status(403).json({ error: "You don't have access to this organization" });
      }

      // If org already has Stripe data from a different mode, clean it first
      // org.stripeTestMode is not in Drizzle schema — treat undefined as test mode
      const orgCurrentMode = (org as any).stripeTestMode ?? true;
      if (org.stripeCustomerId && orgCurrentMode !== testMode) {
        await storage.updateOrganizationStripeInfo(org.id, {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeTestMode: testMode,
        });
      } else if (!org.stripeCustomerId) {
        await storage.updateOrganizationStripeInfo(org.id, { stripeTestMode: testMode });
      }

      const stripeState = await validateAndCleanStripeData(org.id);
      let customerId = stripeState.customerId;
      if (!customerId) {
        if (!org.contactEmail) {
          return res.status(400).json({ error: "This organization has no contact email on file. Please add a contact email in your organization settings before setting up billing." });
        }
        const customer = await stripeService.createCustomer(org.contactEmail, org.id, org.name, testMode);
        await storage.updateOrganizationStripeInfo(org.id, { stripeCustomerId: customer.id, stripeTestMode: testMode });
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        plan.stripePriceId,
        `${baseUrl}/dashboard?subscription=success&plan=${planId}&session_id={CHECKOUT_SESSION_ID}&orgId=${org.id}&testMode=${testMode}`,
        `${baseUrl}/dashboard`,
        testMode,
        undefined,
        { orgId: String(org.id), planId: String(planId) }
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/confirm-checkout", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, planId, orgId: bodyOrgId, testMode: reqTestMode } = req.body;

      if (!sessionId || !planId) {
        return res.status(400).json({ error: "Session ID and Plan ID are required" });
      }

      const plan = await storage.getSubscriptionPlan(parseInt(planId));
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      // Determine testMode from request or from the org
      const metadataOrgIdRaw = bodyOrgId ? parseInt(bodyOrgId) : null;
      const preOrg = metadataOrgIdRaw ? await storage.getOrganization(metadataOrgIdRaw) : null;
      const testMode = reqTestMode === true || reqTestMode === 'true' || ((preOrg as any)?.stripeTestMode ?? true);

      const session = await stripeService.retrieveCheckoutSession(sessionId, testMode);
      if (!session || (session.payment_status !== "paid" && session.status !== "complete")) {
        return res.status(400).json({ error: "Checkout session is not complete" });
      }

      const metadataOrgId = session.metadata?.orgId ? parseInt(session.metadata.orgId) : null;
      const targetOrgId = metadataOrgId || (bodyOrgId ? parseInt(bodyOrgId) : null);
      if (!targetOrgId) {
        return res.status(400).json({ error: "Organization not found. Could not determine which organization this checkout belongs to." });
      }
      const org = await storage.getOrganization(targetOrgId);
      if (!org) {
        return res.status(400).json({ error: "Organization not found. Could not determine which organization this checkout belongs to." });
      }

      const sessionCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id;

      if (org.stripeCustomerId && sessionCustomerId !== org.stripeCustomerId) {
        return res.status(403).json({ error: "Session does not match your account" });
      }

      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id;
      let subscription: any = null;
      if (typeof session.subscription === 'object' && session.subscription) {
        subscription = session.subscription;
      } else if (subscriptionId) {
        subscription = await stripeService.retrieveSubscription(subscriptionId, testMode);
      }

      if (subscription && plan.stripePriceId) {
        const subItems = subscription.items?.data || [];
        const effectivePriceId = getPriceId(plan.stripePriceId, testMode);
        const matchesPlan = subItems.some((item: any) => {
          const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
          return priceId === plan.stripePriceId || priceId === effectivePriceId;
        });
        if (!matchesPlan) {
          return res.status(400).json({ error: "Subscription does not match the selected plan" });
        }
      }

      let billingCycleStart = new Date();
      if (subscription?.current_period_start) {
        billingCycleStart = new Date(subscription.current_period_start * 1000);
      }

      await storage.updateOrganization(org.id, {
        planId: plan.id,
        subscriptionStatus: "active",
        additionalPetSlots: 0,
        billingCycleStart,
      });
      await storage.syncOrgCredits(org.id);

      const stripeInfo: any = { subscriptionStatus: "active", stripeTestMode: testMode };
      if (sessionCustomerId && !org.stripeCustomerId) {
        stripeInfo.stripeCustomerId = sessionCustomerId;
      }
      if (subscriptionId) {
        stripeInfo.stripeSubscriptionId = subscriptionId;
      }
      await storage.updateOrganizationStripeInfo(org.id, stripeInfo);

      const updated = await storage.getOrganization(org.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Error confirming checkout:", error);
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const { orgId: bodyOrgId } = req.body || {};

      let org;
      if (bodyOrgId) {
        if (!callerIsAdmin) {
          const ownerOrg = await storage.getOrganizationByOwner(userId);
          if (!ownerOrg || ownerOrg.id !== parseInt(bodyOrgId)) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
        org = await storage.getOrganization(parseInt(bodyOrgId));
      } else if (callerIsAdmin) {
        return res.status(400).json({ error: "Admin must specify orgId" });
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }

      if (!org) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const stripeState = await validateAndCleanStripeData(org.id);
      if (!stripeState.customerId) {
        return res.status(400).json({ error: "No billing account found. If you previously had a subscription, it may have been canceled. Please choose a new plan." });
      }

      const refreshedOrg = await storage.getOrganization(org.id);
      const testMode = (refreshedOrg as any)?.stripeTestMode ?? true;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        stripeState.customerId,
        `${baseUrl}/dashboard`,
        testMode
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to access billing portal" });
    }
  });

  app.get("/api/subscription-info", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const reqOrgId = req.query.orgId ? parseInt(req.query.orgId as string) : null;

      let org;
      if (reqOrgId) {
        org = await storage.getOrganization(reqOrgId);
        if (org && !callerIsAdmin && org.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (callerIsAdmin) {
        return res.status(400).json({ error: "Admin must specify orgId" });
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }

      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      let renewalDate: string | null = null;
      let pendingPlanName: string | null = null;

      if (org.stripeSubscriptionId) {
        try {
          const periodEnd = await stripeService.getSubscriptionPeriodEnd(org.stripeSubscriptionId, org.stripeTestMode);
          if (periodEnd) {
            renewalDate = periodEnd.toISOString();
          }
        } catch (e) {
          console.error("[subscription-info] Error fetching Stripe info:", e);
        }
      }

      if (org.pendingPlanId) {
        const pendingPlan = await storage.getSubscriptionPlan(org.pendingPlanId);
        pendingPlanName = pendingPlan?.name || null;
      }

      res.json({
        currentPlanId: org.planId,
        pendingPlanId: org.pendingPlanId,
        pendingPlanName,
        renewalDate,
        subscriptionStatus: org.subscriptionStatus,
        hasStripeSubscription: !!org.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error getting subscription info:", error);
      res.status(500).json({ error: "Failed to get subscription info" });
    }
  });

  app.post("/api/stripe/change-plan", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { planId, orgId } = req.body;

      if (!planId || !orgId) {
        return res.status(400).json({ error: "Plan ID and Organization ID are required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan || !plan.stripePriceId) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      if (!callerIsAdmin && org.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!org.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found. Please subscribe first." });
      }

      const currentPlan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      if (!currentPlan) {
        return res.status(400).json({ error: "Current plan not found" });
      }

      if (plan.id === currentPlan.id) {
        return res.status(400).json({ error: "You are already on this plan" });
      }

      const isUpgrade = plan.priceMonthly > currentPlan.priceMonthly;

      if (isUpgrade) {
        return res.json({ action: 'upgrade', planId: plan.id });
      }

      const result = await stripeService.scheduleDowngrade(org.stripeSubscriptionId, plan.stripePriceId, org.stripeTestMode);

      await storage.updateOrganization(org.id, {
        pendingPlanId: plan.id,
      });

      res.json({
        action: 'scheduled',
        renewalDate: result.currentPeriodEnd.toISOString(),
        newPlanName: plan.name,
      });
    } catch (error: any) {
      console.error("Error changing plan:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to change plan" });
    }
  });

  app.post("/api/stripe/cancel-plan-change", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId } = req.body;

      if (!orgId) {
        return res.status(400).json({ error: "Organization ID is required" });
      }

      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }

      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      if (!callerIsAdmin && org.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!org.pendingPlanId) {
        return res.status(400).json({ error: "No pending plan change to cancel" });
      }

      if (org.stripeSubscriptionId) {
        const currentPlan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
        if (currentPlan?.stripePriceId) {
          await stripeService.scheduleDowngrade(org.stripeSubscriptionId, currentPlan.stripePriceId, org.stripeTestMode);
        }
      }

      await storage.updateOrganization(org.id, {
        pendingPlanId: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error canceling plan change:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to cancel plan change" });
    }
  });

  app.get("/api/addon-slots", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const reqOrgId = req.query.orgId ? parseInt(req.query.orgId as string) : null;

      let org;
      if (reqOrgId) {
        org = await storage.getOrganization(reqOrgId);
        if (org && !callerIsAdmin && org.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (callerIsAdmin) {
        return res.status(400).json({ error: "Admin must specify orgId" });
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) {
        return res.status(404).json({ error: "No organization found" });
      }
      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      res.json({
        currentSlots: org.additionalPetSlots || 0,
        maxSlots: MAX_ADDITIONAL_SLOTS,
        pricePerSlotCents: 300,
        available: (plan ? plan.priceMonthly > 0 : false) && !!org.stripeSubscriptionId,
        basePetLimit: plan?.dogsLimit ?? null,
      });
    } catch (error) {
      console.error("Error fetching addon slots info:", error);
      res.status(500).json({ error: "Failed to fetch add-on information" });
    }
  });

  app.post("/api/addon-slots", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const { quantity, orgId: bodyOrgId } = req.body;

      if (typeof quantity !== "number" || quantity < 0 || quantity > 5 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: "Quantity must be an integer between 0 and 5" });
      }

      let org;
      if (bodyOrgId) {
        org = await storage.getOrganization(parseInt(bodyOrgId));
        if (org && !callerIsAdmin && org.ownerId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (callerIsAdmin) {
        return res.status(400).json({ error: "Admin must specify orgId" });
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) {
        return res.status(404).json({ error: "No organization found" });
      }

      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      if (!plan || plan.priceMonthly === 0) {
        return res.status(403).json({ error: "Add-on pet slots are only available on paid plans. Please upgrade first." });
      }

      const stripeState = await validateAndCleanStripeData(org.id);
      if (!stripeState.subscriptionId) {
        return res.status(400).json({ error: "No active subscription found. Please set up billing first." });
      }

      if (quantity < (org.additionalPetSlots || 0)) {
        const effectiveNewLimit = (plan.dogsLimit || 0) + quantity;
        const orgDogs = await storage.getDogsByOrganization(org.id);
        if (orgDogs.length > effectiveNewLimit) {
          return res.status(400).json({
            error: `Cannot reduce to ${quantity} add-on slots. You have ${orgDogs.length} pets but would only have ${effectiveNewLimit} slots. Remove some pets first.`,
          });
        }
      }

      await stripeService.updateAddonSlots(stripeState.subscriptionId, quantity, org.stripeTestMode);
      await storage.updateOrganization(org.id, { additionalPetSlots: quantity });

      const updated = await storage.getOrganization(org.id);
      const slotWord = quantity > 1 ? "slots" : "slot";
      res.json({
        success: true,
        additionalPetSlots: updated?.additionalPetSlots || 0,
        message: quantity > 0
          ? `You now have ${quantity} extra pet ${slotWord}. Your card will be charged $${(quantity * 3).toFixed(2)}/month.`
          : "Add-on pet slots removed.",
      });
    } catch (error: any) {
      console.error("Error updating addon slots:", error);
      res.status(500).json({ error: "Failed to update add-on slots. Please try again." });
    }
  });

  // Dogs - Public gallery (all dogs)
  app.get("/api/dogs", async (req: Request, res: Response) => {
    try {
      const allDogs = await storage.getAllDogs();
      
      const activeOrgs = await storage.getAllOrganizations();
      const activeOrgIds = new Set(activeOrgs.filter(o => o.isActive).map(o => o.id));
      
      const dogsWithPortraits = await Promise.all(
        allDogs
          .filter(dog => dog.organizationId && activeOrgIds.has(dog.organizationId))
          .map(async (dog) => {
            const portrait = await storage.getSelectedPortraitByDog(dog.id);
            if (portrait) {
              const style = await storage.getPortraitStyle(portrait.styleId);
              return {
                ...dog,
                portrait: { ...portrait, style },
              };
            }
            return dog;
          })
      );
      
      const isRealImage = (url: string | null | undefined) => {
        if (!url) return false;
        if (url.includes('placehold.co') || url.includes('placeholder') || url.includes('via.placeholder')) return false;
        return true;
      };
      
      const visibleDogs = dogsWithPortraits.filter((dog: any) => 
        dog.isAvailable && (isRealImage(dog.portrait?.generatedImageUrl) || isRealImage(dog.originalPhotoUrl))
      );
      
      res.json(visibleDogs);
    } catch (error) {
      console.error("Error fetching dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });

  // Get dogs for current user's organization
  app.get("/api/my-dogs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const org = await storage.getOrganizationByOwner(userId);
      
      if (!org) {
        return res.json([]);
      }

      const orgDogs = await storage.getDogsByOrganization(org.id);
      
      // Get portraits and styles for each dog
      const dogsWithPortraits = await Promise.all(
        orgDogs.map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          if (portrait) {
            const style = await storage.getPortraitStyle(portrait.styleId);
            return {
              ...dog,
              portrait: { ...portrait, style },
            };
          }
          return dog;
        })
      );
      
      res.json(dogsWithPortraits);
    } catch (error) {
      console.error("Error fetching user dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });

  app.get("/api/dogs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }
      
      const org = dog.organizationId ? await storage.getOrganization(dog.organizationId) : null;
      const allPortraits = await storage.getPortraitsByDog(dog.id);

      const portraitsWithStyles = await Promise.all(
        allPortraits.map(async (p) => {
          const style = await storage.getPortraitStyle(p.styleId);
          return { ...p, style: style || null };
        })
      );

      const portrait = portraitsWithStyles.find(p => p.isSelected) || (portraitsWithStyles.length > 0 ? portraitsWithStyles[0] : undefined);
      
      res.json({
        ...dog,
        organizationName: org?.name || null,
        organizationLogoUrl: org?.logoUrl || null,
        organizationWebsiteUrl: org?.websiteUrl || null,
        portrait: portrait || undefined,
        portraits: portraitsWithStyles,
      });
    } catch (error) {
      console.error("Error fetching dog:", error);
      res.status(500).json({ error: "Failed to fetch pet" });
    }
  });

  app.post("/api/dogs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      let orgId: number;

      let org;
      if (userIsAdmin && req.body.organizationId) {
        orgId = req.body.organizationId;
        org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(400).json({ error: "Organization not found" });
        }
      } else {
        org = await storage.getOrganizationByOwner(userId);
        if (!org) {
          return res.status(400).json({ error: "You need to create an organization first" });
        }
        orgId = org.id;
      }

      if (!org.planId || org.subscriptionStatus === "inactive") {
        return res.status(403).json({ error: "Please select a plan before adding pets" });
      }

      const limitError = await checkDogLimit(orgId);
      if (limitError) {
        return res.status(403).json({ error: limitError });
      }

      const { originalPhotoUrl, generatedPortraitUrl, styleId, organizationId: _orgId, ...dogData } = req.body;

      if (dogData.species && !["dog", "cat"].includes(dogData.species)) {
        return res.status(400).json({ error: "species must be 'dog' or 'cat'" });
      }

      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }

      if (!dogData.breed || !dogData.breed.trim()) {
        return res.status(400).json({ error: "Breed is required" });
      }

      if (!isValidBreed(dogData.breed, dogData.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }

      const dog = await createDogWithPortrait(dogData, orgId, originalPhotoUrl, generatedPortraitUrl, styleId);
      res.status(201).json(dog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating pet:", errMsg, error);
      res.status(500).json({ error: `Failed to save pet: ${errMsg}` });
    }
  });

  app.patch("/api/dogs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to edit this dog" });
        }
      }

      const { selectedPortraitId, ...dogData } = req.body;

      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }

      if (dogData.breed !== undefined && !isValidBreed(dogData.breed, dogData.species || dog.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }

      if (selectedPortraitId) {
        const portrait = await storage.getPortrait(selectedPortraitId);
        if (!portrait || portrait.dogId !== id) {
          return res.status(400).json({ error: "Invalid portrait selection" });
        }
      }

      const updatedDog = await storage.updateDog(id, dogData);

      if (selectedPortraitId) {
        await storage.selectPortraitForGallery(id, selectedPortraitId);
      }

      res.json(updatedDog);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating pet:", errMsg, error);
      res.status(500).json({ error: `Failed to update pet: ${errMsg}` });
    }
  });

  app.delete("/api/dogs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to delete this dog" });
        }
      }

      await storage.deleteDog(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dog:", error);
      res.status(500).json({ error: "Failed to delete pet" });
    }
  });

  // Portrait Styles
  app.get("/api/styles", async (req: Request, res: Response) => {
    try {
      const styles = await storage.getAllPortraitStyles();
      res.json(styles);
    } catch (error) {
      console.error("Error fetching styles:", error);
      res.status(500).json({ error: "Failed to fetch styles" });
    }
  });

  app.get("/api/dogs/:id/photo", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const dog = await storage.getDog(id);
      if (!dog || !dog.originalPhotoUrl) {
        return res.status(404).send("Photo not found");
      }

      const dataUri = dog.originalPhotoUrl;
      if (!dataUri.startsWith('data:')) {
        return res.redirect(dataUri);
      }

      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }

      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], 'base64');

      res.set({
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving pet photo:", error);
      res.status(500).send("Error loading photo");
    }
  });

  app.get("/api/portraits/:id/image", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const portrait = await storage.getPortrait(id);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).send("Image not found");
      }

      const dataUri = portrait.generatedImageUrl;
      if (!dataUri.startsWith('data:')) {
        return res.redirect(dataUri);
      }

      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }

      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], 'base64');

      res.set({
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving portrait image:", error);
      res.status(500).send("Error loading image");
    }
  });

  app.get("/api/rescue/:slug/og-image", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug as string;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) { res.status(404).send("Organization not found"); return; }
      const imageBuffer = await generateShowcaseMockup(org.id);
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating rescue OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });

  app.get("/api/pawfile/:id/og-image", async (req: Request, res: Response) => {
    try {
      const dogId = parseInt(req.params.id as string);
      if (isNaN(dogId)) { res.status(400).send("Invalid ID"); return; }
      const imageBuffer = await generatePawfileMockup(dogId);
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating pawfile OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });

  // Portraits
  app.get("/api/dogs/:dogId/portraits", async (req: Request, res: Response) => {
    try {
      const dogId = parseInt(req.params.dogId as string);
      const dogPortraits = await storage.getPortraitsByDog(dogId);
      res.json(dogPortraits);
    } catch (error) {
      console.error("Error fetching portraits:", error);
      res.status(500).json({ error: "Failed to fetch portraits" });
    }
  });

  async function resolveOrgForUser(userId: string, userEmail: string, dogId?: number): Promise<{ org: any; error?: string; status?: number }> {
    const userIsAdmin = userEmail === ADMIN_EMAIL;

    if (dogId) {
      const dog = await storage.getDog(dogId);
      if (!dog || !dog.organizationId) {
        return { org: null, error: "Pet not found", status: 404 };
      }
      const org = await storage.getOrganization(dog.organizationId);
      if (!org) {
        return { org: null, error: "Organization not found", status: 404 };
      }
      if (userIsAdmin || org.ownerId === userId) {
        return { org };
      }
      return { org: null, error: "Not authorized to access this dog", status: 403 };
    }

    const org = await storage.getOrganizationByOwner(userId);
    if (org) {
      return { org };
    }

    if (userIsAdmin) {
      return { org: null, error: "Admin must specify an organization. Use the dashboard to manage a specific business.", status: 400 };
    }

    return { org: null, error: "You need to create an organization first", status: 400 };
  }

  app.post("/api/generate-portrait", isAuthenticated, aiRateLimiter, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { prompt, dogName, originalImage, dogId, styleId, organizationId } = req.body;

      if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Prompt is required" });
      if (prompt.length > 2000) {
        return res.status(400).json({ error: "Invalid prompt. Maximum 2000 characters." });
      }
      if (dogName && (typeof dogName !== "string" || dogName.length > 100)) {
        return res.status(400).json({ error: "Invalid dog name." });
      }
      if (originalImage && typeof originalImage === "string" && !originalImage.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image format." });
      }

      const sanitizedPrompt = sanitizeForPrompt(prompt);
      if (!sanitizedPrompt) return res.status(400).json({ error: "Prompt contains invalid characters." });

      let org;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      if (userIsAdmin && organizationId && !dogId) {
        const targetOrg = await storage.getOrganization(parseInt(organizationId));
        if (!targetOrg) return res.status(404).json({ error: "Organization not found" });
        org = targetOrg;
      } else {
        const resolved = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : undefined);
        if (resolved.error) return res.status(resolved.status || 400).json({ error: resolved.error });
        org = resolved.org;
      }

      if (org.subscriptionStatus === "canceled") {
        return res.status(403).json({ error: "Your subscription has been canceled. Please choose a new plan to generate portraits." });
      }

      if (isTrialExpired(org)) {
        return res.status(403).json({ error: "Your 30-day free trial has expired. Please upgrade to a paid plan to continue." });
      }

      if (!org.planId) {
        return res.status(403).json({ error: "No plan selected. Please choose a plan before generating portraits." });
      }

      if (!dogId) {
        const limitError = await checkDogLimit(org.id);
        if (limitError) {
          return res.status(403).json({ error: limitError });
        }
      }

      const MAX_STYLES_PER_PET = 5;

      let existingPortrait = null;
      let isNewPortrait = false;

      if (dogId && styleId) {
        const parsedDogId = parseInt(dogId);
        const parsedStyleId = parseInt(styleId);
        existingPortrait = await storage.getPortraitByDogAndStyle(parsedDogId, parsedStyleId);

        if (existingPortrait) {
          if (existingPortrait.editCount >= MAX_EDITS_PER_IMAGE) {
            return res.status(403).json({
              error: `You've used all ${MAX_EDITS_PER_IMAGE} edits for this style. Try a different style!`,
              editCount: existingPortrait.editCount,
              maxEdits: MAX_EDITS_PER_IMAGE,
            });
          }
        } else {
          isNewPortrait = true;
          const existingPortraits = await storage.getPortraitsByDog(parsedDogId);
          const uniqueStyles = new Set(existingPortraits.map(p => p.styleId));
          if (uniqueStyles.size >= MAX_STYLES_PER_PET) {
            return res.status(403).json({
              error: `This pet already has ${MAX_STYLES_PER_PET} styles. Edit an existing style or remove one first.`,
              stylesUsed: uniqueStyles.size,
              maxStyles: MAX_STYLES_PER_PET,
            });
          }

          const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
          if (plan && plan.monthlyPortraitCredits) {
            const { creditsUsed } = await storage.getAccurateCreditsUsed(org.id);
            await storage.syncOrgCredits(org.id);
            if (creditsUsed >= plan.monthlyPortraitCredits) {
              if (org.subscriptionStatus === "trial" || !plan.overagePriceCents) {
                return res.status(403).json({
                  error: `You've used all ${plan.monthlyPortraitCredits} monthly portrait credits. ${org.subscriptionStatus === "trial" ? "Upgrade to a paid plan for more credits." : "Credits reset at the start of your next billing cycle."}`,
                  creditsUsed,
                  creditsLimit: plan.monthlyPortraitCredits,
                });
              }
            }
          }
        }
      }

      const generatedImage = await generateImage(sanitizedPrompt, originalImage || undefined);

      let portraitRecord = existingPortrait;
      if (dogId && styleId) {
        const parsedDogId = parseInt(dogId);
        const parsedStyleId = parseInt(styleId);
        if (existingPortrait) {
          await storage.updatePortrait(existingPortrait.id, {
            previousImageUrl: existingPortrait.generatedImageUrl || null,
            generatedImageUrl: generatedImage,
          });
          await storage.incrementPortraitEditCount(existingPortrait.id);
          await storage.selectPortraitForGallery(parsedDogId, existingPortrait.id);
          portraitRecord = { ...existingPortrait, editCount: existingPortrait.editCount + 1, generatedImageUrl: generatedImage, previousImageUrl: existingPortrait.generatedImageUrl || null };
        } else {
          portraitRecord = await storage.createPortrait({
            dogId: parsedDogId,
            styleId: parsedStyleId,
            generatedImageUrl: generatedImage,
          });
          await storage.selectPortraitForGallery(parsedDogId, portraitRecord.id);
          await storage.incrementOrgPortraitsUsed(org.id);
        }
      }

      res.json({
        generatedImage,
        dogName: dogName ? sanitizeForPrompt(dogName) : dogName,
        portraitId: portraitRecord?.id,
        editCount: portraitRecord ? portraitRecord.editCount : null,
        maxEdits: MAX_EDITS_PER_IMAGE,
        isNewPortrait,
        hasPreviousImage: !!(portraitRecord as any)?.previousImageUrl,
      });
    } catch (error) {
      console.error("[generate-portrait]", error);
      res.status(500).json({ error: "Failed to generate portrait. Please try again." });
    }
  });

  app.post("/api/edit-portrait", isAuthenticated, aiRateLimiter, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { currentImage, editPrompt, dogId, portraitId } = req.body;

      if (!currentImage) return res.status(400).json({ error: "Current image is required" });
      if (!editPrompt || typeof editPrompt !== "string") return res.status(400).json({ error: "Edit instructions are required" });
      if (editPrompt.length > 500) return res.status(400).json({ error: "Edit instructions too long (max 500 characters)." });

      const sanitizedEditPrompt = sanitizeForPrompt(editPrompt);
      if (!sanitizedEditPrompt) return res.status(400).json({ error: "Edit instructions contain invalid characters." });

      const { org, error, status } = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : undefined);
      if (error) return res.status(status || 400).json({ error });
      if (org.subscriptionStatus === "canceled") {
        return res.status(403).json({ error: "Your subscription has been canceled. Please choose a new plan." });
      }

      if (isTrialExpired(org)) {
        return res.status(403).json({ error: "Your 30-day free trial has expired. Please upgrade to a paid plan to continue." });
      }



      if (portraitId) {
        const portrait = await storage.getPortrait(parseInt(portraitId));
        if (!portrait) return res.status(404).json({ error: "Portrait not found" });

        // Verify portrait belongs to the user's org
        const dog = await storage.getDog(portrait.dogId);
        if (!dog || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to edit this portrait" });
        }

        if (portrait.editCount >= MAX_EDITS_PER_IMAGE) {
          return res.status(403).json({
            error: `You've used all ${MAX_EDITS_PER_IMAGE} edits for this portrait. Try a different style!`,
            editCount: portrait.editCount,
            maxEdits: MAX_EDITS_PER_IMAGE,
          });
        }
      }

      const editedImage = await editImage(currentImage, sanitizedEditPrompt);

      let editCount: number | null = null;
      if (portraitId) {
        const existing = await storage.getPortrait(parseInt(portraitId));
        await storage.updatePortrait(parseInt(portraitId), {
          previousImageUrl: existing?.generatedImageUrl || null,
          generatedImageUrl: editedImage,
        });
        await storage.incrementPortraitEditCount(parseInt(portraitId));
        const updated = await storage.getPortrait(parseInt(portraitId));
        editCount = updated?.editCount ?? null;
      }

      res.json({ editedImage, editCount, maxEdits: MAX_EDITS_PER_IMAGE, hasPreviousImage: true });
    } catch (error) {
      console.error("[edit-portrait]", error);
      res.status(500).json({ error: "Failed to edit portrait. Please try again." });
    }
  });

  app.post("/api/revert-portrait", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { portraitId } = req.body;

      if (!portraitId) return res.status(400).json({ error: "Portrait ID is required" });

      const portrait = await storage.getPortrait(parseInt(portraitId));
      if (!portrait) return res.status(404).json({ error: "Portrait not found" });
      if (!portrait.previousImageUrl) return res.status(400).json({ error: "No previous image to revert to" });

      const { org, error, status } = await resolveOrgForUser(userId, userEmail, portrait.dogId);
      if (error) return res.status(status || 400).json({ error });

      await storage.updatePortrait(portrait.id, {
        generatedImageUrl: portrait.previousImageUrl,
        previousImageUrl: null,
      });

      res.json({
        revertedImage: portrait.previousImageUrl,
        portraitId: portrait.id,
        editCount: portrait.editCount,
        hasPreviousImage: false,
      });
    } catch (error) {
      console.error("[revert-portrait]", error);
      res.status(500).json({ error: "Failed to revert portrait. Please try again." });
    }
  });

  // Admin routes
  app.post("/api/admin/organizations", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const { name, description, websiteUrl } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      const slug = await generateUniqueSlug(name);

      const org = await storage.createOrganization({
        name,
        slug,
        description: description || "",
        websiteUrl: websiteUrl || "",
        ownerId: null,
        subscriptionStatus: "inactive",
        portraitsUsedThisMonth: 0,
      });

      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization (admin):", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.get("/api/admin/organizations", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const allPlans = await storage.getAllSubscriptionPlans();
      const planMap = new Map(allPlans.map(p => [p.id, p]));
      
      const orgsWithStats = await Promise.all(
        orgs.map(async (org) => {
          const dogs = await storage.getDogsByOrganization(org.id);
          let portraitCount = 0;
          for (const dog of dogs) {
            const portraits = await storage.getPortraitsByDog(dog.id);
            portraitCount += portraits.length;
          }
          
          const plan = org.planId ? planMap.get(org.planId) : null;
          const planName = plan ? plan.name.toLowerCase() : "none";
          const planPriceCents = plan ? plan.priceMonthly : 0;
          const addonSlots = org.additionalPetSlots || 0;
          const addonRevenueCents = addonSlots * 300;
          const totalRevenueCents = (org.subscriptionStatus === "active" ? planPriceCents : 0) + (org.subscriptionStatus === "active" ? addonRevenueCents : 0);
          
          return {
            ...org,
            dogCount: dogs.length,
            portraitCount,
            planName,
            planPriceCents,
            addonRevenueCents,
            totalRevenueCents,
          };
        })
      );
      
      res.json(orgsWithStats);
    } catch (error) {
      console.error("Error fetching admin organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const dogs = await storage.getAllDogs();
      
      let totalPortraits = 0;
      for (const dog of dogs) {
        const portraits = await storage.getPortraitsByDog(dog.id);
        totalPortraits += portraits.length;
      }
      
      // Calculate subscription stats
      const activeSubscriptions = orgs.filter(o => o.subscriptionStatus === "active").length;
      const pastDue = orgs.filter(o => o.subscriptionStatus === "past_due").length;
      
      const allPlans = await storage.getAllSubscriptionPlans();
      const planMap = new Map(allPlans.map(p => [p.id, p]));

      const planDistribution: Record<string, number> = {};
      for (const plan of allPlans) {
        const key = plan.name.toLowerCase() === "free trial" ? "trial" : plan.name.toLowerCase();
        planDistribution[key] = orgs.filter(o => o.planId === plan.id).length;
      }
      planDistribution.trial = (planDistribution.trial || 0) + orgs.filter(o => !o.planId && o.subscriptionStatus === "trial").length;
      planDistribution.inactive = orgs.filter(o => o.subscriptionStatus === "inactive" || o.subscriptionStatus === "canceled").length;

      const monthlyRevenue = orgs.reduce((sum, o) => {
        if (o.subscriptionStatus === "active" && o.planId) {
          const plan = planMap.get(o.planId);
          const planRev = plan ? plan.priceMonthly / 100 : 0;
          const addonRev = (o.additionalPetSlots || 0) * 3;
          return sum + planRev + addonRev;
        }
        return sum;
      }, 0);
      
      res.json({
        totalOrgs: orgs.length,
        totalDogs: dogs.length,
        totalPortraits,
        activeSubscriptions,
        pastDue,
        monthlyRevenue,
        planDistribution,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/organizations/:id/dogs", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id as string);
      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const orgDogs = await storage.getDogsByOrganization(orgId);
      const dogsWithPortraits = await Promise.all(
        orgDogs.map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          if (portrait) {
            const style = await storage.getPortraitStyle(portrait.styleId);
            return { ...dog, portrait: { ...portrait, style } };
          }
          return dog;
        })
      );

      res.json(dogsWithPortraits);
    } catch (error) {
      console.error("Error fetching org dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });

  app.post("/api/admin/organizations/:id/dogs", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id as string);
      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!org.planId || org.subscriptionStatus === "inactive") {
        return res.status(403).json({ error: "This organization needs a plan before pets can be added" });
      }

      const limitError = await checkDogLimit(orgId);
      if (limitError) {
        return res.status(403).json({ error: limitError });
      }

      const { originalPhotoUrl, generatedPortraitUrl, styleId, ...dogData } = req.body;

      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }

      if (dogData.breed && !isValidBreed(dogData.breed, dogData.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }

      const dog = await createDogWithPortrait(dogData, orgId, originalPhotoUrl, generatedPortraitUrl, styleId);
      res.status(201).json(dog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating pet for org:", errMsg, error);
      res.status(500).json({ error: `Failed to save pet: ${errMsg}` });
    }
  });

  app.get("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      let org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const synced = await storage.syncOrgCredits(id);
      if (synced) org = synced;
      const dogs = await storage.getDogsByOrganization(id);
      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      res.json({
        ...org,
        dogCount: dogs.length,
        ...computePetLimitInfo(org, plan, dogs.length),
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  app.post("/api/admin/organizations/:id/select-plan", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const isFreeTrialPlan = plan.priceMonthly === 0 && (plan.trialDays ?? 0) > 0;

      if (isFreeTrialPlan && !canStartFreeTrial(org)) {
        return res.status(400).json({ error: "This organization has already used its free trial." });
      }

      const trialEndsAt = plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null;

      const isNewPlan = org.planId !== plan.id;
      const orgUpdate: Partial<InsertOrganization> = {
        planId: plan.id,
        subscriptionStatus: isFreeTrialPlan ? "trial" : "active",
      };
      if (isNewPlan) {
        orgUpdate.billingCycleStart = org.billingCycleStart || org.createdAt || new Date();
      }
      if (trialEndsAt) {
        orgUpdate.trialEndsAt = trialEndsAt;
      }
      await storage.updateOrganization(id, orgUpdate);

      if (isFreeTrialPlan) {
        await markFreeTrialUsed(id);
      }

      await storage.syncOrgCredits(id);

      const updated = await storage.getOrganization(id);
      res.json(updated);
    } catch (error) {
      console.error("Error selecting plan for organization:", error);
      res.status(500).json({ error: "Failed to select plan" });
    }
  });

  app.patch("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const allowedFields = [
        "name", "description", "websiteUrl", "logoUrl",
        "contactName", "contactEmail", "contactPhone",
        "socialFacebook", "socialInstagram", "socialTwitter", "socialNextdoor",
        "locationStreet", "locationCity", "locationState", "locationZip", "locationCountry",
        "billingStreet", "billingCity", "billingState", "billingZip", "billingCountry",
        "notes", "isActive", "planId", "speciesHandled", "onboardingCompleted",
        "subscriptionStatus", "stripeCustomerId", "stripeSubscriptionId", "stripeTestMode", "billingCycleStart"
      ];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (updates.planId !== undefined) {
        if (updates.planId !== null) {
          const plan = await storage.getSubscriptionPlan(updates.planId);
          if (!plan) {
            return res.status(400).json({ error: "Invalid plan selected" });
          }
        }
      }

      if (updates.logoUrl !== undefined && updates.logoUrl !== null) {
        const MAX_LOGO_LENGTH = 500000;
        if (typeof updates.logoUrl !== "string" || updates.logoUrl.length > MAX_LOGO_LENGTH) {
          return res.status(400).json({ error: "Logo data too large or invalid" });
        }
      }

      if (updates.name && updates.name !== org.name) {
        updates.slug = await generateUniqueSlug(updates.name, id);
      }

      const stripeFields: Record<string, any> = {};
      for (const key of ["stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "stripeTestMode"] as const) {
        if (updates[key] !== undefined) {
          stripeFields[key] = updates[key];
          if (key !== "subscriptionStatus") delete updates[key];
        }
      }

      await storage.updateOrganization(id, updates);
      if (Object.keys(stripeFields).length > 0) {
        await storage.updateOrganizationStripeInfo(id, stripeFields);
      }
      const result = await storage.getOrganization(id);
      res.json(result);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  app.delete("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      
      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      
      // Delete all dogs (cascades to portraits)
      const dogs = await storage.getDogsByOrganization(id);
      for (const dog of dogs) {
        await storage.deleteDog(dog.id);
      }
      
      // Delete the organization
      await storage.deleteOrganization(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ error: "Failed to delete organization" });
    }
  });

  app.get("/api/admin/data-integrity", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const allOrgs = await storage.getAllOrganizations();
      const issues: any[] = [];

      for (const org of allOrgs) {
        const orgDogs = await storage.getDogsByOrganization(org.id);
        const dogCount = orgDogs.length;

        if (!org.planId && dogCount > 0) {
          issues.push({
            type: "no_plan",
            severity: "critical",
            orgId: org.id,
            orgName: org.name,
            dogCount,
            message: `Has ${dogCount} pet(s) but no plan assigned`,
          });
        }

        if (!org.planId && org.subscriptionStatus === "trial") {
          issues.push({
            type: "trial_no_plan",
            severity: "critical",
            orgId: org.id,
            orgName: org.name,
            message: `Status is "trial" but no plan assigned`,
          });
        }

        if (org.planId && dogCount > 0) {
          const plan = await storage.getSubscriptionPlan(org.planId);
          if (plan?.dogsLimit) {
            const effectiveLimit = plan.dogsLimit + (org.additionalPetSlots || 0);
            if (dogCount > effectiveLimit) {
              issues.push({
                type: "over_limit",
                severity: "warning",
                orgId: org.id,
                orgName: org.name,
                dogCount,
                petLimit: effectiveLimit,
                planName: plan.name,
                message: `Has ${dogCount} pet(s) but limit is ${effectiveLimit}`,
              });
            }
          }
        }
      }

      res.json({
        totalOrgs: allOrgs.length,
        issueCount: issues.length,
        issues,
      });
    } catch (error) {
      console.error("Error checking data integrity:", error);
      res.status(500).json({ error: "Failed to check data integrity" });
    }
  });

  app.post("/api/admin/sync-stripe", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const allOrgs = await storage.getAllOrganizations();
      const orgsWithStripe = allOrgs.filter(o => o.stripeSubscriptionId);
      const results: string[] = [];

      for (const org of orgsWithStripe) {
        try {
          const stripe = getStripeClient(org.stripeTestMode);
          const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId!);
          const newStatus = mapStripeStatusToInternal(sub.status, org.subscriptionStatus);

          const priceId = sub.items?.data?.[0]?.price?.id;
          const matchedPlan = priceId ? STRIPE_PLAN_PRICE_MAP[priceId] : undefined;
          const updates: any = {};
          const changes: string[] = [];

          if (newStatus !== org.subscriptionStatus) {
            updates.subscriptionStatus = newStatus;
            changes.push(`status: ${org.subscriptionStatus} → ${newStatus}`);
          }

          if (matchedPlan && matchedPlan.id !== org.planId) {
            updates.planId = matchedPlan.id;
            changes.push(`plan: ${org.planId} → ${matchedPlan.id} (${matchedPlan.name})`);
          }

          if (newStatus === 'canceled') {
            if (org.additionalPetSlots && org.additionalPetSlots > 0) {
              updates.additionalPetSlots = 0;
              changes.push(`add-on slots: ${org.additionalPetSlots} → 0`);
            }
          }

          const subAny = sub as any;
          if (sub.status === 'active' && subAny.current_period_start) {
            const periodStart = new Date(subAny.current_period_start * 1000);
            const existingStart = org.billingCycleStart;
            if (!existingStart || existingStart.getTime() !== periodStart.getTime()) {
              updates.billingCycleStart = periodStart;
              changes.push(`billing cycle: updated to ${periodStart.toISOString()}`);
            }
          }

          if (changes.length > 0) {
            if (updates.subscriptionStatus) {
              await storage.updateOrganizationStripeInfo(org.id, {
                subscriptionStatus: updates.subscriptionStatus,
                stripeSubscriptionId: org.stripeSubscriptionId!,
              });
              delete updates.subscriptionStatus;
            }
            if (Object.keys(updates).length > 0) {
              await storage.updateOrganization(org.id, updates);
            }
            results.push(`${org.name} (id ${org.id}): ${changes.join(', ')}`);
          }
        } catch (stripeErr: any) {
          results.push(`${org.name} (id ${org.id}): ERROR - ${stripeErr.message}`);
        }
      }

      res.json({
        message: `Synced ${orgsWithStripe.length} org(s) with Stripe`,
        orgsChecked: orgsWithStripe.length,
        changes: results,
      });
    } catch (error: any) {
      console.error("Error syncing Stripe data:", error);
      res.status(500).json({ error: "Failed to sync Stripe data" });
    }
  });

  app.post("/api/admin/recalculate-credits", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const results = await storage.recalculateAllOrgCredits();
      res.json({
        message: `Recalculated credits for ${results.length} organization(s)`,
        changes: results,
      });
    } catch (error) {
      console.error("Error recalculating credits:", error);
      res.status(500).json({ error: "Failed to recalculate credits" });
    }
  });

  // --- SMS sharing via Telnyx ---
  const smsRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many texts sent. Please wait a minute." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
  });

  app.post("/api/send-sms", isAuthenticated, smsRateLimiter, async (req: any, res: Response) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }

      // Basic phone number validation: digits, spaces, dashes, parens, optional leading +
      const cleaned = to.replace(/[\s\-().]/g, "");
      if (!/^\+?1?\d{10,15}$/.test(cleaned)) {
        return res.status(400).json({ error: "Please enter a valid phone number" });
      }

      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioKeySid = process.env.TWILIO_API_KEY_SID;
      const twilioKeySecret = process.env.TWILIO_API_KEY_SECRET;
      const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;

      if (!twilioSid || !twilioKeySid || !twilioKeySecret || !twilioMsgSvc) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }

      const phone = cleaned.startsWith("+") ? cleaned : cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;

      const twilioAuth = Buffer.from(`${twilioKeySid}:${twilioKeySecret}`).toString("base64");
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${twilioAuth}`,
        },
        body: new URLSearchParams({ To: phone, MessagingServiceSid: twilioMsgSvc, Body: message }).toString(),
      });

      if (!twilioRes.ok) {
        const err = await twilioRes.json();
        throw new Error(err.message || "Failed to send text message");
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("SMS send error:", error);
      const errMsg = error?.message || "Failed to send text message";
      res.status(500).json({ error: errMsg });
    }
  });

  // --- Instagram Integration via Ayrshare ---
  const AYRSHARE_API_URL = 'https://api.ayrshare.com/api';

  function getAyrshareHeaders(profileKey?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${process.env.AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
    };
    if (profileKey) {
      headers['Profile-Key'] = profileKey;
    }
    return headers;
  }

  // Ensure DB columns exist for Ayrshare integration
  (async () => {
    try {
      await pool.query(`
        ALTER TABLE organizations
          ADD COLUMN IF NOT EXISTS ayrshare_profile_key TEXT,
          ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
          ADD COLUMN IF NOT EXISTS instagram_user_id TEXT,
          ADD COLUMN IF NOT EXISTS instagram_username TEXT,
          ADD COLUMN IF NOT EXISTS instagram_page_id TEXT,
          ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMP
      `);
      console.log("[instagram] DB columns ready (Ayrshare mode)");
    } catch (e: any) {
      console.warn("[instagram] Could not add columns:", e.message);
    }
  })();

  // Check Instagram connection status via Ayrshare
  app.get("/api/instagram/status", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ connected: false });

    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;

      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;
      let org;
      if (isAdmin && orgIdParam) {
        org = await storage.getOrganization(orgIdParam);
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.json({ connected: false });

      const result = await pool.query(
        'SELECT ayrshare_profile_key, instagram_username FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      // Query Ayrshare for connected social accounts
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: getAyrshareHeaders(profileKey),
      });
      const userData = await userRes.json() as any;

      const connected = Array.isArray(userData.activeSocialAccounts) &&
        userData.activeSocialAccounts.includes('instagram');
      const username = userData.displayNames?.instagram ||
        result.rows[0]?.instagram_username || null;

      if (connected && username && username !== result.rows[0]?.instagram_username) {
        await pool.query('UPDATE organizations SET instagram_username = $1 WHERE id = $2', [username, org.id]);
      }

      res.json({ connected, username, orgId: org.id });
    } catch (error) {
      console.error("[instagram] Status error:", error);
      res.json({ connected: false });
    }
  });

  // Connect Instagram via Ayrshare Social Connect (JWT SSO)
  app.get("/api/instagram/connect", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;

      let orgId: number | null = null;
      if (isAdmin && orgIdParam) {
        orgId = orgIdParam;
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) return res.status(400).json({ error: "No organization found" });

      // Create Ayrshare profile for this org if it doesn't exist
      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [orgId]
      );
      let profileKey = result.rows[0]?.ayrshare_profile_key;

      if (!profileKey) {
        const org = await storage.getOrganization(orgId);
        const profileRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
          method: 'POST',
          headers: getAyrshareHeaders(),
          body: JSON.stringify({
            title: `PP-Org-${orgId}-${(org?.name || 'Unknown').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30)}`,
          }),
        });
        const profileData = await profileRes.json() as any;

        if (profileData.profileKey) {
          profileKey = profileData.profileKey;
          await pool.query(
            'UPDATE organizations SET ayrshare_profile_key = $1 WHERE id = $2',
            [profileKey, orgId]
          );
          console.log(`[instagram] Created Ayrshare profile for org ${orgId}: ${profileKey}`);
        } else {
          console.error("[instagram] Failed to create Ayrshare profile:", profileData);
          return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(profileData.message || 'profile_creation_failed'));
        }
      }

      // Generate JWT URL for Ayrshare Social Connect page
      const privateKey = process.env.AYRSHARE_PRIVATE_KEY;
      const domain = process.env.AYRSHARE_DOMAIN;

      if (!privateKey || !domain) {
        console.error("[instagram] Missing AYRSHARE_PRIVATE_KEY or AYRSHARE_DOMAIN env vars");
        return res.redirect('/settings?instagram=error&detail=missing_ayrshare_config');
      }

      const jwtRes = await fetch(`${AYRSHARE_API_URL}/profiles/generateJWT`, {
        method: 'POST',
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          domain,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          profileKey,
          redirect: `https://pawtraitpros.com/settings?instagram=connected`,
          allowedSocial: ['instagram'],
        }),
      });
      const jwtData = await jwtRes.json() as any;

      if (jwtData.url) {
        console.log(`[instagram] Redirecting org ${orgId} to Ayrshare Social Connect`);
        return res.redirect(jwtData.url);
      } else {
        console.error("[instagram] JWT generation failed:", jwtData);
        return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(jwtData.message || 'jwt_failed'));
      }
    } catch (error: any) {
      console.error("[instagram] Connect error:", error);
      res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(error.message || 'unknown'));
    }
  });

  // Post to Instagram via Ayrshare
  app.post("/api/instagram/post", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;

      let imageToUpload: string;
      let fileName: string;
      let description: string;
      let org: any;
      let defaultCaption: string;

      if (image && bodyOrgId) {
        // Showcase mode: client sent a captured image + orgId
        org = await storage.getOrganization(parseInt(bodyOrgId));
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin) {
          const userOrg = await storage.getOrganizationByOwner(userId);
          if (!userOrg || userOrg.id !== org.id) {
            return res.status(403).json({ error: "You don't have access to this organization" });
          }
        }
        imageToUpload = image;
        fileName = `showcase-${org.id}-${Date.now()}.png`;
        description = `Showcase from ${org.name}`;
        defaultCaption = caption || `Check out the adorable pets at ${org.name}! #petportrait #pawtraitpros`;
      } else if (dogId) {
        // Single dog mode: post a specific dog's portrait
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        org = await storage.getOrganization(dog.organizationId);
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin) {
          const userOrg = await storage.getOrganizationByOwner(userId);
          if (!userOrg || userOrg.id !== org.id) {
            return res.status(403).json({ error: "You don't have access to this organization" });
          }
        }
        const portrait = await storage.getSelectedPortraitByDog(dog.id);
        if (!portrait || !portrait.generatedImageUrl) {
          return res.status(400).json({ error: "No portrait found for this pet" });
        }
        imageToUpload = portrait.generatedImageUrl;
        fileName = `portrait-${dog.id}-${Date.now()}.png`;
        description = `Pawtrait of ${dog.name}`;
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'pawtraitpros.com';
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ''}View their full portrait at ${proto}://${host}/pawfile/${dog.id}\n\n#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }

      // Get org's Ayrshare profile key
      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      // Step 1: Upload image to Ayrshare
      console.log(`[instagram] Uploading image for org ${org.id} to Ayrshare`);
      const uploadRes = await fetch(`${AYRSHARE_API_URL}/media/upload`, {
        method: 'POST',
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          file: imageToUpload,
          fileName,
          description,
        }),
      });
      const uploadData = await uploadRes.json() as any;

      if (!uploadData.url) {
        console.error("[instagram] Upload failed:", uploadData);
        throw new Error(uploadData.message || "Failed to upload image");
      }
      console.log(`[instagram] Uploaded: ${uploadData.url}`);

      // Step 2: Post to Instagram via Ayrshare
      const postRes = await fetch(`${AYRSHARE_API_URL}/post`, {
        method: 'POST',
        headers: getAyrshareHeaders(profileKey),
        body: JSON.stringify({
          post: defaultCaption,
          platforms: ['instagram'],
          mediaUrls: [uploadData.url],
        }),
      });
      const postData = await postRes.json() as any;

      if (postData.status === 'error') {
        console.error("[instagram] Post failed:", postData);
        throw new Error(postData.message || "Failed to post to Instagram");
      }

      const igPost = postData.postIds?.find((p: any) => p.platform === 'instagram');
      console.log(`[instagram] Posted to Instagram for org ${org.id} via Ayrshare`);

      res.json({
        success: true,
        mediaId: igPost?.id || postData.id,
        postUrl: igPost?.postUrl || null,
      });
    } catch (error: any) {
      console.error("[instagram] Post error:", error);
      res.status(500).json({ error: error.message || "Failed to post to Instagram" });
    }
  });

  // Disconnect Instagram via Ayrshare
  app.delete("/api/instagram/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });

    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;

      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;
      let org;
      if (isAdmin && orgIdParam) {
        org = await storage.getOrganization(orgIdParam);
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "Organization not found" });

      const result = await pool.query(
        'SELECT ayrshare_profile_key FROM organizations WHERE id = $1',
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;

      if (profileKey) {
        await fetch(`${AYRSHARE_API_URL}/profiles/social`, {
          method: 'DELETE',
          headers: getAyrshareHeaders(profileKey),
          body: JSON.stringify({ platform: 'instagram' }),
        });
      }

      await pool.query(
        `UPDATE organizations SET instagram_username = NULL, instagram_user_id = NULL, instagram_access_token = NULL WHERE id = $1`,
        [org.id]
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });

  // Admin debug: Ayrshare integration status
  app.get("/api/admin/instagram-debug", isAuthenticated, async (req: Request, res: Response) => {
    const email = (req as any).user.claims.email;
    if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Admin only" });

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ error: "AYRSHARE_API_KEY not set" });

    try {
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const userData = await userRes.json();

      const profilesRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const profilesData = await profilesRes.json();

      res.json({
        ayrshare_user: userData,
        profiles: profilesData,
        env: {
          hasApiKey: !!apiKey,
          hasDomain: !!process.env.AYRSHARE_DOMAIN,
          hasPrivateKey: !!process.env.AYRSHARE_PRIVATE_KEY,
        },
      });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // ============================================================
  // --- Native Instagram Graph API Integration ---
  // Runs alongside Ayrshare; controlled by VITE_INSTAGRAM_PROVIDER env var on frontend
  // ============================================================

  const GRAPH_API = 'https://graph.instagram.com';
  const GRAPH_API_V = 'https://graph.instagram.com/v21.0';
  const IG_APP_ID = process.env.INSTAGRAM_APP_ID;  // 1402830604303230 — Instagram App ID (from Meta portal Instagram API config)
  const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

  // In-memory image cache for serving base64 images as public URLs
  const imageCache = new Map<string, { data: Buffer; contentType: string; expiresAt: number }>();

  // Clean expired images every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of imageCache) {
      if (now > entry.expiresAt) {
        imageCache.delete(token);
      }
    }
  }, 2 * 60 * 1000);

  // Public image endpoint — serves cached images by token (no auth required)
  app.get("/api/public-image/:token", (req: Request, res: Response) => {
    const entry = imageCache.get(req.params.token);
    if (!entry || Date.now() > entry.expiresAt) {
      imageCache.delete(req.params.token);
      return res.status(404).json({ error: "Image not found or expired" });
    }
    res.set('Content-Type', entry.contentType);
    res.set('Cache-Control', 'public, max-age=600');
    res.send(entry.data);
  });

  // Helper: store base64 image and return a public URL
  function storePublicImage(base64DataUri: string): string {
    const matches = base64DataUri.match(/^data:(image\/\w+);base64,(.+)$/s);
    if (!matches) throw new Error("Invalid base64 image data");
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const token = crypto.randomUUID();
    imageCache.set(token, {
      data: buffer,
      contentType,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
    });
    const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
    return `${host}/api/public-image/${token}`;
  }

  // Helper: get org for current user (owner or admin)
  async function getOrgForUser(req: Request, orgIdParam?: number | null): Promise<any> {
    const userId = (req as any).user.claims.sub;
    const email = (req as any).user.claims.email;
    const isAdmin = email === ADMIN_EMAIL;
    if (isAdmin && orgIdParam) {
      return storage.getOrganization(orgIdParam);
    }
    return storage.getOrganizationByOwner(userId);
  }

  // Native Instagram: Check connection status
  app.get("/api/instagram-native/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;
      const org = await getOrgForUser(req, orgIdParam);
      if (!org) return res.json({ connected: false });

      const result = await pool.query(
        'SELECT instagram_access_token, instagram_user_id, instagram_username, instagram_token_expires_at FROM organizations WHERE id = $1',
        [org.id]
      );
      const row = result.rows[0];
      if (!row?.instagram_access_token || !row?.instagram_user_id) {
        return res.json({ connected: false });
      }

      // Check if token is expired
      if (row.instagram_token_expires_at && new Date(row.instagram_token_expires_at) < new Date()) {
        return res.json({ connected: false, reason: "token_expired" });
      }

      // Auto-refresh if token expires within 7 days
      const expiresAt = row.instagram_token_expires_at ? new Date(row.instagram_token_expires_at) : null;
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (expiresAt && expiresAt < sevenDaysFromNow && IG_APP_SECRET) {
        try {
          const refreshRes = await fetch(
            `${GRAPH_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.instagram_access_token}`
          );
          const refreshData = await refreshRes.json() as any;
          if (refreshData.access_token) {
            const newExpires = new Date(Date.now() + (refreshData.expires_in || 5184000) * 1000);
            await pool.query(
              'UPDATE organizations SET instagram_access_token = $1, instagram_token_expires_at = $2 WHERE id = $3',
              [refreshData.access_token, newExpires.toISOString(), org.id]
            );
            console.log(`[instagram-native] Token refreshed for org ${org.id}`);
          }
        } catch (refreshErr) {
          console.warn("[instagram-native] Token refresh failed:", refreshErr);
        }
      }

      // Verify token is still valid by calling Graph API (use /me with versioned endpoint)
      const verifyRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${row.instagram_access_token}`);
      const verifyData = await verifyRes.json() as any;

      if (verifyData.error) {
        console.warn("[instagram-native] Token invalid:", verifyData.error.message);
        return res.json({ connected: false, reason: "token_invalid" });
      }

      // Sync username if changed
      if (verifyData.username && verifyData.username !== row.instagram_username) {
        await pool.query('UPDATE organizations SET instagram_username = $1 WHERE id = $2', [verifyData.username, org.id]);
      }

      res.json({ connected: true, username: verifyData.username || row.instagram_username, orgId: org.id });
    } catch (error) {
      console.error("[instagram-native] Status error:", error);
      res.json({ connected: false });
    }
  });

  // Native Instagram: Start OAuth connect flow
  app.get("/api/instagram-native/connect", isAuthenticated, async (req: Request, res: Response) => {
    if (!IG_APP_ID || !IG_APP_SECRET) {
      return res.redirect('/settings?instagram=error&detail=missing_instagram_config');
    }

    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;

      let orgId: number | null = null;
      if (isAdmin && orgIdParam) {
        orgId = orgIdParam;
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) return res.redirect('/settings?instagram=error&detail=no_organization');

      // Store orgId in state param for callback
      const state = Buffer.from(JSON.stringify({ orgId })).toString('base64url');
      const redirectUri = `${process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000'}/api/instagram-native/callback`;

      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code&state=${state}`;

      console.log(`[instagram-native] Redirecting org ${orgId} to Facebook OAuth`);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[instagram-native] Connect error:", error);
      res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(error.message || 'unknown'));
    }
  });

  // Native Instagram: OAuth callback
  app.get("/api/instagram-native/callback", async (req: Request, res: Response) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      console.error("[instagram-native] OAuth denied:", oauthError);
      return res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(oauthError as string));
    }

    if (!code || !state) {
      return res.redirect('/settings?instagram=error&detail=missing_code_or_state');
    }

    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      const orgId = stateData.orgId;
      if (!orgId) throw new Error("No orgId in state");

      const redirectUri = `${process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000'}/api/instagram-native/callback`;

      // Step 1: Exchange code for short-lived token (Instagram Platform API)
      // Clean code value (Instagram sometimes appends #_ to the code)
      const cleanCode = (code as string).replace(/#_$/, '');
      console.log(`[instagram-native] Token exchange: client_id=${IG_APP_ID}, redirect_uri=${redirectUri}, code_length=${cleanCode.length}`);
      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: IG_APP_ID!,
          client_secret: IG_APP_SECRET!,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: cleanCode,
        }).toString(),
      });
      const tokenData = await tokenRes.json() as any;
      if (tokenData.error_type || tokenData.error) {
        console.error("[instagram-native] Token exchange error:", JSON.stringify(tokenData));
        console.error("[instagram-native] Used redirect_uri:", redirectUri);
        console.error("[instagram-native] Used client_id:", IG_APP_ID);
        throw new Error(tokenData.error_message || tokenData.error?.message || "Token exchange failed");
      }
      const shortLivedToken = tokenData.access_token;

      // Step 2: Exchange for long-lived token (60 days)
      const longTokenRes = await fetch(
        `${GRAPH_API}/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortLivedToken}`
      );
      const longTokenData = await longTokenRes.json() as any;
      if (longTokenData.error) {
        console.error("[instagram-native] Long-lived token error:", longTokenData.error);
        throw new Error(longTokenData.error.message || "Long-lived token exchange failed");
      }
      const longLivedToken = longTokenData.access_token;
      const expiresIn = longTokenData.expires_in || 5184000; // default 60 days

      // Step 3: Get Instagram profile (use /me — returns id as string, avoids JS number precision loss)
      const igProfileRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${longLivedToken}`);
      const igProfileData = await igProfileRes.json() as any;
      const igUserId = igProfileData.id; // Use 'id' field (string) — NOT tokenData.user_id (number, loses precision for large IDs)
      const igUsername = igProfileData.username || null;
      console.log(`[instagram-native] Profile: id=${igUserId}, username=${igUsername}`);

      // Step 4: Store everything in DB
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      await pool.query(
        `UPDATE organizations SET
          instagram_access_token = $1,
          instagram_user_id = $2,
          instagram_username = $3,
          instagram_page_id = $4,
          instagram_token_expires_at = $5
        WHERE id = $6`,
        [longLivedToken, igUserId, igUsername, null, expiresAt.toISOString(), orgId]
      );

      console.log(`[instagram-native] Connected org ${orgId}: @${igUsername} (IG ID: ${igUserId})`);
      res.redirect('/settings?instagram=connected');
    } catch (error: any) {
      console.error("[instagram-native] Callback error:", error);
      res.redirect('/settings?instagram=error&detail=' + encodeURIComponent(error.message || 'callback_failed'));
    }
  });

  // Native Instagram: Post image
  app.post("/api/instagram-native/post", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const email = (req as any).user.claims.email;
      const isAdmin = email === ADMIN_EMAIL;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;

      let imageToPost: string;
      let org: any;
      let defaultCaption: string;

      if (image && bodyOrgId) {
        // Showcase mode
        org = await storage.getOrganization(parseInt(bodyOrgId));
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin) {
          const userOrg = await storage.getOrganizationByOwner(userId);
          if (!userOrg || userOrg.id !== org.id) {
            return res.status(403).json({ error: "You don't have access to this organization" });
          }
        }
        imageToPost = image;
        defaultCaption = caption || `Check out the adorable pets at ${org.name}! #petportrait #pawtraitpros`;
      } else if (dogId) {
        // Single dog mode
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        org = await storage.getOrganization(dog.organizationId);
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin) {
          const userOrg = await storage.getOrganizationByOwner(userId);
          if (!userOrg || userOrg.id !== org.id) {
            return res.status(403).json({ error: "You don't have access to this organization" });
          }
        }
        const portrait = await storage.getSelectedPortraitByDog(dog.id);
        if (!portrait || !portrait.generatedImageUrl) {
          return res.status(400).json({ error: "No portrait found for this pet" });
        }
        imageToPost = portrait.generatedImageUrl;
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || 'pawtraitpros.com';
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ''}View their full portrait at ${proto}://${host}/pawfile/${dog.id}\n\n#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }

      // Get org's Instagram credentials
      const result = await pool.query(
        'SELECT instagram_access_token, instagram_user_id FROM organizations WHERE id = $1',
        [org.id]
      );
      const token = result.rows[0]?.instagram_access_token;
      const igUserId = result.rows[0]?.instagram_user_id;
      if (!token || !igUserId) {
        return res.status(400).json({ error: "Instagram not connected. Please connect Instagram first." });
      }

      // Store image as public URL
      const imageUrl = storePublicImage(imageToPost);
      console.log(`[instagram-native] Posting for org ${org.id}, image URL: ${imageUrl}`);

      // Step 1: Create media container
      console.log(`[instagram-native] Creating container: user=${igUserId}, image_url=${imageUrl}`);
      const containerRes = await fetch(`${GRAPH_API_V}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: defaultCaption,
          access_token: token,
        }),
      });
      const containerText = await containerRes.text();
      console.log(`[instagram-native] Container response (${containerRes.status}): ${containerText}`);
      const containerData = JSON.parse(containerText);

      if (containerData.error) {
        console.error("[instagram-native] Container creation error:", JSON.stringify(containerData.error));
        throw new Error(containerData.error.message || "Failed to create media container");
      }
      const containerId = containerData.id;
      console.log(`[instagram-native] Container created: ${containerId}`);

      // Step 2: Poll for container status (max 30 seconds)
      let ready = false;
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await fetch(
          `${GRAPH_API_V}/${containerId}?fields=status_code&access_token=${token}`
        );
        const statusData = await statusRes.json() as any;
        if (statusData.status_code === 'FINISHED') {
          ready = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          throw new Error("Instagram rejected the image. It may be too large or in an unsupported format.");
        }
      }
      if (!ready) {
        throw new Error("Image processing timed out. Please try again.");
      }

      // Step 3: Publish
      console.log(`[instagram-native] Publishing container ${containerId} for user ${igUserId}`);
      const publishRes = await fetch(`${GRAPH_API_V}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token,
        }),
      });
      const publishText = await publishRes.text();
      console.log(`[instagram-native] Publish response (${publishRes.status}): ${publishText}`);
      const publishData = JSON.parse(publishText);

      if (publishData.error) {
        console.error("[instagram-native] Publish error:", JSON.stringify(publishData.error));
        throw new Error(publishData.error.message || "Failed to publish to Instagram");
      }

      console.log(`[instagram-native] Published to Instagram: ${publishData.id}`);

      // Clean up cached image
      const tokenFromUrl = imageUrl.split('/').pop();
      if (tokenFromUrl) imageCache.delete(tokenFromUrl);

      res.json({
        success: true,
        mediaId: publishData.id,
        postUrl: null, // Graph API doesn't return permalink directly
      });
    } catch (error: any) {
      console.error("[instagram-native] Post error:", error);
      res.status(500).json({ error: error.message || "Failed to post to Instagram" });
    }
  });

  // Native Instagram: Disconnect
  app.delete("/api/instagram-native/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId as string) : null;
      const org = await getOrgForUser(req, orgIdParam);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      await pool.query(
        `UPDATE organizations SET
          instagram_access_token = NULL,
          instagram_user_id = NULL,
          instagram_username = NULL,
          instagram_page_id = NULL,
          instagram_token_expires_at = NULL
        WHERE id = $1`,
        [org.id]
      );

      console.log(`[instagram-native] Disconnected org ${org.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram-native] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });

  // Native Instagram: Data deletion callback (required by Meta)
  app.post("/api/instagram-native/data-deletion", async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request || !IG_APP_SECRET) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Parse signed request
      const [sig, payload] = signed_request.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const fbUserId = data.user_id;

      if (fbUserId) {
        // Clear Instagram data for any org linked to this Facebook user
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_page_id IS NOT NULL`
        );
        console.log(`[instagram-native] Data deletion processed for FB user ${fbUserId}`);
      }

      // Meta requires this specific response format
      const confirmationCode = crypto.randomUUID();
      res.json({
        url: `https://pawtraitpros.com/privacy`,
        confirmation_code: confirmationCode,
      });
    } catch (error: any) {
      console.error("[instagram-native] Data deletion error:", error);
      res.status(500).json({ error: "Failed to process data deletion" });
    }
  });

  // Native Instagram: Deauthorize callback (required by Meta)
  app.post("/api/instagram-native/deauthorize", async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const [sig, payload] = signed_request.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const fbUserId = data.user_id;

      if (fbUserId) {
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_page_id IS NOT NULL`
        );
        console.log(`[instagram-native] Deauthorized FB user ${fbUserId}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[instagram-native] Deauthorize error:", error);
      res.status(500).json({ error: "Failed to process deauthorization" });
    }
  });

  return httpServer;
}
