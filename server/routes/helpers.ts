import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { getStripeClient } from "../stripeClient";
import { isTrialExpired } from "../subscription";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[^\w\s\-'.,:;!?()]/g, '')
    .trim();
}

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please wait a minute before generating more portraits." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
  validate: { xForwardedForHeader: false },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const MAX_ADDITIONAL_SLOTS = 5;
export const MAX_EDITS_PER_IMAGE = 4;

export async function generateUniqueSlug(name: string, excludeOrgId?: number): Promise<string> {
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

export async function validateAndCleanStripeData(orgId: number): Promise<{ customerId: string | null; subscriptionId: string | null; subscriptionStatus: string | null; cleaned: boolean }> {
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

export function computePetLimitInfo(org: any, plan: any, petCount: number) {
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

export async function checkDogLimit(orgId: number): Promise<string | null> {
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

export function generatePetCode(name: string): string {
  const prefix = (name || "PET").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `${prefix}-${suffix}`;
}

export async function createDogWithPortrait(dogData: any, orgId: number, originalPhotoUrl: string | undefined, generatedPortraitUrl: string | undefined, styleId: number | undefined) {
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

export const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user?.claims?.email || req.user.claims.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export function toPublicOrg(org: any) {
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

export async function resolveOrgForUser(userId: string, userEmail: string, dogId?: number): Promise<{ org: any; error?: string; status?: number }> {
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
