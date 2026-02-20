import { db, pool } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  organizations,
  subscriptionPlans,
  dogs,
  portraits,
  portraitStyles,
  type Organization,
  type InsertOrganization,
  type SubscriptionPlan,
  type Dog,
  type InsertDog,
  type Portrait,
  type InsertPortrait,
  type PortraitStyle,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Subscription Plans
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: number, data: Record<string, any>): Promise<void>;

  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationByOwner(ownerId: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  updateOrganizationStripeInfo(id: number, stripeInfo: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string; stripeTestMode?: boolean }): Promise<Organization | undefined>;
  getOrgStripeTestMode(orgId: number): Promise<boolean>;
  clearOrganizationOwner(id: number): Promise<void>;
  deleteOrganization(id: number): Promise<void>;

  // Dogs
  getDog(id: number): Promise<Dog | undefined>;
  getDogsByOrganization(orgId: number): Promise<Dog[]>;
  getAllDogs(): Promise<Dog[]>;
  createDog(dog: InsertDog): Promise<Dog>;
  updateDog(id: number, dog: Partial<InsertDog>): Promise<Dog | undefined>;
  deleteDog(id: number): Promise<void>;

  // Portrait Styles
  getPortraitStyle(id: number): Promise<PortraitStyle | undefined>;
  getAllPortraitStyles(): Promise<PortraitStyle[]>;

  // Portraits
  getPortrait(id: number): Promise<Portrait | undefined>;
  getPortraitByDogAndStyle(dogId: number, styleId: number): Promise<Portrait | undefined>;
  getPortraitsByDog(dogId: number): Promise<Portrait[]>;
  getSelectedPortraitByDog(dogId: number): Promise<Portrait | undefined>;
  createPortrait(portrait: InsertPortrait): Promise<Portrait>;
  updatePortrait(id: number, portrait: Partial<InsertPortrait>): Promise<Portrait | undefined>;
  selectPortraitForGallery(dogId: number, portraitId: number): Promise<void>;
  incrementPortraitEditCount(portraitId: number): Promise<void>;
  incrementOrgPortraitsUsed(orgId: number): Promise<void>;
  getAccurateCreditsUsed(orgId: number): Promise<{ creditsUsed: number; billingCycleStart: Date | null }>;
  syncOrgCredits(orgId: number): Promise<Organization | undefined>;
  recalculateAllOrgCredits(): Promise<{ orgId: number; name: string; old: number; new: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  // Subscription Plans
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }

  async updateSubscriptionPlan(id: number, data: Record<string, any>): Promise<void> {
    await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id));
  }

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getOrganizationByOwner(ownerId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
    return org;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set(org).where(eq(organizations.id, id)).returning();
    return updated;
  }

  async updateOrganizationStripeInfo(id: number, stripeInfo: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string; stripeTestMode?: boolean }): Promise<Organization | undefined> {
    // Handle stripeTestMode separately via raw SQL (not in Drizzle schema)
    const { stripeTestMode, ...drizzleFields } = stripeInfo;
    if (Object.keys(drizzleFields).length > 0) {
      await db.update(organizations).set(drizzleFields).where(eq(organizations.id, id));
    }
    if (stripeTestMode !== undefined) {
      try {
        await pool.query('UPDATE organizations SET stripe_test_mode = $1 WHERE id = $2', [stripeTestMode, id]);
      } catch (e: any) {
        console.warn('[stripe] Could not set stripeTestMode:', e.message);
      }
    }
    const [updated] = await db.select().from(organizations).where(eq(organizations.id, id));
    return updated;
  }

  async getOrgStripeTestMode(orgId: number): Promise<boolean> {
    try {
      const result = await pool.query('SELECT stripe_test_mode FROM organizations WHERE id = $1', [orgId]);
      // Default to true (test mode) for backward compat — all existing data is from test Stripe
      return result.rows[0]?.stripe_test_mode ?? true;
    } catch {
      // Column may not exist yet, default to test mode for safety
      return true;
    }
  }

  async clearOrganizationOwner(id: number): Promise<void> {
    await db.update(organizations).set({ ownerId: null } as any).where(eq(organizations.id, id));
  }

  async deleteOrganization(id: number): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // Dogs
  async getDog(id: number): Promise<Dog | undefined> {
    const [dog] = await db.select().from(dogs).where(eq(dogs.id, id));
    return dog;
  }

  async getDogsByOrganization(orgId: number): Promise<Dog[]> {
    return db.select().from(dogs).where(eq(dogs.organizationId, orgId)).orderBy(desc(dogs.createdAt));
  }

  async getAllDogs(): Promise<Dog[]> {
    return db.select().from(dogs).orderBy(desc(dogs.createdAt));
  }

  async createDog(dog: InsertDog): Promise<Dog> {
    const [created] = await db.insert(dogs).values(dog).returning();
    return created;
  }

  async updateDog(id: number, dog: Partial<InsertDog>): Promise<Dog | undefined> {
    const [updated] = await db.update(dogs).set(dog).where(eq(dogs.id, id)).returning();
    return updated;
  }

  async deleteDog(id: number): Promise<void> {
    await db.delete(dogs).where(eq(dogs.id, id));
  }

  // Portrait Styles
  async getPortraitStyle(id: number): Promise<PortraitStyle | undefined> {
    const [style] = await db.select().from(portraitStyles).where(eq(portraitStyles.id, id));
    return style;
  }

  async getAllPortraitStyles(): Promise<PortraitStyle[]> {
    return db.select().from(portraitStyles);
  }

  // Portraits
  async getPortrait(id: number): Promise<Portrait | undefined> {
    const [portrait] = await db.select().from(portraits).where(eq(portraits.id, id));
    return portrait;
  }

  async getPortraitByDogAndStyle(dogId: number, styleId: number): Promise<Portrait | undefined> {
    const [portrait] = await db.select().from(portraits)
      .where(and(eq(portraits.dogId, dogId), eq(portraits.styleId, styleId)));
    return portrait;
  }

  async getPortraitsByDog(dogId: number): Promise<Portrait[]> {
    return db.select().from(portraits).where(eq(portraits.dogId, dogId)).orderBy(desc(portraits.createdAt));
  }

  async getSelectedPortraitByDog(dogId: number): Promise<Portrait | undefined> {
    const [selected] = await db
      .select()
      .from(portraits)
      .where(and(eq(portraits.dogId, dogId), eq(portraits.isSelected, true)))
      .orderBy(desc(portraits.createdAt))
      .limit(1);
    if (selected) return selected;
    const [fallback] = await db
      .select()
      .from(portraits)
      .where(eq(portraits.dogId, dogId))
      .orderBy(desc(portraits.createdAt))
      .limit(1);
    return fallback;
  }

  async createPortrait(portrait: InsertPortrait): Promise<Portrait> {
    const [created] = await db.insert(portraits).values(portrait).returning();
    return created;
  }

  async updatePortrait(id: number, portrait: Partial<InsertPortrait>): Promise<Portrait | undefined> {
    const [updated] = await db.update(portraits).set(portrait).where(eq(portraits.id, id)).returning();
    return updated;
  }

  async selectPortraitForGallery(dogId: number, portraitId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(portraits).set({ isSelected: false }).where(eq(portraits.dogId, dogId));
      await tx.update(portraits).set({ isSelected: true }).where(and(eq(portraits.id, portraitId), eq(portraits.dogId, dogId)));
    });
  }

  async incrementPortraitEditCount(portraitId: number): Promise<void> {
    await db.update(portraits)
      .set({ editCount: sql`COALESCE(${portraits.editCount}, 0) + 1` })
      .where(eq(portraits.id, portraitId));
  }

  async incrementOrgPortraitsUsed(orgId: number): Promise<void> {
    await db.update(organizations)
      .set({ portraitsUsedThisMonth: sql`COALESCE(${organizations.portraitsUsedThisMonth}, 0) + 1` })
      .where(eq(organizations.id, orgId));
  }

  async getAccurateCreditsUsed(orgId: number): Promise<{ creditsUsed: number; billingCycleStart: Date | null }> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) return { creditsUsed: 0, billingCycleStart: null };

    const now = new Date();
    let effectiveCycleStart = org.billingCycleStart;

    if (effectiveCycleStart && org.createdAt && effectiveCycleStart > org.createdAt) {
      effectiveCycleStart = org.createdAt;
    }

    if (effectiveCycleStart) {
      const cycleMonth = effectiveCycleStart.getMonth();
      const cycleYear = effectiveCycleStart.getFullYear();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      if (cycleMonth !== currentMonth || cycleYear !== currentYear) {
        effectiveCycleStart = new Date(currentYear, currentMonth, effectiveCycleStart.getDate());
        if (effectiveCycleStart > now) {
          effectiveCycleStart = new Date(currentYear, currentMonth, 1);
        }
      }
    } else {
      effectiveCycleStart = org.createdAt || now;
    }

    const rows = await db.select({ count: sql<number>`count(*)` })
      .from(portraits)
      .innerJoin(dogs, eq(portraits.dogId, dogs.id))
      .where(
        and(
          eq(dogs.organizationId, orgId),
          gte(portraits.createdAt, effectiveCycleStart)
        )
      );
    const creditsUsed = Number(rows[0]?.count ?? 0);

    return { creditsUsed, billingCycleStart: effectiveCycleStart };
  }

  async syncOrgCredits(orgId: number): Promise<Organization | undefined> {
    const { creditsUsed, billingCycleStart } = await this.getAccurateCreditsUsed(orgId);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) return undefined;

    const updates: Record<string, any> = {};
    if (org.portraitsUsedThisMonth !== creditsUsed) {
      updates.portraitsUsedThisMonth = creditsUsed;
    }
    if (billingCycleStart && (!org.billingCycleStart || org.billingCycleStart.getTime() !== billingCycleStart.getTime())) {
      updates.billingCycleStart = billingCycleStart;
    }
    if (Object.keys(updates).length > 0) {
      const [updated] = await db.update(organizations)
        .set(updates)
        .where(eq(organizations.id, orgId))
        .returning();
      return updated;
    }
    return org;
  }
  async recalculateAllOrgCredits(): Promise<{ orgId: number; name: string; old: number; new: number }[]> {
    const allOrgs = await db.select().from(organizations);
    const results: { orgId: number; name: string; old: number; new: number }[] = [];

    for (const org of allOrgs) {
      const { creditsUsed, billingCycleStart } = await this.getAccurateCreditsUsed(org.id);

      const updates: Record<string, any> = {};
      if (creditsUsed !== org.portraitsUsedThisMonth) {
        updates.portraitsUsedThisMonth = creditsUsed;
      }
      if (billingCycleStart && (!org.billingCycleStart || org.billingCycleStart.getTime() !== billingCycleStart.getTime())) {
        updates.billingCycleStart = billingCycleStart;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(organizations)
          .set(updates)
          .where(eq(organizations.id, org.id));
        if (creditsUsed !== org.portraitsUsedThisMonth) {
          results.push({ orgId: org.id, name: org.name, old: org.portraitsUsedThisMonth, new: creditsUsed });
        }
      }
    }

    return results;
  }

  async repairSequences(): Promise<string[]> {
    const fixes: string[] = [];
    const tables = [
      { table: 'organizations', seq: 'organizations_id_seq' },
      { table: 'dogs', seq: 'dogs_id_seq' },
      { table: 'portraits', seq: 'portraits_id_seq' },
      { table: 'portrait_styles', seq: 'portrait_styles_id_seq' },
      { table: 'subscription_plans', seq: 'subscription_plans_id_seq' },
    ];
    for (const { table, seq } of tables) {
      await db.execute(sql.raw(
        `SELECT setval('${seq}', GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`
      ));
      const maxResult = await db.execute(sql.raw(`SELECT MAX(id) as max_id FROM ${table}`));
      const seqResult = await db.execute(sql.raw(`SELECT last_value FROM ${seq}`));
      const maxId = Number((maxResult as any).rows?.[0]?.max_id ?? 0);
      const seqVal = Number((seqResult as any).rows?.[0]?.last_value ?? 0);
      if (seqVal > 0 && maxId > 0 && seqVal === maxId) {
        fixes.push(`${table}: sequence synced to ${maxId}`);
      }
    }
    return fixes;
  }
}

export const storage = new DatabaseStorage();
