import { db, pool } from "./db";
import { portraitStyles, subscriptionPlans } from "@shared/schema";
import { portraitStyles as styleOptions } from "../client/src/lib/portrait-styles";
import { eq, notInArray } from "drizzle-orm";

const planDefinitions = [
  {
    id: 5,
    name: "Free Trial",
    description: "Try Pawtrait Pros free for 30 days with up to 3 pets and 20 portrait credits.",
    priceMonthly: 0,
    dogsLimit: 3,
    monthlyPortraitCredits: 20,
    overagePriceCents: 0,
    trialDays: 30,
  },
  {
    id: 6,
    name: "Starter",
    description: "Perfect for small rescues with up to 15 pets.",
    priceMonthly: 3900,
    dogsLimit: 15,
    monthlyPortraitCredits: 45,
    overagePriceCents: 400,
    trialDays: 0,
    stripePriceId: "price_1T1NpB2LfX3IuyBIb44I2uwq",
    stripeProductId: "prod_TzMYhqaSdDwYcO",
  },
  {
    id: 7,
    name: "Professional",
    description: "Ideal for growing rescue organizations with up to 45 pets.",
    priceMonthly: 7900,
    dogsLimit: 45,
    monthlyPortraitCredits: 135,
    overagePriceCents: 400,
    trialDays: 0,
    stripePriceId: "price_1T1NpC2LfX3IuyBIBj9Mdx3f",
    stripeProductId: "prod_TzMY4ahWLz2y9C",
  },
  {
    id: 8,
    name: "Executive",
    description: "Best value for large rescue networks with up to 200 pets.",
    priceMonthly: 34900,
    dogsLimit: 200,
    monthlyPortraitCredits: 600,
    overagePriceCents: 300,
    trialDays: 0,
    stripePriceId: "price_1T1NpC2LfX3IuyBIPtezJkZ0",
    stripeProductId: "prod_TzMYb3LIL5kiZ5",
  },
];

export async function seedDatabase() {
  console.log("Checking if seed data exists...");

  // Migration: add stripe_test_mode column if it doesn't exist (with timeout to avoid blocking startup)
  try {
    const migTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
    await Promise.race([
      (async () => {
        await pool.query('SET LOCAL statement_timeout = 8000');
        await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_test_mode BOOLEAN DEFAULT false NOT NULL');
        const migResult = await pool.query('UPDATE organizations SET stripe_test_mode = true WHERE stripe_customer_id IS NOT NULL AND stripe_test_mode = false');
        if (migResult.rowCount && migResult.rowCount > 0) {
          console.log(`[migration] Set ${migResult.rowCount} existing org(s) to Stripe test mode`);
        }
        console.log('[migration] stripe_test_mode column ready');
      })(),
      migTimeout,
    ]);
  } catch (migErr: any) {
    console.log('[migration] stripe_test_mode:', migErr.message);
  }

  await seedSubscriptionPlans();

  const existingStyles = await db.select().from(portraitStyles);
  const existingMap = new Map(existingStyles.map((s) => [s.id, s]));

  const missingStyles = styleOptions.filter((s) => !existingMap.has(s.id));

  if (missingStyles.length > 0) {
    console.log(`Seeding ${missingStyles.length} missing portrait styles...`);
    for (const style of missingStyles) {
      await db.insert(portraitStyles).values({
        id: style.id,
        name: style.name,
        description: style.description,
        promptTemplate: style.promptTemplate,
        category: style.category,
      }).onConflictDoNothing();
    }
    console.log(`Seeded ${missingStyles.length} portrait styles`);
  }

  let updatedCount = 0;
  for (const style of styleOptions) {
    const existing = existingMap.get(style.id);
    if (existing && (
      existing.name !== style.name ||
      existing.description !== style.description ||
      existing.promptTemplate !== style.promptTemplate ||
      existing.category !== style.category
    )) {
      await db.update(portraitStyles).set({
        name: style.name,
        description: style.description,
        promptTemplate: style.promptTemplate,
        category: style.category,
      }).where(eq(portraitStyles.id, style.id));
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} changed portrait styles`);
  }

  const validIds = styleOptions.map(s => s.id);
  const staleEntries = existingStyles.filter(s => !validIds.includes(s.id));
  if (staleEntries.length > 0) {
    await db.delete(portraitStyles).where(notInArray(portraitStyles.id, validIds));
    console.log(`Removed ${staleEntries.length} stale portrait styles: ${staleEntries.map(s => s.name).join(', ')}`);
  }

  if (missingStyles.length === 0 && updatedCount === 0 && staleEntries.length === 0) {
    console.log("Portrait styles already up to date, skipping...");
  }

  console.log("Database seeding complete!");
}

async function seedSubscriptionPlans() {
  const existingPlans = await db.select().from(subscriptionPlans);
  const existingMap = new Map(existingPlans.map((p) => [p.id, p]));

  let inserted = 0;
  let updated = 0;

  for (const plan of planDefinitions) {
    const existing = existingMap.get(plan.id);
    if (!existing) {
      await db.insert(subscriptionPlans).values(plan).onConflictDoNothing();
      inserted++;
    } else {
      const updateData: Record<string, any> = {};
      if (existing.priceMonthly !== plan.priceMonthly) updateData.priceMonthly = plan.priceMonthly;
      if (existing.dogsLimit !== plan.dogsLimit) updateData.dogsLimit = plan.dogsLimit;
      if (existing.monthlyPortraitCredits !== plan.monthlyPortraitCredits) updateData.monthlyPortraitCredits = plan.monthlyPortraitCredits;
      if (existing.overagePriceCents !== plan.overagePriceCents) updateData.overagePriceCents = plan.overagePriceCents;
      if (existing.trialDays !== plan.trialDays) updateData.trialDays = plan.trialDays;
      if (plan.stripePriceId && existing.stripePriceId !== plan.stripePriceId) updateData.stripePriceId = plan.stripePriceId;
      if (plan.stripeProductId && existing.stripeProductId !== plan.stripeProductId) updateData.stripeProductId = plan.stripeProductId;
      if (Object.keys(updateData).length > 0) {
        await db.update(subscriptionPlans).set(updateData).where(eq(subscriptionPlans.id, plan.id));
        updated++;
      }
    }
  }

  if (inserted > 0) console.log(`Seeded ${inserted} subscription plans`);
  if (updated > 0) console.log(`Updated ${updated} subscription plans`);
  if (inserted === 0 && updated === 0) console.log("Subscription plans already up to date, skipping...");
}
