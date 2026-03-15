// Admin panel routes — organization management, stats, and platform-wide operations
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { getStripeClient, mapStripeStatusToInternal, STRIPE_PLAN_PRICE_MAP } from "../stripeClient";
import { canStartFreeTrial, markFreeTrialUsed } from "../subscription";
import { containsInappropriateLanguage } from "@shared/content-filter";
import { isValidBreed } from "../breeds";
import type { InsertOrganization } from "@shared/schema";
import crypto from "crypto";
import { pool } from "../db";
import { sendSms } from "./sms";
import { ADMIN_EMAIL, isAdmin, generateUniqueSlug, computePetLimitInfo, checkDogLimit, createDogWithPortrait, ORG_ALLOWED_FIELDS, DOG_ALLOWED_FIELDS } from "./helpers";

export function registerAdminRoutes(app: Express): void {

  // Admin routes
  app.post("/api/admin/organizations", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    const MAX_RETRIES = 2;
    const { name, description, websiteUrl, referredByOrgId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Organization name is required" });
    }

    // Validate referrer if provided
    if (referredByOrgId) {
      const referrer = await storage.getOrganization(referredByOrgId);
      if (!referrer || referrer.subscriptionStatus !== 'active') {
        return res.status(400).json({ error: "Referrer must be an active subscriber" });
      }
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const slug = await generateUniqueSlug(name);

        const orgData: any = {
          name,
          slug,
          description: description || "",
          websiteUrl: websiteUrl || "",
          ownerId: null,
          subscriptionStatus: "inactive",
          portraitsUsedThisMonth: 0,
        };
        if (referredByOrgId) {
          orgData.referredByOrgId = referredByOrgId;
        }

        const org = await storage.createOrganization(orgData);

        return res.status(201).json(org);
      } catch (error) {
        const err = error as any;
        console.error(`[admin] Create org attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err?.message, err?.code, err?.detail, err?.constraint);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return res.status(500).json({ error: err?.message || "Failed to create organization" });
      }
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

  // Merch order revenue by organization
  app.get("/api/admin/merch-revenue", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          o.id as org_id,
          o.name as org_name,
          COUNT(mo.id) FILTER (WHERE mo.status NOT IN ('awaiting_payment', 'failed')) as order_count,
          COALESCE(SUM(CASE WHEN mo.status NOT IN ('awaiting_payment', 'failed') THEN mo.total_cents ELSE 0 END), 0) as total_revenue_cents,
          COALESCE(SUM(CASE WHEN mo.status NOT IN ('awaiting_payment', 'failed') THEN mo.shipping_cents ELSE 0 END), 0) as total_shipping_cents,
          MAX(CASE WHEN mo.status NOT IN ('awaiting_payment', 'failed') THEN mo.created_at END) as last_order_at
        FROM organizations o
        JOIN merch_orders mo ON mo.organization_id = o.id
        GROUP BY o.id, o.name
        HAVING COUNT(mo.id) FILTER (WHERE mo.status NOT IN ('awaiting_payment', 'failed')) > 0
        ORDER BY total_revenue_cents DESC
      `);

      const totalRevenue = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.total_revenue_cents), 0);
      const totalOrders = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.order_count), 0);

      res.json({
        byOrg: result.rows.map((r: any) => ({
          orgId: r.org_id,
          orgName: r.org_name,
          orderCount: parseInt(r.order_count),
          totalRevenueCents: parseInt(r.total_revenue_cents),
          totalShippingCents: parseInt(r.total_shipping_cents),
          lastOrderAt: r.last_order_at,
        })),
        totalRevenueCents: totalRevenue,
        totalOrders,
      });
    } catch (error) {
      console.error("Error fetching merch revenue:", error);
      res.status(500).json({ error: "Failed to fetch merch revenue" });
    }
  });

  // Referral commission endpoints
  app.get("/api/admin/referrals", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const referredOrgs = orgs.filter(o => o.referredByOrgId);

      const relationships = [];
      for (const org of referredOrgs) {
        const referrer = orgs.find(o => o.id === org.referredByOrgId);
        if (!referrer) continue;

        const commissions = await storage.getReferralCommissions(referrer.id);
        const orgCommissions = commissions.filter((c: any) => c.referred_org_id === org.id);
        const totalEarned = orgCommissions.reduce((sum: number, c: any) => sum + c.commission_cents, 0);
        const totalApplied = orgCommissions.filter((c: any) => c.credit_applied).reduce((sum: number, c: any) => sum + c.commission_cents, 0);

        const startDate = org.referralStartDate;
        let monthsRemaining = 12;
        if (startDate) {
          const elapsed = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365 / 12);
          monthsRemaining = Math.max(0, Math.round(12 - elapsed));
        }

        relationships.push({
          referrerOrgId: referrer.id,
          referrerName: referrer.name,
          referredOrgId: org.id,
          referredName: org.name,
          referredStatus: org.subscriptionStatus,
          startDate: startDate || null,
          monthsRemaining,
          totalEarnedCents: totalEarned,
          totalAppliedCents: totalApplied,
          commissionCount: orgCommissions.length,
        });
      }

      res.json(relationships);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  app.get("/api/admin/referrals/:orgId", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId as string);
      const commissions = await storage.getReferralCommissions(orgId);
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching referral commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
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

      const { originalPhotoUrl, generatedPortraitUrl, styleId, ...rawData } = req.body;
      const dogData: Record<string, any> = {};
      for (const key of DOG_ALLOWED_FIELDS) {
        if (rawData[key] !== undefined) dogData[key] = rawData[key];
      }

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
      console.error("Error creating pet for org:", error);
      res.status(500).json({ error: "Failed to save pet" });
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

      const allowedFields = ORG_ALLOWED_FIELDS;
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.json(org);
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

  // Generate a send token for any org (admin use — for texting setup links to BGDs)
  app.post("/api/admin/organizations/:id/generate-send-token", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id as string);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      // If org already has a token, return it (don't regenerate unless requested)
      if (org.sendToken && !req.body.regenerate) {
        return res.json({ sendToken: org.sendToken, orgName: org.name });
      }

      const token = crypto.randomBytes(24).toString("hex");
      await pool.query("UPDATE organizations SET send_token = $1 WHERE id = $2", [token, orgId]);

      res.json({ sendToken: token, orgName: org.name });
    } catch (error: any) {
      console.error("Error generating send token for org:", error.message);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // One-click: generate token + send setup text to BGD's phone via Telnyx
  app.post("/api/admin/organizations/:id/send-setup-text", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id as string);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      // Must have a phone number on file
      const phone = (org as any).contactPhone || (org as any).contact_phone;
      if (!phone) {
        return res.status(400).json({ error: "No phone number on file for this business. Add their phone number first." });
      }

      // Generate send token if not already present
      let token = org.sendToken;
      if (!token) {
        token = crypto.randomBytes(24).toString("hex");
        await pool.query("UPDATE organizations SET send_token = $1 WHERE id = $2", [token, orgId]);
      }

      // Send the setup text via Telnyx
      const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
      const message = `Hi from Pawtrait Pros! Download the Pawtrait Send app to start sending portrait texts from your phone: ${appUrl}/setup-phone`;
      const result = await sendSms(phone, message);

      if (!result.success) {
        return res.status(500).json({ error: `Failed to send text: ${result.error || "Unknown error"}` });
      }

      res.json({ success: true, phone, orgName: org.name });
    } catch (error: any) {
      console.error("Error sending setup text:", error.message);
      res.status(500).json({ error: "Failed to send setup text" });
    }
  });

  // Get send token for an org (admin use — to show setup link)
  app.get("/api/admin/organizations/:id/send-token", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    try {
      const orgId = parseInt(req.params.id as string);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      res.json({ sendToken: org.sendToken || null, orgName: org.name });
    } catch (error: any) {
      console.error("Error fetching send token:", error.message);
      res.status(500).json({ error: "Failed to fetch token" });
    }
  });

}
