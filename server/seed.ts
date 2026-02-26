import { db, pool } from "./db";
import { portraitStyles, subscriptionPlans } from "@shared/schema";
import { portraitStyles as styleOptions } from "../client/src/lib/portrait-styles";
import { eq, notInArray } from "drizzle-orm";

const planDefinitions = [
  // Legacy plans (kept for backward compat, marked inactive)
  {
    id: 5,
    name: "Free Trial (Legacy)",
    description: "Legacy trial plan — replaced by vertical-specific plans.",
    priceMonthly: 0,
    dogsLimit: 3,
    monthlyPortraitCredits: 20,
    overagePriceCents: 0,
    trialDays: 30,
    isActive: false,
  },
  {
    id: 6,
    name: "Starter (Legacy)",
    description: "Legacy starter plan — replaced by vertical-specific plans.",
    priceMonthly: 3900,
    dogsLimit: 15,
    monthlyPortraitCredits: 45,
    overagePriceCents: 400,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpB2LfX3IuyBIb44I2uwq",
    stripeProductId: "prod_TzMYhqaSdDwYcO",
  },
  {
    id: 7,
    name: "Professional (Legacy)",
    description: "Legacy professional plan — replaced by vertical-specific plans.",
    priceMonthly: 7900,
    dogsLimit: 45,
    monthlyPortraitCredits: 135,
    overagePriceCents: 400,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpC2LfX3IuyBIBj9Mdx3f",
    stripeProductId: "prod_TzMY4ahWLz2y9C",
  },
  {
    id: 8,
    name: "Executive (Legacy)",
    description: "Legacy executive plan — replaced by vertical-specific plans.",
    priceMonthly: 34900,
    dogsLimit: 200,
    monthlyPortraitCredits: 600,
    overagePriceCents: 300,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpC2LfX3IuyBIPtezJkZ0",
    stripeProductId: "prod_TzMYb3LIL5kiZ5",
  },

  // ── Groomer Plans ──
  {
    id: 10,
    name: "Groomer Starter",
    description: "Up to 80 grooms/month with 240 portrait credits. Perfect for small grooming shops.",
    priceMonthly: 4900,
    vertical: "groomer",
    unitType: "grooms",
    unitLimit: 80,
    monthlyPortraitCredits: 240,
    overagePriceCents: 800, // $8 per 10 credits
    trialDays: 30,
  },
  {
    id: 11,
    name: "Groomer Growth",
    description: "Up to 160 grooms/month with 480 portrait credits. Ideal for busy grooming businesses.",
    priceMonthly: 7900,
    vertical: "groomer",
    unitType: "grooms",
    unitLimit: 160,
    monthlyPortraitCredits: 480,
    overagePriceCents: 800,
    trialDays: 30,
  },
  {
    id: 12,
    name: "Groomer Pro",
    description: "Up to 240 grooms/month with 720 portrait credits. Built for high-volume grooming operations.",
    priceMonthly: 14900,
    vertical: "groomer",
    unitType: "grooms",
    unitLimit: 240,
    monthlyPortraitCredits: 720,
    overagePriceCents: 800,
    trialDays: 30,
  },

  // ── Daycare Plans ──
  {
    id: 13,
    name: "Daycare Starter",
    description: "Up to 25 dogs in program with 200 portrait credits. Great for small daycares.",
    priceMonthly: 5900,
    vertical: "daycare",
    unitType: "dogs_in_program",
    unitLimit: 25,
    monthlyPortraitCredits: 200,
    overagePriceCents: 800,
    trialDays: 30,
  },
  {
    id: 14,
    name: "Daycare Growth",
    description: "Up to 75 dogs in program with 600 portrait credits. For mid-size daycares.",
    priceMonthly: 11900,
    vertical: "daycare",
    unitType: "dogs_in_program",
    unitLimit: 75,
    monthlyPortraitCredits: 600,
    overagePriceCents: 800,
    trialDays: 30,
  },
  {
    id: 15,
    name: "Daycare Pro",
    description: "Up to 150 dogs in program with 1,200 portrait credits. Built for large daycares.",
    priceMonthly: 24900,
    vertical: "daycare",
    unitType: "dogs_in_program",
    unitLimit: 150,
    monthlyPortraitCredits: 1200,
    overagePriceCents: 800,
    trialDays: 30,
  },

  // ── Boarding Plans ──
  {
    id: 16,
    name: "Boarding Starter",
    description: "Up to 50 dogs boarded/month with 350 portrait credits. Perfect for small boarding facilities.",
    priceMonthly: 5900,
    vertical: "boarding",
    unitType: "dogs_boarded",
    unitLimit: 50,
    monthlyPortraitCredits: 350,
    overagePriceCents: 800,
    trialDays: 30,
  },
  {
    id: 17,
    name: "Boarding Growth",
    description: "Up to 200 dogs boarded/month with 1,500 portrait credits. For mid-size boarding facilities.",
    priceMonthly: 14900,
    vertical: "boarding",
    unitType: "dogs_boarded",
    unitLimit: 200,
    monthlyPortraitCredits: 1500,
    overagePriceCents: 800,
    trialDays: 30,
  },
  {
    id: 18,
    name: "Boarding Pro",
    description: "Up to 500 dogs boarded/month with 3,500 portrait credits. Built for large boarding operations.",
    priceMonthly: 27900,
    vertical: "boarding",
    unitType: "dogs_boarded",
    unitLimit: 500,
    monthlyPortraitCredits: 3500,
    overagePriceCents: 800,
    trialDays: 30,
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

        // Pros columns on organizations
        await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_type TEXT');
        await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS capture_mode TEXT');
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'receipt'");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_mode TEXT DEFAULT 'both'");
        console.log('[migration] Pros org columns ready');

        // Merch orders table
        await pool.query(`CREATE TABLE IF NOT EXISTS merch_orders (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          dog_id INTEGER REFERENCES dogs(id),
          portrait_id INTEGER REFERENCES portraits(id),
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          customer_phone TEXT,
          shipping_street TEXT NOT NULL,
          shipping_city TEXT NOT NULL,
          shipping_state TEXT NOT NULL,
          shipping_zip TEXT NOT NULL,
          shipping_country TEXT NOT NULL DEFAULT 'US',
          printful_order_id TEXT,
          printful_status TEXT,
          stripe_payment_intent_id TEXT,
          total_cents INTEGER NOT NULL,
          shipping_cents INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        // Merch order items table
        await pool.query(`CREATE TABLE IF NOT EXISTS merch_order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES merch_orders(id) ON DELETE CASCADE,
          product_key TEXT NOT NULL,
          variant_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          price_cents INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        // Card occasion + artwork columns on merch_order_items
        await pool.query('ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS occasion TEXT');
        await pool.query('ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS artwork_url TEXT');
        console.log('[migration] Merch order items card columns ready');

        // Customer sessions table (QR/short link for ordering)
        await pool.query(`CREATE TABLE IF NOT EXISTS customer_sessions (
          id SERIAL PRIMARY KEY,
          token VARCHAR(8) NOT NULL UNIQUE,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          dog_id INTEGER NOT NULL REFERENCES dogs(id),
          portrait_id INTEGER NOT NULL REFERENCES portraits(id),
          pack_type TEXT,
          customer_phone TEXT,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        // Batch sessions table
        await pool.query(`CREATE TABLE IF NOT EXISTS batch_sessions (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          staff_user_id VARCHAR,
          status TEXT NOT NULL DEFAULT 'uploading',
          photo_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        // Batch photos table
        await pool.query(`CREATE TABLE IF NOT EXISTS batch_photos (
          id SERIAL PRIMARY KEY,
          batch_session_id INTEGER NOT NULL REFERENCES batch_sessions(id) ON DELETE CASCADE,
          photo_url TEXT NOT NULL,
          dog_id INTEGER REFERENCES dogs(id),
          assigned_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        // Dogs table — owner contact + pet code columns (Pros edition workflow)
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS owner_email TEXT');
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS owner_phone TEXT');
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS pet_code VARCHAR(10)');

        // Dogs table — daycare/boarding vertical fields
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS visit_frequency TEXT'); // daily, several_weekly, weekly, occasional
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS update_preference TEXT'); // weekly, biweekly
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS stay_nights INTEGER'); // boarding stay length
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS next_portrait_date TEXT'); // YYYY-MM-DD auto-rotation
        await pool.query('ALTER TABLE dogs ADD COLUMN IF NOT EXISTS last_portrait_style_id INTEGER'); // never-repeat tracking
        console.log('[migration] Dog vertical fields ready');

        // Subscription plans — vertical-specific columns
        await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS vertical TEXT');
        await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS unit_type TEXT');
        await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS unit_limit INTEGER');
        console.log('[migration] Subscription plan vertical columns ready');

        // Stripe live-mode columns (separate from test-mode price/product IDs)
        await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_live_price_id TEXT');
        await pool.query('ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_live_id TEXT');
        console.log('[migration] Stripe live-mode columns ready');

        // Daily pack selections table (species-separated: one pack per org per date per species)
        await pool.query(`CREATE TABLE IF NOT EXISTS daily_pack_selections (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          species TEXT NOT NULL DEFAULT 'dog',
          pack_type TEXT NOT NULL,
          selected_by VARCHAR,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        // Add species column if table already exists without it
        await pool.query(`ALTER TABLE daily_pack_selections ADD COLUMN IF NOT EXISTS species TEXT NOT NULL DEFAULT 'dog'`);
        // Drop old unique constraint (org_id, date) and add new one (org_id, date, species)
        await pool.query(`
          DO $$ BEGIN
            IF EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'daily_pack_selections_organization_id_date_key'
            ) THEN
              ALTER TABLE daily_pack_selections DROP CONSTRAINT daily_pack_selections_organization_id_date_key;
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'daily_pack_selections_org_date_species_key'
            ) THEN
              ALTER TABLE daily_pack_selections ADD CONSTRAINT daily_pack_selections_org_date_species_key UNIQUE (organization_id, date, species);
            END IF;
          END $$;
        `);

        // Visit photos table (multi-photo per visit)
        await pool.query(`CREATE TABLE IF NOT EXISTS visit_photos (
          id SERIAL PRIMARY KEY,
          dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          photo_url TEXT NOT NULL,
          visit_date TEXT NOT NULL,
          caption TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_visit_photos_dog_date ON visit_photos (dog_id, visit_date)`);

        console.log('[migration] Pros tables ready');
      })(),
      migTimeout,
    ]);
  } catch (migErr: any) {
    console.log('[migration] Pros migrations:', migErr.message);
  }

  // Migration: add consent columns to users table
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP');
    console.log('[migration] consent columns ready');
  } catch (migErr: any) {
    console.log('[migration] consent columns:', migErr.message);
  }

  await seedSubscriptionPlans();

  // Ensure Stripe products/prices exist for all vertical plans (idempotent)
  try {
    const { stripeService } = await import('./stripeService');
    await stripeService.ensureVerticalPlanProducts(true);
  } catch (err: any) {
    console.error('[stripe] Test product setup:', err.message);
  }
  try {
    const { stripeService } = await import('./stripeService');
    await stripeService.ensureVerticalPlanProducts(false);
  } catch (err: any) {
    console.error('[stripe] Live product setup:', err.message);
  }

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
      await db.insert(subscriptionPlans).values(plan as any).onConflictDoNothing();
      inserted++;
    } else {
      const updateData: Record<string, any> = {};
      if (existing.priceMonthly !== plan.priceMonthly) updateData.priceMonthly = plan.priceMonthly;
      if ((existing as any).dogsLimit !== (plan as any).dogsLimit) updateData.dogsLimit = (plan as any).dogsLimit;
      if (existing.monthlyPortraitCredits !== plan.monthlyPortraitCredits) updateData.monthlyPortraitCredits = plan.monthlyPortraitCredits;
      if (existing.overagePriceCents !== plan.overagePriceCents) updateData.overagePriceCents = plan.overagePriceCents;
      if (existing.trialDays !== plan.trialDays) updateData.trialDays = plan.trialDays;
      if ((plan as any).stripePriceId && existing.stripePriceId !== (plan as any).stripePriceId) updateData.stripePriceId = (plan as any).stripePriceId;
      if ((plan as any).stripeProductId && existing.stripeProductId !== (plan as any).stripeProductId) updateData.stripeProductId = (plan as any).stripeProductId;
      if (existing.description !== plan.description) updateData.description = plan.description;
      if (existing.name !== plan.name) updateData.name = plan.name;
      if ((existing as any).vertical !== (plan as any).vertical) updateData.vertical = (plan as any).vertical;
      if ((existing as any).unitType !== (plan as any).unitType) updateData.unitType = (plan as any).unitType;
      if ((existing as any).unitLimit !== (plan as any).unitLimit) updateData.unitLimit = (plan as any).unitLimit;
      if ((existing as any).isActive !== (plan as any).isActive && (plan as any).isActive !== undefined) updateData.isActive = (plan as any).isActive;
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
