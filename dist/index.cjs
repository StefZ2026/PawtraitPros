"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/models/auth.ts
var import_drizzle_orm, import_pg_core, users;
var init_auth = __esm({
  "shared/models/auth.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_pg_core = require("drizzle-orm/pg-core");
    users = (0, import_pg_core.pgTable)("users", {
      id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
      email: (0, import_pg_core.varchar)("email").unique(),
      firstName: (0, import_pg_core.varchar)("first_name"),
      lastName: (0, import_pg_core.varchar)("last_name"),
      profileImageUrl: (0, import_pg_core.varchar)("profile_image_url"),
      termsAcceptedAt: (0, import_pg_core.timestamp)("terms_accepted_at"),
      privacyAcceptedAt: (0, import_pg_core.timestamp)("privacy_accepted_at"),
      createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
    });
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  batchPhotos: () => batchPhotos,
  batchSessions: () => batchSessions,
  customerSessions: () => customerSessions,
  dailyPackSelections: () => dailyPackSelections,
  dogs: () => dogs,
  insertBatchPhotoSchema: () => insertBatchPhotoSchema,
  insertBatchSessionSchema: () => insertBatchSessionSchema,
  insertCustomerSessionSchema: () => insertCustomerSessionSchema,
  insertDailyPackSelectionSchema: () => insertDailyPackSelectionSchema,
  insertDogSchema: () => insertDogSchema,
  insertMerchOrderItemSchema: () => insertMerchOrderItemSchema,
  insertMerchOrderSchema: () => insertMerchOrderSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPortraitSchema: () => insertPortraitSchema,
  insertPortraitStyleSchema: () => insertPortraitStyleSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertVisitPhotoSchema: () => insertVisitPhotoSchema,
  merchOrderItems: () => merchOrderItems,
  merchOrders: () => merchOrders,
  organizations: () => organizations,
  portraitStyles: () => portraitStyles,
  portraits: () => portraits,
  subscriptionPlans: () => subscriptionPlans,
  users: () => users,
  visitPhotos: () => visitPhotos
});
var import_drizzle_orm2, import_pg_core2, import_drizzle_zod, subscriptionPlans, organizations, dogs, portraitStyles, portraits, merchOrders, merchOrderItems, customerSessions, batchSessions, batchPhotos, dailyPackSelections, visitPhotos, insertSubscriptionPlanSchema, insertOrganizationSchema, insertDogSchema, insertPortraitStyleSchema, insertPortraitSchema, insertMerchOrderSchema, insertMerchOrderItemSchema, insertCustomerSessionSchema, insertBatchSessionSchema, insertBatchPhotoSchema, insertDailyPackSelectionSchema, insertVisitPhotoSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_drizzle_orm2 = require("drizzle-orm");
    import_pg_core2 = require("drizzle-orm/pg-core");
    import_drizzle_zod = require("drizzle-zod");
    init_auth();
    subscriptionPlans = (0, import_pg_core2.pgTable)("subscription_plans", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      name: (0, import_pg_core2.text)("name").notNull(),
      description: (0, import_pg_core2.text)("description"),
      priceMonthly: (0, import_pg_core2.integer)("price_monthly").notNull(),
      // in cents
      vertical: (0, import_pg_core2.text)("vertical"),
      // "groomer" | "boarding" | "daycare" | null (null = legacy/generic)
      unitType: (0, import_pg_core2.text)("unit_type"),
      // "grooms" | "dogs_in_program" | "dogs_boarded" — what the limit measures
      unitLimit: (0, import_pg_core2.integer)("unit_limit"),
      // max units per month (80 grooms, 25 dogs, 50 boardings, etc.)
      dogsLimit: (0, import_pg_core2.integer)("dogs_limit"),
      // max active pets allowed (legacy, kept for backward compat)
      monthlyPortraitCredits: (0, import_pg_core2.integer)("monthly_portrait_credits").default(45),
      // portrait generations per month (edits are free)
      overagePriceCents: (0, import_pg_core2.integer)("overage_price_cents").default(400),
      // cost per additional portrait beyond credits
      trialDays: (0, import_pg_core2.integer)("trial_days").default(0),
      // trial period in days
      stripeProductId: (0, import_pg_core2.text)("stripe_product_id"),
      stripePriceId: (0, import_pg_core2.text)("stripe_price_id"),
      stripeLivePriceId: (0, import_pg_core2.text)("stripe_live_price_id"),
      stripeProductLiveId: (0, import_pg_core2.text)("stripe_product_live_id"),
      isActive: (0, import_pg_core2.boolean)("is_active").default(true).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    organizations = (0, import_pg_core2.pgTable)("organizations", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      name: (0, import_pg_core2.text)("name").notNull(),
      slug: (0, import_pg_core2.text)("slug").notNull().unique(),
      description: (0, import_pg_core2.text)("description"),
      websiteUrl: (0, import_pg_core2.text)("website_url"),
      logoUrl: (0, import_pg_core2.text)("logo_url"),
      contactName: (0, import_pg_core2.text)("contact_name"),
      contactEmail: (0, import_pg_core2.text)("contact_email"),
      contactPhone: (0, import_pg_core2.text)("contact_phone"),
      socialFacebook: (0, import_pg_core2.text)("social_facebook"),
      socialInstagram: (0, import_pg_core2.text)("social_instagram"),
      socialTwitter: (0, import_pg_core2.text)("social_twitter"),
      socialNextdoor: (0, import_pg_core2.text)("social_nextdoor"),
      billingStreet: (0, import_pg_core2.text)("billing_street"),
      billingCity: (0, import_pg_core2.text)("billing_city"),
      billingState: (0, import_pg_core2.text)("billing_state"),
      billingZip: (0, import_pg_core2.text)("billing_zip"),
      billingCountry: (0, import_pg_core2.text)("billing_country"),
      locationStreet: (0, import_pg_core2.text)("location_street"),
      locationCity: (0, import_pg_core2.text)("location_city"),
      locationState: (0, import_pg_core2.text)("location_state"),
      locationZip: (0, import_pg_core2.text)("location_zip"),
      locationCountry: (0, import_pg_core2.text)("location_country"),
      notes: (0, import_pg_core2.text)("notes"),
      industryType: (0, import_pg_core2.text)("industry_type"),
      // "groomer" | "boarding" | "daycare"
      captureMode: (0, import_pg_core2.text)("capture_mode"),
      // "hero" | "batch" — hero=single photo, batch=multi-upload
      deliveryMode: (0, import_pg_core2.text)("delivery_mode").default("receipt"),
      // "receipt" | "receipt_sms" | "receipt_sms_pod"
      notificationMode: (0, import_pg_core2.text)("notification_mode").default("both"),
      // "sms" | "email" | "both" — how customers are notified at departure
      speciesHandled: (0, import_pg_core2.text)("species_handled"),
      // dogs, cats, both — must be explicitly chosen during onboarding
      onboardingCompleted: (0, import_pg_core2.boolean)("onboarding_completed").default(false).notNull(),
      isActive: (0, import_pg_core2.boolean)("is_active").default(true).notNull(),
      ownerId: (0, import_pg_core2.varchar)("owner_id"),
      // References users.id (the org owner) — nullable for admin-created or unowned orgs
      planId: (0, import_pg_core2.integer)("plan_id").references(() => subscriptionPlans.id),
      stripeCustomerId: (0, import_pg_core2.text)("stripe_customer_id"),
      stripeSubscriptionId: (0, import_pg_core2.text)("stripe_subscription_id"),
      // stripeTestMode is managed via raw SQL (added by migration in seed.ts)
      // Read via storage.getOrganization which adds it, defaults to false (live mode)
      subscriptionStatus: (0, import_pg_core2.text)("subscription_status").default("trial"),
      // trial, active, past_due, canceled
      trialEndsAt: (0, import_pg_core2.timestamp)("trial_ends_at"),
      hasUsedFreeTrial: (0, import_pg_core2.boolean)("has_used_free_trial").default(false).notNull(),
      portraitsUsedThisMonth: (0, import_pg_core2.integer)("portraits_used_this_month").default(0).notNull(),
      additionalPetSlots: (0, import_pg_core2.integer)("additional_pet_slots").default(0).notNull(),
      pendingPlanId: (0, import_pg_core2.integer)("pending_plan_id"),
      billingCycleStart: (0, import_pg_core2.timestamp)("billing_cycle_start"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    dogs = (0, import_pg_core2.pgTable)("dogs", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      name: (0, import_pg_core2.text)("name").notNull(),
      species: (0, import_pg_core2.text)("species").default("dog").notNull(),
      // dog or cat
      breed: (0, import_pg_core2.text)("breed"),
      age: (0, import_pg_core2.text)("age"),
      description: (0, import_pg_core2.text)("description"),
      originalPhotoUrl: (0, import_pg_core2.text)("original_photo_url"),
      adoptionUrl: (0, import_pg_core2.text)("adoption_url"),
      // Legacy field; Pros uses ownerEmail/ownerPhone instead
      ownerEmail: (0, import_pg_core2.text)("owner_email"),
      // pet owner's email (Pros only)
      ownerPhone: (0, import_pg_core2.text)("owner_phone"),
      // pet owner's phone (Pros only)
      petCode: (0, import_pg_core2.varchar)("pet_code", { length: 10 }),
      // short lookup code e.g. "BEL-2847"
      checkedInAt: (0, import_pg_core2.text)("checked_in_at"),
      // YYYY-MM-DD — date the pet was checked in for today's workflow
      visitFrequency: (0, import_pg_core2.text)("visit_frequency"),
      // "daily" | "several_weekly" | "weekly" | "occasional" (daycare)
      updatePreference: (0, import_pg_core2.text)("update_preference"),
      // "weekly" | "biweekly" | null (daycare — how often owner gets portrait updates)
      stayNights: (0, import_pg_core2.integer)("stay_nights"),
      // number of nights for boarding stay
      nextPortraitDate: (0, import_pg_core2.text)("next_portrait_date"),
      // YYYY-MM-DD — when this dog is next due for auto-rotation
      lastPortraitStyleId: (0, import_pg_core2.integer)("last_portrait_style_id"),
      // track last style used for never-repeat logic
      isAvailable: (0, import_pg_core2.boolean)("is_available").default(true).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    portraitStyles = (0, import_pg_core2.pgTable)("portrait_styles", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      name: (0, import_pg_core2.text)("name").notNull(),
      description: (0, import_pg_core2.text)("description").notNull(),
      promptTemplate: (0, import_pg_core2.text)("prompt_template").notNull(),
      previewImageUrl: (0, import_pg_core2.text)("preview_image_url"),
      category: (0, import_pg_core2.text)("category").notNull()
    });
    portraits = (0, import_pg_core2.pgTable)("portraits", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      dogId: (0, import_pg_core2.integer)("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
      styleId: (0, import_pg_core2.integer)("style_id").notNull().references(() => portraitStyles.id),
      generatedImageUrl: (0, import_pg_core2.text)("generated_image_url"),
      previousImageUrl: (0, import_pg_core2.text)("previous_image_url"),
      isSelected: (0, import_pg_core2.boolean)("is_selected").default(false).notNull(),
      editCount: (0, import_pg_core2.integer)("edit_count").default(0).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    merchOrders = (0, import_pg_core2.pgTable)("merch_orders", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      dogId: (0, import_pg_core2.integer)("dog_id").references(() => dogs.id),
      portraitId: (0, import_pg_core2.integer)("portrait_id").references(() => portraits.id),
      customerName: (0, import_pg_core2.text)("customer_name").notNull(),
      customerEmail: (0, import_pg_core2.text)("customer_email"),
      customerPhone: (0, import_pg_core2.text)("customer_phone"),
      shippingStreet: (0, import_pg_core2.text)("shipping_street").notNull(),
      shippingCity: (0, import_pg_core2.text)("shipping_city").notNull(),
      shippingState: (0, import_pg_core2.text)("shipping_state").notNull(),
      shippingZip: (0, import_pg_core2.text)("shipping_zip").notNull(),
      shippingCountry: (0, import_pg_core2.text)("shipping_country").default("US").notNull(),
      printfulOrderId: (0, import_pg_core2.text)("printful_order_id"),
      printfulStatus: (0, import_pg_core2.text)("printful_status"),
      // synced from Printful webhooks
      stripePaymentIntentId: (0, import_pg_core2.text)("stripe_payment_intent_id"),
      totalCents: (0, import_pg_core2.integer)("total_cents").notNull(),
      shippingCents: (0, import_pg_core2.integer)("shipping_cents").default(0).notNull(),
      status: (0, import_pg_core2.text)("status").default("pending").notNull(),
      // pending, paid, submitted, fulfilled, shipped, failed
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    merchOrderItems = (0, import_pg_core2.pgTable)("merch_order_items", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      orderId: (0, import_pg_core2.integer)("order_id").notNull().references(() => merchOrders.id, { onDelete: "cascade" }),
      productKey: (0, import_pg_core2.text)("product_key").notNull(),
      // maps to PRINTFUL_PRODUCTS key
      variantId: (0, import_pg_core2.integer)("variant_id").notNull(),
      // Printful variant ID
      quantity: (0, import_pg_core2.integer)("quantity").default(1).notNull(),
      priceCents: (0, import_pg_core2.integer)("price_cents").notNull(),
      occasion: (0, import_pg_core2.text)("occasion"),
      // card occasion ID: "birthday", "valentines", etc.
      artworkUrl: (0, import_pg_core2.text)("artwork_url"),
      // public URL of generated card artwork
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    customerSessions = (0, import_pg_core2.pgTable)("customer_sessions", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      token: (0, import_pg_core2.varchar)("token", { length: 8 }).notNull().unique(),
      // short code for URL
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      dogId: (0, import_pg_core2.integer)("dog_id").notNull().references(() => dogs.id),
      portraitId: (0, import_pg_core2.integer)("portrait_id").notNull().references(() => portraits.id),
      packType: (0, import_pg_core2.text)("pack_type"),
      // "celebrate" | "fun" | "artistic"
      customerPhone: (0, import_pg_core2.text)("customer_phone"),
      expiresAt: (0, import_pg_core2.timestamp)("expires_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    batchSessions = (0, import_pg_core2.pgTable)("batch_sessions", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      staffUserId: (0, import_pg_core2.varchar)("staff_user_id"),
      status: (0, import_pg_core2.text)("status").default("uploading").notNull(),
      // uploading, assigning, generating, complete
      photoCount: (0, import_pg_core2.integer)("photo_count").default(0).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    batchPhotos = (0, import_pg_core2.pgTable)("batch_photos", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      batchSessionId: (0, import_pg_core2.integer)("batch_session_id").notNull().references(() => batchSessions.id, { onDelete: "cascade" }),
      photoUrl: (0, import_pg_core2.text)("photo_url").notNull(),
      // base64 data URI
      dogId: (0, import_pg_core2.integer)("dog_id").references(() => dogs.id),
      // null until assigned
      assignedAt: (0, import_pg_core2.timestamp)("assigned_at"),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    dailyPackSelections = (0, import_pg_core2.pgTable)("daily_pack_selections", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      date: (0, import_pg_core2.text)("date").notNull(),
      // YYYY-MM-DD format (text to avoid timezone issues)
      species: (0, import_pg_core2.text)("species").default("dog").notNull(),
      // "dog" | "cat"
      packType: (0, import_pg_core2.text)("pack_type").notNull(),
      // "celebrate" | "fun" | "artistic"
      selectedBy: (0, import_pg_core2.varchar)("selected_by"),
      // staff userId who selected
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    visitPhotos = (0, import_pg_core2.pgTable)("visit_photos", {
      id: (0, import_pg_core2.serial)("id").primaryKey(),
      dogId: (0, import_pg_core2.integer)("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
      organizationId: (0, import_pg_core2.integer)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
      photoUrl: (0, import_pg_core2.text)("photo_url").notNull(),
      // Supabase Storage HTTPS URL (NOT base64)
      visitDate: (0, import_pg_core2.text)("visit_date").notNull(),
      // YYYY-MM-DD
      caption: (0, import_pg_core2.text)("caption"),
      // optional staff note
      sortOrder: (0, import_pg_core2.integer)("sort_order").default(0).notNull(),
      createdAt: (0, import_pg_core2.timestamp)("created_at").default(import_drizzle_orm2.sql`CURRENT_TIMESTAMP`).notNull()
    });
    insertSubscriptionPlanSchema = (0, import_drizzle_zod.createInsertSchema)(subscriptionPlans).omit({
      id: true,
      createdAt: true
    });
    insertOrganizationSchema = (0, import_drizzle_zod.createInsertSchema)(organizations).omit({
      id: true,
      createdAt: true
    });
    insertDogSchema = (0, import_drizzle_zod.createInsertSchema)(dogs).omit({
      id: true,
      createdAt: true
    });
    insertPortraitStyleSchema = (0, import_drizzle_zod.createInsertSchema)(portraitStyles).omit({
      id: true
    });
    insertPortraitSchema = (0, import_drizzle_zod.createInsertSchema)(portraits).omit({
      id: true,
      createdAt: true
    });
    insertMerchOrderSchema = (0, import_drizzle_zod.createInsertSchema)(merchOrders).omit({
      id: true,
      createdAt: true
    });
    insertMerchOrderItemSchema = (0, import_drizzle_zod.createInsertSchema)(merchOrderItems).omit({
      id: true,
      createdAt: true
    });
    insertCustomerSessionSchema = (0, import_drizzle_zod.createInsertSchema)(customerSessions).omit({
      id: true,
      createdAt: true
    });
    insertBatchSessionSchema = (0, import_drizzle_zod.createInsertSchema)(batchSessions).omit({
      id: true,
      createdAt: true
    });
    insertBatchPhotoSchema = (0, import_drizzle_zod.createInsertSchema)(batchPhotos).omit({
      id: true,
      createdAt: true
    });
    insertDailyPackSelectionSchema = (0, import_drizzle_zod.createInsertSchema)(dailyPackSelections).omit({
      id: true,
      createdAt: true
    });
    insertVisitPhotoSchema = (0, import_drizzle_zod.createInsertSchema)(visitPhotos).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
function parseDbUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1) || "postgres"
    };
  } catch {
    return { connectionString: url };
  }
}
var import_pg, import_node_postgres, dbConfig, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_pg = require("pg");
    import_node_postgres = require("drizzle-orm/node-postgres");
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    dbConfig = parseDbUrl(process.env.DATABASE_URL);
    pool = new import_pg.Pool({
      ...dbConfig,
      ssl: { rejectUnauthorized: false }
    });
    db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  }
});

// server/storage.ts
var import_drizzle_orm4, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    import_drizzle_orm4 = require("drizzle-orm");
    init_schema();
    init_auth();
    DatabaseStorage = class {
      // Users
      async getUser(id) {
        const [user] = await db.select().from(users).where((0, import_drizzle_orm4.eq)(users.id, id));
        return user;
      }
      async getAllUsers() {
        return db.select().from(users);
      }
      // Subscription Plans
      async getSubscriptionPlan(id) {
        const [plan] = await db.select().from(subscriptionPlans).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, id));
        return plan;
      }
      async getAllSubscriptionPlans() {
        return db.select().from(subscriptionPlans).where((0, import_drizzle_orm4.eq)(subscriptionPlans.isActive, true));
      }
      async updateSubscriptionPlan(id, data) {
        await db.update(subscriptionPlans).set(data).where((0, import_drizzle_orm4.eq)(subscriptionPlans.id, id));
      }
      // Organizations
      async getOrganization(id) {
        const [org] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.id, id));
        return org;
      }
      async getOrganizationBySlug(slug) {
        const [org] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.slug, slug));
        return org;
      }
      async getOrganizationByOwner(ownerId) {
        const [org] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.ownerId, ownerId));
        return org;
      }
      async getAllOrganizations() {
        return db.select().from(organizations).orderBy((0, import_drizzle_orm4.desc)(organizations.createdAt));
      }
      async createOrganization(org) {
        const [created] = await db.insert(organizations).values(org).returning();
        return created;
      }
      async updateOrganization(id, org) {
        const [updated] = await db.update(organizations).set(org).where((0, import_drizzle_orm4.eq)(organizations.id, id)).returning();
        return updated;
      }
      async updateOrganizationStripeInfo(id, stripeInfo) {
        const { stripeTestMode, ...drizzleFields } = stripeInfo;
        if (Object.keys(drizzleFields).length > 0) {
          await db.update(organizations).set(drizzleFields).where((0, import_drizzle_orm4.eq)(organizations.id, id));
        }
        if (stripeTestMode !== void 0) {
          try {
            await pool.query("UPDATE organizations SET stripe_test_mode = $1 WHERE id = $2", [stripeTestMode, id]);
          } catch (e) {
            console.warn("[stripe] Could not set stripeTestMode:", e.message);
          }
        }
        const [updated] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.id, id));
        return updated;
      }
      async getOrgStripeTestMode(orgId) {
        try {
          const result = await pool.query("SELECT stripe_test_mode FROM organizations WHERE id = $1", [orgId]);
          return result.rows[0]?.stripe_test_mode ?? true;
        } catch {
          return true;
        }
      }
      async clearOrganizationOwner(id) {
        await db.update(organizations).set({ ownerId: null }).where((0, import_drizzle_orm4.eq)(organizations.id, id));
      }
      async deleteOrganization(id) {
        await db.delete(organizations).where((0, import_drizzle_orm4.eq)(organizations.id, id));
      }
      // Dogs
      async getDog(id) {
        const [dog] = await db.select().from(dogs).where((0, import_drizzle_orm4.eq)(dogs.id, id));
        return dog;
      }
      async getDogsByOrganization(orgId) {
        return db.select().from(dogs).where((0, import_drizzle_orm4.eq)(dogs.organizationId, orgId)).orderBy((0, import_drizzle_orm4.desc)(dogs.createdAt));
      }
      async getAllDogs() {
        return db.select().from(dogs).orderBy((0, import_drizzle_orm4.desc)(dogs.createdAt));
      }
      async createDog(dog) {
        const [created] = await db.insert(dogs).values(dog).returning();
        return created;
      }
      async updateDog(id, dog) {
        const [updated] = await db.update(dogs).set(dog).where((0, import_drizzle_orm4.eq)(dogs.id, id)).returning();
        return updated;
      }
      async deleteDog(id) {
        await db.delete(dogs).where((0, import_drizzle_orm4.eq)(dogs.id, id));
      }
      // Portrait Styles
      async getPortraitStyle(id) {
        const [style] = await db.select().from(portraitStyles).where((0, import_drizzle_orm4.eq)(portraitStyles.id, id));
        return style;
      }
      async getAllPortraitStyles() {
        return db.select().from(portraitStyles);
      }
      // Portraits
      async getPortrait(id) {
        const [portrait] = await db.select().from(portraits).where((0, import_drizzle_orm4.eq)(portraits.id, id));
        return portrait;
      }
      async getPortraitByDogAndStyle(dogId, styleId) {
        const [portrait] = await db.select().from(portraits).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(portraits.dogId, dogId), (0, import_drizzle_orm4.eq)(portraits.styleId, styleId)));
        return portrait;
      }
      async getPortraitsByDog(dogId) {
        return db.select().from(portraits).where((0, import_drizzle_orm4.eq)(portraits.dogId, dogId)).orderBy((0, import_drizzle_orm4.desc)(portraits.createdAt));
      }
      async getSelectedPortraitByDog(dogId) {
        const [selected] = await db.select().from(portraits).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(portraits.dogId, dogId), (0, import_drizzle_orm4.eq)(portraits.isSelected, true))).orderBy((0, import_drizzle_orm4.desc)(portraits.createdAt)).limit(1);
        if (selected) return selected;
        const [fallback] = await db.select().from(portraits).where((0, import_drizzle_orm4.eq)(portraits.dogId, dogId)).orderBy((0, import_drizzle_orm4.desc)(portraits.createdAt)).limit(1);
        return fallback;
      }
      async createPortrait(portrait) {
        const [created] = await db.insert(portraits).values(portrait).returning();
        return created;
      }
      async updatePortrait(id, portrait) {
        const [updated] = await db.update(portraits).set(portrait).where((0, import_drizzle_orm4.eq)(portraits.id, id)).returning();
        return updated;
      }
      async selectPortraitForGallery(dogId, portraitId) {
        await db.transaction(async (tx) => {
          await tx.update(portraits).set({ isSelected: false }).where((0, import_drizzle_orm4.eq)(portraits.dogId, dogId));
          await tx.update(portraits).set({ isSelected: true }).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(portraits.id, portraitId), (0, import_drizzle_orm4.eq)(portraits.dogId, dogId)));
        });
      }
      async incrementPortraitEditCount(portraitId) {
        await db.update(portraits).set({ editCount: import_drizzle_orm4.sql`COALESCE(${portraits.editCount}, 0) + 1` }).where((0, import_drizzle_orm4.eq)(portraits.id, portraitId));
      }
      async incrementOrgPortraitsUsed(orgId) {
        await db.update(organizations).set({ portraitsUsedThisMonth: import_drizzle_orm4.sql`COALESCE(${organizations.portraitsUsedThisMonth}, 0) + 1` }).where((0, import_drizzle_orm4.eq)(organizations.id, orgId));
      }
      async getAccurateCreditsUsed(orgId) {
        const [org] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.id, orgId));
        if (!org) return { creditsUsed: 0, billingCycleStart: null };
        const now = /* @__PURE__ */ new Date();
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
        const rows = await db.select({ count: import_drizzle_orm4.sql`count(*)` }).from(portraits).innerJoin(dogs, (0, import_drizzle_orm4.eq)(portraits.dogId, dogs.id)).where(
          (0, import_drizzle_orm4.and)(
            (0, import_drizzle_orm4.eq)(dogs.organizationId, orgId),
            (0, import_drizzle_orm4.gte)(portraits.createdAt, effectiveCycleStart)
          )
        );
        const creditsUsed = Number(rows[0]?.count ?? 0);
        return { creditsUsed, billingCycleStart: effectiveCycleStart };
      }
      async syncOrgCredits(orgId) {
        const { creditsUsed, billingCycleStart } = await this.getAccurateCreditsUsed(orgId);
        const [org] = await db.select().from(organizations).where((0, import_drizzle_orm4.eq)(organizations.id, orgId));
        if (!org) return void 0;
        const updates = {};
        if (org.portraitsUsedThisMonth !== creditsUsed) {
          updates.portraitsUsedThisMonth = creditsUsed;
        }
        if (billingCycleStart && (!org.billingCycleStart || org.billingCycleStart.getTime() !== billingCycleStart.getTime())) {
          updates.billingCycleStart = billingCycleStart;
        }
        if (Object.keys(updates).length > 0) {
          const [updated] = await db.update(organizations).set(updates).where((0, import_drizzle_orm4.eq)(organizations.id, orgId)).returning();
          return updated;
        }
        return org;
      }
      async recalculateAllOrgCredits() {
        const allOrgs = await db.select().from(organizations);
        const results = [];
        for (const org of allOrgs) {
          const { creditsUsed, billingCycleStart } = await this.getAccurateCreditsUsed(org.id);
          const updates = {};
          if (creditsUsed !== org.portraitsUsedThisMonth) {
            updates.portraitsUsedThisMonth = creditsUsed;
          }
          if (billingCycleStart && (!org.billingCycleStart || org.billingCycleStart.getTime() !== billingCycleStart.getTime())) {
            updates.billingCycleStart = billingCycleStart;
          }
          if (Object.keys(updates).length > 0) {
            await db.update(organizations).set(updates).where((0, import_drizzle_orm4.eq)(organizations.id, org.id));
            if (creditsUsed !== org.portraitsUsedThisMonth) {
              results.push({ orgId: org.id, name: org.name, old: org.portraitsUsedThisMonth, new: creditsUsed });
            }
          }
        }
        return results;
      }
      // Visit Photos
      async getVisitPhotos(dogId, visitDate) {
        if (visitDate) {
          return db.select().from(visitPhotos).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(visitPhotos.dogId, dogId), (0, import_drizzle_orm4.eq)(visitPhotos.visitDate, visitDate))).orderBy(visitPhotos.sortOrder);
        }
        return db.select().from(visitPhotos).where((0, import_drizzle_orm4.eq)(visitPhotos.dogId, dogId)).orderBy((0, import_drizzle_orm4.desc)(visitPhotos.createdAt));
      }
      async createVisitPhoto(photo) {
        const [created] = await db.insert(visitPhotos).values(photo).returning();
        return created;
      }
      async deleteVisitPhoto(id) {
        await db.delete(visitPhotos).where((0, import_drizzle_orm4.eq)(visitPhotos.id, id));
      }
      async countVisitPhotosForDate(dogId, visitDate) {
        const rows = await db.select({ count: import_drizzle_orm4.sql`count(*)` }).from(visitPhotos).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(visitPhotos.dogId, dogId), (0, import_drizzle_orm4.eq)(visitPhotos.visitDate, visitDate)));
        return Number(rows[0]?.count ?? 0);
      }
      // Scheduling & Auto-Rotation
      async getDogsDueForPortrait(today) {
        return db.select().from(dogs).where(import_drizzle_orm4.sql`${dogs.nextPortraitDate} IS NOT NULL AND ${dogs.nextPortraitDate} <= ${today}`);
      }
      async getUsedStyleIdsForDog(dogId) {
        const rows = await db.select({ styleId: portraits.styleId }).from(portraits).where((0, import_drizzle_orm4.eq)(portraits.dogId, dogId));
        return [...new Set(rows.map((r) => r.styleId))];
      }
      async advanceNextPortraitDate(dogId, newDate) {
        await db.update(dogs).set({ nextPortraitDate: newDate }).where((0, import_drizzle_orm4.eq)(dogs.id, dogId));
      }
      async repairSequences() {
        const fixes = [];
        const tables = [
          { table: "organizations", seq: "organizations_id_seq" },
          { table: "dogs", seq: "dogs_id_seq" },
          { table: "portraits", seq: "portraits_id_seq" },
          { table: "portrait_styles", seq: "portrait_styles_id_seq" },
          { table: "subscription_plans", seq: "subscription_plans_id_seq" }
        ];
        for (const { table, seq } of tables) {
          await db.execute(import_drizzle_orm4.sql.raw(
            `SELECT setval('${seq}', GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`
          ));
          const maxResult = await db.execute(import_drizzle_orm4.sql.raw(`SELECT MAX(id) as max_id FROM ${table}`));
          const seqResult = await db.execute(import_drizzle_orm4.sql.raw(`SELECT last_value FROM ${seq}`));
          const maxId = Number(maxResult.rows?.[0]?.max_id ?? 0);
          const seqVal = Number(seqResult.rows?.[0]?.last_value ?? 0);
          if (seqVal > 0 && maxId > 0 && seqVal === maxId) {
            fixes.push(`${table}: sequence synced to ${maxId}`);
          }
        }
        return fixes;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/stripeClient.ts
function getStripeClient(testMode) {
  return testMode === false ? liveStripe : testStripe;
}
function getStripePublishableKey(testMode) {
  return testMode === false ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY : process.env.STRIPE_PUBLISHABLE_KEY;
}
function getWebhookSecret(testMode) {
  return testMode === false ? process.env.STRIPE_LIVE_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET;
}
function getPriceId(priceId, testMode) {
  if (testMode === false) return TEST_TO_LIVE_PRICE[priceId] || priceId;
  return priceId;
}
function mapStripeStatusToInternal(stripeStatus, currentStatus) {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return currentStatus || "inactive";
  }
}
var import_stripe, testStripe, liveStripe, TEST_TO_LIVE_PRICE, STRIPE_PLAN_PRICE_MAP;
var init_stripeClient = __esm({
  "server/stripeClient.ts"() {
    "use strict";
    import_stripe = __toESM(require("stripe"), 1);
    testStripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover"
    });
    liveStripe = new import_stripe.default(process.env.STRIPE_LIVE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover"
    });
    TEST_TO_LIVE_PRICE = {
      "price_1T1NpB2LfX3IuyBIb44I2uwq": "price_1SxgIU2LfX3IuyBI3iXCfRn5",
      // Starter $39
      "price_1T1NpC2LfX3IuyBIBj9Mdx3f": "price_1SxgIU2LfX3IuyBIbG1jtLcC",
      // Professional $79
      "price_1T1NpC2LfX3IuyBIPtezJkZ0": "price_1SxgIU2LfX3IuyBIUy4rwplJ"
      // Executive $349
    };
    STRIPE_PLAN_PRICE_MAP = {
      // Test price IDs
      "price_1T1NpB2LfX3IuyBIb44I2uwq": { id: 6, name: "Starter" },
      "price_1T1NpC2LfX3IuyBIBj9Mdx3f": { id: 7, name: "Professional" },
      "price_1T1NpC2LfX3IuyBIPtezJkZ0": { id: 8, name: "Executive" },
      // Live price IDs
      "price_1SxgIU2LfX3IuyBI3iXCfRn5": { id: 6, name: "Starter" },
      "price_1SxgIU2LfX3IuyBIbG1jtLcC": { id: 7, name: "Professional" },
      "price_1SxgIU2LfX3IuyBIUy4rwplJ": { id: 8, name: "Executive" }
    };
  }
});

// server/subscription.ts
function getTrialEndDate(org) {
  if (org.trialEndsAt) return new Date(org.trialEndsAt);
  if (org.createdAt) return new Date(new Date(org.createdAt).getTime() + TRIAL_DURATION_MS);
  return null;
}
function isTrialExpired(org) {
  if (org.subscriptionStatus !== "trial") return false;
  const trialEnd = getTrialEndDate(org);
  return trialEnd ? trialEnd < /* @__PURE__ */ new Date() : false;
}
function isWithinTrialWindow(org) {
  const trialEnd = getTrialEndDate(org);
  return trialEnd ? trialEnd > /* @__PURE__ */ new Date() : false;
}
async function getFreeTrial() {
  const plans = await storage.getAllSubscriptionPlans();
  return plans.find((p) => p.name === "Free Trial");
}
async function revertToFreeTrial(orgId) {
  const freeTrial = await getFreeTrial();
  if (!freeTrial) return false;
  await storage.updateOrganizationStripeInfo(orgId, {
    subscriptionStatus: "trial",
    stripeCustomerId: null,
    stripeSubscriptionId: null
  });
  await storage.updateOrganization(orgId, {
    planId: freeTrial.id,
    additionalPetSlots: 0
  });
  return true;
}
async function handleCancellation(orgId, org) {
  if (isWithinTrialWindow(org)) {
    const reverted = await revertToFreeTrial(orgId);
    if (reverted) return "reverted_to_trial";
  }
  await storage.updateOrganizationStripeInfo(orgId, {
    subscriptionStatus: "canceled",
    stripeCustomerId: null,
    stripeSubscriptionId: null
  });
  await storage.updateOrganization(orgId, {
    additionalPetSlots: 0,
    planId: null
  });
  return "canceled";
}
function canStartFreeTrial(org) {
  if (org.hasUsedFreeTrial) return false;
  if (org.trialEndsAt) return false;
  return true;
}
async function markFreeTrialUsed(orgId) {
  await storage.updateOrganization(orgId, { hasUsedFreeTrial: true });
}
var TRIAL_DURATION_MS;
var init_subscription = __esm({
  "server/subscription.ts"() {
    "use strict";
    init_storage();
    TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1e3;
  }
});

// server/supabase-storage.ts
async function uploadToStorage(base64DataUri, bucket, filename) {
  const match = base64DataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URI");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true"
      },
      body: buffer
    }
  );
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${text2}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}
async function fetchImageAsBuffer(urlOrDataUri) {
  if (urlOrDataUri.startsWith("data:")) {
    const base64Data = urlOrDataUri.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }
  const res = await fetch(urlOrDataUri);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
function isDataUri(value) {
  return value.startsWith("data:");
}
var SUPABASE_URL, SUPABASE_SERVICE_KEY;
var init_supabase_storage = __esm({
  "server/supabase-storage.ts"() {
    "use strict";
    SUPABASE_URL = process.env.SUPABASE_URL;
    SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

// server/routes/helpers.ts
function sanitizeForPrompt(input) {
  return input.replace(/[^\w\s\-'.,:;!?()]/g, "").trim();
}
async function generateUniqueSlug(name, excludeOrgId) {
  let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 10) {
    const existing = await storage.getOrganizationBySlug(slug);
    if (!existing || excludeOrgId && existing.id === excludeOrgId) break;
    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    attempts++;
  }
  return slug;
}
async function validateAndCleanStripeData(orgId) {
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
      if (customer.deleted) {
        console.warn(`[stripe-cleanup] Customer ${validCustomerId} is deleted in Stripe for org ${orgId}, clearing`);
        validCustomerId = null;
        validSubscriptionId = null;
        cleaned = true;
      }
    } catch (err) {
      if (err?.type === "StripeInvalidRequestError" || err?.statusCode === 404 || err?.code === "resource_missing") {
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
      if (sub.status === "canceled" || sub.status === "incomplete_expired") {
        console.warn(`[stripe-cleanup] Subscription ${validSubscriptionId} is ${sub.status} in Stripe for org ${orgId}, clearing`);
        validSubscriptionId = null;
        cleaned = true;
      }
    } catch (err) {
      if (err?.type === "StripeInvalidRequestError" || err?.statusCode === 404 || err?.code === "resource_missing") {
        console.warn(`[stripe-cleanup] Stale subscription ${validSubscriptionId} for org ${orgId}, clearing`);
        validSubscriptionId = null;
        cleaned = true;
      }
    }
  }
  if (cleaned) {
    const stripeUpdate = {
      stripeCustomerId: validCustomerId,
      stripeSubscriptionId: validSubscriptionId
    };
    if (!validSubscriptionId && currentStatus === "active") {
      stripeUpdate.subscriptionStatus = "canceled";
      currentStatus = "canceled";
    }
    await storage.updateOrganizationStripeInfo(orgId, stripeUpdate);
    const orgUpdates = {};
    if (!validSubscriptionId && (org.additionalPetSlots || 0) > 0) {
      orgUpdates.additionalPetSlots = 0;
    }
    if (Object.keys(orgUpdates).length > 0) {
      await storage.updateOrganization(orgId, orgUpdates);
    }
  }
  return { customerId: validCustomerId, subscriptionId: validSubscriptionId, subscriptionStatus: currentStatus, cleaned };
}
function computePetLimitInfo(org, plan, petCount) {
  const basePetLimit = plan?.dogsLimit ?? null;
  const effectivePetLimit = basePetLimit != null ? basePetLimit + (org.additionalPetSlots || 0) : null;
  return {
    petCount,
    petLimit: effectivePetLimit,
    basePetLimit,
    additionalPetSlots: org.additionalPetSlots || 0,
    maxAdditionalSlots: MAX_ADDITIONAL_SLOTS,
    isPaidPlan: plan ? plan.priceMonthly > 0 : false
  };
}
async function checkDogLimit(orgId) {
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
function generatePetCode(name) {
  const prefix = (name || "PET").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const suffix = Math.floor(1e3 + Math.random() * 9e3);
  return `${prefix}-${suffix}`;
}
async function createDogWithPortrait(dogData, orgId, originalPhotoUrl, generatedPortraitUrl, styleId) {
  if (!dogData.petCode) {
    dogData.petCode = generatePetCode(dogData.name);
  }
  let photoUrl = originalPhotoUrl;
  if (photoUrl && isDataUri(photoUrl)) {
    try {
      const fname = `dog-photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      photoUrl = await uploadToStorage(photoUrl, "originals", fname);
    } catch (err) {
      console.error("[storage-upload] Dog photo upload failed, using base64 fallback:", err);
    }
  }
  let portraitUrl = generatedPortraitUrl;
  if (portraitUrl && isDataUri(portraitUrl)) {
    try {
      const fname = `portrait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      portraitUrl = await uploadToStorage(portraitUrl, "portraits", fname);
    } catch (err) {
      console.error("[storage-upload] Portrait upload failed, using base64 fallback:", err);
    }
  }
  const dog = await storage.createDog({
    ...dogData,
    originalPhotoUrl: photoUrl,
    organizationId: orgId
  });
  if (portraitUrl && styleId) {
    const existingPortrait = await storage.getPortraitByDogAndStyle(dog.id, styleId);
    if (!existingPortrait) {
      await storage.createPortrait({
        dogId: dog.id,
        styleId,
        generatedImageUrl: portraitUrl,
        isSelected: true
      });
      await storage.incrementOrgPortraitsUsed(orgId);
    } else {
      await storage.updatePortrait(existingPortrait.id, { generatedImageUrl: portraitUrl });
    }
  }
  return dog;
}
function toPublicOrg(org) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    websiteUrl: org.websiteUrl,
    logoUrl: org.logoUrl,
    isActive: org.isActive,
    createdAt: org.createdAt
  };
}
async function resolveOrgForUser(userId, userEmail, dogId) {
  const userIsAdmin = userEmail === ADMIN_EMAIL;
  if (dogId) {
    const dog = await storage.getDog(dogId);
    if (!dog || !dog.organizationId) {
      return { org: null, error: "Pet not found", status: 404 };
    }
    const org2 = await storage.getOrganization(dog.organizationId);
    if (!org2) {
      return { org: null, error: "Organization not found", status: 404 };
    }
    if (userIsAdmin || org2.ownerId === userId) {
      return { org: org2 };
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
var import_express_rate_limit2, ADMIN_EMAIL, aiRateLimiter, apiRateLimiter, publicExpensiveRateLimiter, MAX_ADDITIONAL_SLOTS, MAX_EDITS_PER_IMAGE, isAdmin;
var init_helpers = __esm({
  "server/routes/helpers.ts"() {
    "use strict";
    import_express_rate_limit2 = __toESM(require("express-rate-limit"), 1);
    init_storage();
    init_stripeClient();
    init_subscription();
    init_supabase_storage();
    ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    aiRateLimiter = (0, import_express_rate_limit2.default)({
      windowMs: 60 * 1e3,
      max: 10,
      message: { error: "Too many requests. Please wait a minute before generating more portraits." },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.user?.claims?.sub || "anonymous",
      validate: { xForwardedForHeader: false }
    });
    apiRateLimiter = (0, import_express_rate_limit2.default)({
      windowMs: 60 * 1e3,
      max: 100,
      message: { error: "Too many requests. Please try again shortly." },
      standardHeaders: true,
      legacyHeaders: false
    });
    publicExpensiveRateLimiter = (0, import_express_rate_limit2.default)({
      windowMs: 60 * 1e3,
      max: 5,
      message: { error: "Too many requests. Please wait before trying again." },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false }
    });
    MAX_ADDITIONAL_SLOTS = 5;
    MAX_EDITS_PER_IMAGE = 4;
    isAdmin = async (req, res, next) => {
      if (!req.user?.claims?.email || req.user.claims.email !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin access required" });
      }
      next();
    };
  }
});

// server/stripeService.ts
var stripeService_exports = {};
__export(stripeService_exports, {
  StripeService: () => StripeService,
  stripeService: () => stripeService
});
function isTestMode(testMode) {
  return testMode !== false;
}
var import_drizzle_orm5, cachedTestAddonPriceId, cachedLiveAddonPriceId, StripeService, stripeService;
var init_stripeService = __esm({
  "server/stripeService.ts"() {
    "use strict";
    init_stripeClient();
    init_db();
    init_schema();
    import_drizzle_orm5 = require("drizzle-orm");
    cachedTestAddonPriceId = null;
    cachedLiveAddonPriceId = null;
    StripeService = class {
      async createCustomer(email, orgId, organizationName, testMode) {
        const stripe = getStripeClient(testMode);
        return await stripe.customers.create({
          email,
          name: organizationName,
          metadata: { orgId: String(orgId), organizationName }
        });
      }
      async retrieveCustomer(customerId, testMode) {
        const stripe = getStripeClient(testMode);
        return await stripe.customers.retrieve(customerId);
      }
      async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, testMode, trialDays, metadata) {
        const stripe = getStripeClient(testMode);
        const effectivePriceId = getPriceId(priceId, testMode);
        const sessionParams = {
          customer: customerId,
          payment_method_types: ["card"],
          line_items: [{ price: effectivePriceId, quantity: 1 }],
          mode: "subscription",
          success_url: successUrl,
          cancel_url: cancelUrl
        };
        if (trialDays && trialDays > 0) {
          sessionParams.subscription_data = {
            trial_period_days: trialDays
          };
        }
        if (metadata) {
          sessionParams.metadata = metadata;
        }
        return await stripe.checkout.sessions.create(sessionParams);
      }
      async createCustomerPortalSession(customerId, returnUrl, testMode) {
        const stripe = getStripeClient(testMode);
        return await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl
        });
      }
      async retrieveCheckoutSession(sessionId, testMode) {
        const stripe = getStripeClient(testMode);
        return await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"]
        });
      }
      async retrieveSubscription(subscriptionId, testMode) {
        const stripe = getStripeClient(testMode);
        return await stripe.subscriptions.retrieve(subscriptionId);
      }
      async getOrCreateAddonPriceId(testMode) {
        const test = isTestMode(testMode);
        const cached = test ? cachedTestAddonPriceId : cachedLiveAddonPriceId;
        if (cached) return cached;
        if (process.env.STRIPE_ADDON_PRICE_ID) {
          const val = process.env.STRIPE_ADDON_PRICE_ID;
          if (test) cachedTestAddonPriceId = val;
          else cachedLiveAddonPriceId = val;
          return val;
        }
        const stripe = getStripeClient(testMode);
        const products = await stripe.products.search({
          query: "metadata['type']:'pet_slot_addon'"
        });
        let product;
        if (products.data.length > 0) {
          product = products.data[0];
        } else {
          product = await stripe.products.create({
            name: "Extra Pet Slot",
            description: "Additional pet slot for your business ($3/month per slot)",
            metadata: { type: "pet_slot_addon" }
          });
        }
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          type: "recurring"
        });
        let price = prices.data.find(
          (p) => p.unit_amount === 300 && p.recurring?.interval === "month"
        );
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: 300,
            currency: "usd",
            recurring: { interval: "month" },
            metadata: { type: "pet_slot_addon" }
          });
        }
        if (test) cachedTestAddonPriceId = price.id;
        else cachedLiveAddonPriceId = price.id;
        return price.id;
      }
      async updateAddonSlots(subscriptionId, quantity, testMode) {
        const stripe = getStripeClient(testMode);
        const addonPriceId = await this.getOrCreateAddonPriceId(testMode);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const existingItem = subscription.items.data.find((item) => {
          const priceId = typeof item.price === "string" ? item.price : item.price?.id;
          return priceId === addonPriceId;
        });
        if (quantity === 0 && existingItem) {
          await stripe.subscriptionItems.del(existingItem.id, {
            proration_behavior: "create_prorations"
          });
        } else if (quantity > 0 && existingItem) {
          await stripe.subscriptionItems.update(existingItem.id, {
            quantity,
            proration_behavior: "create_prorations"
          });
        } else if (quantity > 0 && !existingItem) {
          await stripe.subscriptionItems.create({
            subscription: subscriptionId,
            price: addonPriceId,
            quantity,
            proration_behavior: "create_prorations"
          });
        }
      }
      async removeAddonFromSubscription(subscriptionId, testMode) {
        const stripe = getStripeClient(testMode);
        const addonPriceId = await this.getOrCreateAddonPriceId(testMode);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const existingItem = subscription.items.data.find((item) => {
          const priceId = typeof item.price === "string" ? item.price : item.price?.id;
          return priceId === addonPriceId;
        });
        if (existingItem) {
          await stripe.subscriptionItems.del(existingItem.id, {
            proration_behavior: "create_prorations"
          });
        }
      }
      async getAddonPriceId(testMode) {
        return this.getOrCreateAddonPriceId(testMode);
      }
      async scheduleDowngrade(subscriptionId, newPriceId, testMode) {
        const stripe = getStripeClient(testMode);
        const addonPriceId = await this.getOrCreateAddonPriceId(testMode);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const mainItem = subscription.items.data.find((item) => {
          const priceId = typeof item.price === "string" ? item.price : item.price?.id;
          return priceId !== addonPriceId;
        }) || subscription.items.data[0];
        const effectivePriceId = getPriceId(newPriceId, testMode);
        await stripe.subscriptions.update(subscriptionId, {
          proration_behavior: "none",
          items: [{
            id: mainItem.id,
            price: effectivePriceId
          }],
          cancel_at_period_end: false
        });
        const periodEnd = new Date(subscription.current_period_end * 1e3);
        return { currentPeriodEnd: periodEnd };
      }
      async getSubscriptionPeriodEnd(subscriptionId, testMode) {
        const stripe = getStripeClient(testMode);
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          return new Date(subscription.current_period_end * 1e3);
        } catch {
          return null;
        }
      }
      /**
       * Ensure Stripe products + prices exist for all vertical-specific plans.
       * Idempotent — safe to run on every startup. Only creates what's missing.
       * testMode=true stores in stripePriceId/stripeProductId,
       * testMode=false stores in stripeLivePriceId/stripeProductLiveId.
       */
      async ensureVerticalPlanProducts(testMode) {
        const test = isTestMode(testMode);
        const stripe = getStripeClient(testMode);
        const allPlans = await db.select().from(subscriptionPlans);
        for (const plan of allPlans) {
          if (!plan.vertical) continue;
          if (plan.priceMonthly === 0) continue;
          const existingPrice = test ? plan.stripePriceId : plan.stripeLivePriceId;
          if (existingPrice) continue;
          try {
            const products = await stripe.products.search({
              query: `metadata['prosplanid']:'${plan.id}'`
            });
            let product;
            if (products.data.length > 0) {
              product = products.data[0];
            } else {
              product = await stripe.products.create({
                name: plan.name,
                description: plan.description || `${plan.name} plan`,
                metadata: {
                  prosplanid: String(plan.id),
                  vertical: plan.vertical || "",
                  unitType: plan.unitType || ""
                }
              });
            }
            const prices = await stripe.prices.list({
              product: product.id,
              active: true,
              type: "recurring"
            });
            let price = prices.data.find(
              (p) => p.unit_amount === plan.priceMonthly && p.recurring?.interval === "month"
            );
            if (!price) {
              price = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.priceMonthly,
                currency: "usd",
                recurring: { interval: "month" },
                metadata: { prosplanid: String(plan.id) }
              });
            }
            const updateData = {};
            if (test) {
              updateData.stripePriceId = price.id;
              updateData.stripeProductId = product.id;
            } else {
              updateData.stripeLivePriceId = price.id;
              updateData.stripeProductLiveId = product.id;
            }
            await db.update(subscriptionPlans).set(updateData).where((0, import_drizzle_orm5.eq)(subscriptionPlans.id, plan.id));
            console.log(`[stripe] Ensured ${test ? "test" : "live"} product/price for plan ${plan.id} (${plan.name})`);
          } catch (err) {
            console.error(`[stripe] Error ensuring product for plan ${plan.id}:`, err.message);
          }
        }
      }
    };
    stripeService = new StripeService();
  }
});

// shared/pack-config.ts
function getPacks(species) {
  const packs = species === "dog" ? DOG_PACKS : CAT_PACKS;
  return [packs.celebrate, packs.fun, packs.artistic];
}
function getPackByType(species, packType) {
  const packs = species === "dog" ? DOG_PACKS : CAT_PACKS;
  return packs[packType];
}
var DOG_PACKS, CAT_PACKS;
var init_pack_config = __esm({
  "shared/pack-config.ts"() {
    "use strict";
    DOG_PACKS = {
      celebrate: {
        type: "celebrate",
        name: "Celebrate",
        description: "Seasonal favorites, cozy vibes & celebrations",
        styleIds: [23, 22, 10, 19, 11]
        // Holiday Spirit, Spring Flower Crown, Halloween Pumpkin, Cozy Cabin, Birthday Party
      },
      artistic: {
        type: "artistic",
        name: "Artistic",
        description: "Fine art & classical \u2014 elegant framed keepsakes",
        styleIds: [1, 5, 26, 24, 2, 6]
        // Renaissance Noble, Art Nouveau Beauty, Impressionist Garden, Vintage Classic, Victorian Gentleman, Steampunk Explorer
      },
      fun: {
        type: "fun",
        name: "Fun",
        description: "Costumes, adventures & bold characters",
        styleIds: [14, 12, 17, 29, 30, 31]
        // Superhero, Pirate Captain, Beach Day, Pool Party, Campfire, Sleepover Party
      }
    };
    CAT_PACKS = {
      celebrate: {
        type: "celebrate",
        name: "Celebrate",
        description: "Seasonal favorites, cozy vibes & celebrations",
        styleIds: [112, 113, 114, 104, 111]
        // Halloween Black Cat, Holiday Stocking, Spring Blossoms, Sunbeam Napper, Cozy Blanket
      },
      artistic: {
        type: "artistic",
        name: "Artistic",
        description: "Refined classical portraits & fine art",
        styleIds: [101, 102, 103, 109]
        // Egyptian Royalty, Renaissance Feline, Victorian Lady, Garden Explorer
      },
      fun: {
        type: "fun",
        name: "Fun",
        description: "Playful adventures & quirky characters",
        styleIds: [106, 115, 116, 117, 118, 119]
        // Purrista Barista, Box Inspector, Tea Party Guest, Pool Party, Campfire, Sleepover Party
      }
    };
  }
});

// server/semaphore.ts
var Semaphore;
var init_semaphore = __esm({
  "server/semaphore.ts"() {
    "use strict";
    Semaphore = class {
      constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
      }
      queue = [];
      active = 0;
      async acquire() {
        if (this.active < this.maxConcurrent) {
          this.active++;
          return;
        }
        return new Promise((resolve) => {
          this.queue.push(() => {
            this.active++;
            resolve();
          });
        });
      }
      release() {
        this.active--;
        const next = this.queue.shift();
        if (next) next();
      }
      async run(fn) {
        await this.acquire();
        try {
          return await fn();
        } finally {
          this.release();
        }
      }
    };
  }
});

// server/gemini.ts
function extractImageFromResponse(response) {
  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData
  );
  if (!part?.inlineData?.data) return null;
  const mime = part.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${part.inlineData.data}`;
}
function parseBase64(dataUrl) {
  const data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const mimeType = (dataUrl.match(/data:([^;]+);/) || [])[1] || "image/jpeg";
  return { mimeType, data };
}
function isRetryableError(err) {
  const status = err?.status || err?.httpStatusCode || err?.code;
  if (status === 429 || status === 503) return true;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("resource_exhausted") || msg.includes("rate limit") || msg.includes("overloaded") || msg.includes("unavailable");
}
async function callWithRetry(fn, label) {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const delay = Math.pow(2, attempt + 1) * 1e3 + Math.random() * 1e3;
        console.warn(`[gemini] ${label} attempt ${attempt + 1} failed (${err?.message || err}), retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${label}: all retries exhausted`);
}
async function generateImage(prompt, sourceImage) {
  if (sourceImage) {
    const result = await generateWithImage(prompt, sourceImage);
    if (result) return result;
    throw new Error("Image generation with reference photo returned no result. Please try again.");
  }
  return generateTextOnly(prompt);
}
async function resizeForGemini(dataUri) {
  const { mimeType, data } = parseBase64(dataUri);
  const inputBuffer = Buffer.from(data, "base64");
  const resized = await (0, import_sharp.default)(inputBuffer).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return { mimeType: "image/jpeg", data: resized.toString("base64") };
}
async function generateWithImage(prompt, sourceImage) {
  const { mimeType, data } = await resizeForGemini(sourceImage);
  const enhancedPrompt = FIDELITY_PREFIX + prompt;
  return geminiSemaphore.run(
    () => callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }, { inlineData: { mimeType, data } }] }],
        config: { responseModalities: [import_genai.Modality.TEXT, import_genai.Modality.IMAGE], imageConfig: { imageSize: "2K" } }
      });
      return extractImageFromResponse(response);
    }, "generateWithImage")
  );
}
async function generateTextOnly(prompt) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await geminiSemaphore.run(
      () => callWithRetry(async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseModalities: [import_genai.Modality.TEXT, import_genai.Modality.IMAGE] }
        });
        return extractImageFromResponse(response);
      }, "generateTextOnly")
    );
    if (result) return result;
  }
  throw new Error("Failed to generate image after retries");
}
async function editImage(currentImage, editPrompt) {
  const { mimeType, data } = parseBase64(currentImage);
  return geminiSemaphore.run(
    () => callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data } },
            { text: `Edit this image: ${editPrompt}. Keep the same overall style and subject, just apply the requested modifications.` }
          ]
        }],
        config: { responseModalities: [import_genai.Modality.TEXT, import_genai.Modality.IMAGE] }
      });
      const result = extractImageFromResponse(response);
      if (!result) throw new Error("Failed to edit image");
      return result;
    }, "editImage")
  );
}
var import_genai, import_sharp, ai, geminiSemaphore, FIDELITY_PREFIX;
var init_gemini = __esm({
  "server/gemini.ts"() {
    "use strict";
    import_genai = require("@google/genai");
    import_sharp = __toESM(require("sharp"), 1);
    init_semaphore();
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
    geminiSemaphore = new Semaphore(10);
    FIDELITY_PREFIX = `REFERENCE PHOTO ATTACHED \u2014 YOU MUST DEPICT THIS EXACT ANIMAL.

MANDATORY RULES (violating any rule = total failure):
1. SINGLE ANIMAL ONLY \u2014 depict ONLY the one animal from the reference photo. Never add extra animals, companions, or duplicates to the scene.
2. PHOTO OVERRIDES TEXT \u2014 if the text mentions a breed that doesn't match the photo, depict what you SEE in the photo. The photo is always the sole authority.
3. EXACT COLORS AND PATTERNS \u2014 reproduce each color exactly where it appears on the body. White chest stays white, dark back stays dark, patches stay in the same locations and proportions. Do NOT simplify a multi-colored coat into one uniform tone. Do NOT shift colors to match "typical breed" palettes or scene lighting.
4. PRESERVE UNIQUE FEATURES \u2014 floppy ears stay floppy, perked ears stay perked. If ears are asymmetric (one up, one down; one folded, one straight), keep them asymmetric. Underbites, crooked tails, scars, heterochromia, unusual markings \u2014 reproduce them ALL exactly. Do NOT "fix" or normalize any feature to match breed standard.
5. PRESERVE FACE AND BODY \u2014 match this animal's exact muzzle shape, eye color, ear shape and position, fur texture and length, and body proportions from the photo.
6. PHOTOREALISTIC ANIMAL \u2014 the animal must look like a real, living creature with photorealistic fur, natural eyes, and real anatomy. Apply the artistic style to the scene, costume, and background \u2014 but the animal itself must always look like a genuine photograph of a real animal.

Now apply the following artistic style to this exact animal:

`;
  }
});

// server/routes/sms.ts
function formatPhoneNumber(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  return cleaned.startsWith("+") ? cleaned : cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
}
function isTwilioConfigured() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
  const hasApiKey = !!(process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET);
  return !!(sid && msgSvc && (hasAuthToken || hasApiKey));
}
function isTelnyxConfigured() {
  return !!(process.env.TELNYX_API_KEY && process.env.TELNYX_PHONE_NUMBER);
}
function isSmsConfigured() {
  return isTwilioConfigured() || isTelnyxConfigured();
}
function recordSend(phone) {
  const now = Date.now();
  const timestamps = recentSends.get(phone) || [];
  timestamps.push(now);
  recentSends.set(phone, timestamps.filter((t) => now - t < RATE_WINDOW_MS));
}
function getRecentSendCount(phone) {
  const now = Date.now();
  const timestamps = recentSends.get(phone) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  recentSends.set(phone, recent);
  return recent.length;
}
function getRetryStatus(messageId) {
  return retryQueue.get(messageId);
}
function scheduleRetry(messageId, entry) {
  console.log(`[sms] Carrier rejected ${messageId} to ${entry.phone}, queuing retry ${entry.attempts + 1}/${MAX_RETRY_ATTEMPTS} in 15min`);
  entry.attempts++;
  retryQueue.set(messageId, entry);
  setTimeout(async () => {
    try {
      console.log(`[sms] Retrying ${messageId} to ${entry.phone} (attempt ${entry.attempts})`);
      const result = await sendViaTelnyx(entry.phone, entry.body, entry.mediaUrl);
      if (!result.success || !result.messageId) {
        console.warn(`[sms] Retry send failed for ${messageId}: ${result.error}`);
        if (entry.attempts < MAX_RETRY_ATTEMPTS) {
          scheduleRetry(messageId, entry);
        } else {
          entry.status = "failed";
          entry.lastError = result.error || "All retries exhausted";
          retryQueue.set(messageId, entry);
          console.error(`[sms] All retries exhausted for ${messageId} to ${entry.phone}`);
        }
        return;
      }
      const deliveryStatus = await pollDeliveryStatus(result.messageId);
      if (deliveryStatus === "delivered") {
        entry.status = "delivered";
        retryQueue.set(messageId, entry);
        console.log(`[sms] Retry delivered! ${messageId} to ${entry.phone}`);
      } else if (deliveryStatus === "failed" && entry.attempts < MAX_RETRY_ATTEMPTS) {
        scheduleRetry(messageId, entry);
      } else {
        entry.status = "failed";
        entry.lastError = "Carrier rejected after retry";
        retryQueue.set(messageId, entry);
      }
    } catch (err) {
      console.error(`[sms] Retry error for ${messageId}: ${err.message}`);
      if (entry.attempts < MAX_RETRY_ATTEMPTS) {
        scheduleRetry(messageId, entry);
      } else {
        entry.status = "failed";
        entry.lastError = err.message;
        retryQueue.set(messageId, entry);
      }
    }
  }, RETRY_DELAY_MS);
}
async function pollDeliveryStatus(messageId) {
  const apiKey = process.env.TELNYX_API_KEY;
  const MAX_POLLS = 6;
  const POLL_INTERVAL_MS = 3e3;
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await fetch(`https://api.telnyx.com/v2/messages/${messageId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        console.warn(`[sms] Poll ${i + 1}/${MAX_POLLS} failed: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const status = data.data?.to?.[0]?.status;
      if (status === "delivered") {
        console.log(`[sms] Delivery confirmed for ${messageId} (poll ${i + 1})`);
        return "delivered";
      }
      if (status === "delivery_failed" || status === "sending_failed") {
        const errors = data.data?.errors || [];
        console.warn(`[sms] Delivery failed for ${messageId}: status=${status}, errors=${JSON.stringify(errors)}`);
        return "failed";
      }
      console.log(`[sms] Poll ${i + 1}/${MAX_POLLS} for ${messageId}: status=${status}`);
    } catch (err) {
      console.warn(`[sms] Poll error for ${messageId}: ${err.message}`);
    }
  }
  console.warn(`[sms] Polling timed out for ${messageId} after ${MAX_POLLS} attempts`);
  return "unknown";
}
async function sendViaTelnyx(phone, body, mediaUrl) {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_PHONE_NUMBER;
  const payload = { from, to: phone, text: body };
  if (mediaUrl) {
    payload.media_urls = [mediaUrl];
    payload.type = "MMS";
  }
  const res = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    const detail = err.errors?.[0]?.detail || err.errors?.[0]?.title || "Failed";
    return { success: false, error: `Telnyx: ${detail}`, provider: "telnyx" };
  }
  const data = await res.json();
  const messageId = data.data?.id;
  const status = data.data?.to?.[0]?.status;
  if (status === "delivery_failed") {
    const errDetail = data.data?.errors?.[0]?.detail || "Delivery failed";
    return { success: false, error: `Telnyx: ${errDetail}`, provider: "telnyx", messageId };
  }
  return { success: true, provider: "telnyx", messageId };
}
async function sendViaTwilio(phone, body, mediaUrl) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  let authHeader;
  if (process.env.TWILIO_AUTH_TOKEN) {
    authHeader = `Basic ${Buffer.from(`${twilioSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`;
  } else {
    authHeader = `Basic ${Buffer.from(`${process.env.TWILIO_API_KEY_SID}:${process.env.TWILIO_API_KEY_SECRET}`).toString("base64")}`;
  }
  const params = { To: phone, MessagingServiceSid: twilioMsgSvc, Body: body };
  if (mediaUrl) params.MediaUrl = mediaUrl;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": authHeader
    },
    body: new URLSearchParams(params).toString()
  });
  if (!res.ok) {
    const err = await res.json();
    return { success: false, error: `Twilio: ${err.message || err.code || "Failed"}`, provider: "twilio" };
  }
  return { success: true, provider: "twilio" };
}
async function sendSms(to, body, mediaUrl) {
  const phone = formatPhoneNumber(to);
  const errors = [];
  if (mediaUrl) {
    try {
      const imgBuffer = await fetchImageAsBuffer(mediaUrl);
      const compressed = await (0, import_sharp4.default)(imgBuffer).jpeg({ quality: 75 }).toBuffer();
      const fname = `mms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const dataUri = `data:image/jpeg;base64,${compressed.toString("base64")}`;
      mediaUrl = await uploadToStorage(dataUri, "portraits", fname);
      console.log(`[sms] Compressed ${imgBuffer.length}B -> ${compressed.length}B, uploaded: ${mediaUrl}`);
    } catch (err) {
      console.error(`[sms] Failed to prepare MMS image: ${err.message}`);
      return { success: false, error: `Failed to process portrait image: ${err.message}` };
    }
  }
  const recentCount = getRecentSendCount(phone);
  if (recentCount >= MAX_SENDS_BEFORE_DELAY) {
    console.log(`[sms] ${recentCount} recent sends to ${phone}, queueing with ${DELAY_MS / 6e4}min delay`);
    const queueId = `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { phone, body, mediaUrl, attempts: 0, status: "pending" };
    retryQueue.set(queueId, entry);
    setTimeout(async () => {
      try {
        console.log(`[sms] Sending delayed message ${queueId} to ${phone}`);
        recordSend(phone);
        const result = await sendViaTelnyx(phone, body, mediaUrl);
        if (result.success && result.messageId) {
          const deliveryStatus = await pollDeliveryStatus(result.messageId);
          entry.status = deliveryStatus === "failed" ? "failed" : "delivered";
          if (deliveryStatus === "failed" && entry.attempts < MAX_RETRY_ATTEMPTS) {
            scheduleRetry(queueId, entry);
          }
        } else {
          entry.status = "failed";
          entry.lastError = result.error;
        }
        retryQueue.set(queueId, entry);
      } catch (err) {
        entry.status = "failed";
        entry.lastError = err.message;
        retryQueue.set(queueId, entry);
      }
    }, DELAY_MS);
    return { success: true, queued: true, messageId: queueId };
  }
  recordSend(phone);
  if (isTelnyxConfigured()) {
    try {
      const result = await sendViaTelnyx(phone, body, mediaUrl);
      if (result.success && result.messageId) {
        console.log(`[sms] Accepted by Telnyx: ${result.messageId} to ${phone}${mediaUrl ? " (MMS)" : ""}`);
        const deliveryStatus = await pollDeliveryStatus(result.messageId);
        if (deliveryStatus === "delivered") {
          return { success: true, delivered: true, provider: "telnyx", messageId: result.messageId };
        }
        if (deliveryStatus === "failed") {
          const entry = { phone, body, mediaUrl, attempts: 0, status: "pending" };
          scheduleRetry(result.messageId, entry);
          return { success: false, error: "Carrier rejected the message", retrying: true, messageId: result.messageId, provider: "telnyx" };
        }
        return { success: true, delivered: false, provider: "telnyx", messageId: result.messageId };
      }
      if (result.error) {
        console.warn(`[sms] Telnyx failed: ${result.error}`);
        errors.push(result.error);
      }
    } catch (err) {
      console.warn(`[sms] Telnyx error: ${err.message}`);
      errors.push(`Telnyx: ${err.message}`);
    }
  }
  if (isTwilioConfigured()) {
    try {
      const result = await sendViaTwilio(phone, body, mediaUrl);
      if (result.success) {
        console.log(`[sms] Sent via Twilio to ${phone}${mediaUrl ? " (MMS)" : ""}`);
        return result;
      }
      console.warn(`[sms] Twilio failed: ${result.error}`);
      errors.push(result.error || "Twilio failed");
    } catch (err) {
      console.warn(`[sms] Twilio error: ${err.message}`);
      errors.push(`Twilio: ${err.message}`);
    }
  }
  if (errors.length === 0) {
    return { success: false, error: "No SMS provider configured" };
  }
  return { success: false, error: errors.join("; ") };
}
var import_sharp4, recentSends, RATE_WINDOW_MS, MAX_SENDS_BEFORE_DELAY, DELAY_MS, retryQueue, MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS;
var init_sms = __esm({
  "server/routes/sms.ts"() {
    "use strict";
    import_sharp4 = __toESM(require("sharp"), 1);
    init_supabase_storage();
    recentSends = /* @__PURE__ */ new Map();
    RATE_WINDOW_MS = 60 * 60 * 1e3;
    MAX_SENDS_BEFORE_DELAY = 3;
    DELAY_MS = 10 * 60 * 1e3;
    retryQueue = /* @__PURE__ */ new Map();
    MAX_RETRY_ATTEMPTS = 3;
    RETRY_DELAY_MS = 15 * 60 * 1e3;
    setInterval(() => {
      const retryIds = Array.from(retryQueue.keys());
      for (const id of retryIds) {
        const entry = retryQueue.get(id);
        if (entry.status !== "pending") {
          retryQueue.delete(id);
        }
      }
      const now = Date.now();
      const phones = Array.from(recentSends.keys());
      for (const phone of phones) {
        const timestamps = recentSends.get(phone);
        const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
        if (recent.length === 0) recentSends.delete(phone);
        else recentSends.set(phone, recent);
      }
    }, 30 * 60 * 1e3);
  }
});

// server/routes/email.ts
function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}
async function sendEmail(to, subject, html, attachments, fromName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured" };
  }
  try {
    const emailAddr = process.env.RESEND_FROM_ADDRESS || "noreply@pawtraitpros.com";
    const displayName = fromName || "Pawtrait Pros";
    const payload = {
      from: `${displayName} <${emailAddr}>`,
      to: [to],
      subject,
      html
    };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64")
      }));
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      const message = err?.message || err?.statusCode || "Failed to send email";
      console.error(`[email] Send failed to ${to}:`, message);
      return { success: false, error: String(message) };
    }
    return { success: true };
  } catch (err) {
    console.error(`[email] Error sending to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}
function buildDepartureEmail(orgName, orgLogoUrl, dogName, pawfileUrl, portraitImageUrl, orgId, sourcePhotoUrl) {
  const subject = `${dogName}'s portrait from ${orgName} is ready!`;
  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  const logoSrc = orgLogoUrl?.startsWith("https://") ? orgLogoUrl : orgId ? `${appUrl}/api/organizations/${orgId}/logo` : null;
  const parts = [];
  parts.push(`<div style="font-family:'Libre Baskerville',Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;">`);
  parts.push(`<div style="text-align:center;margin-bottom:20px;">`);
  if (logoSrc) {
    parts.push(`<img src="${logoSrc}" alt="${orgName}" style="max-height:60px;margin-bottom:12px;" /><br/>`);
  }
  parts.push(`<h2 style="color:#1a1a1a;margin:0;">${orgName}</h2></div>`);
  parts.push(`<p style="font-size:16px;color:#333;line-height:1.5;">We created a stunning portrait of <strong>${dogName}</strong> and it's ready for you!</p>`);
  if (portraitImageUrl) {
    parts.push(`<div style="text-align:center;margin:20px 0;"><a href="${pawfileUrl}"><img src="${portraitImageUrl}" alt="${dogName}'s Portrait" style="max-width:380px;width:100%;border-radius:12px;" /></a></div>`);
  }
  if (sourcePhotoUrl) {
    parts.push(`<div style="text-align:center;margin:16px 0 8px;"><p style="font-size:13px;color:#888;font-style:italic;margin:0 0 8px;">Behind the Portrait \u2014 ${dogName} in action</p><img src="${sourcePhotoUrl}" alt="${dogName}" style="max-width:240px;width:60%;border-radius:8px;opacity:0.9;" /></div>`);
  }
  parts.push(`<div style="text-align:center;margin:24px 0;"><a href="${pawfileUrl}" style="display:inline-block;padding:14px 32px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">View & Order a Keepsake</a></div>`);
  parts.push(`<p style="font-size:14px;color:#666;text-align:center;line-height:1.5;">Love it? Order a framed print, mug, tote, or other keepsake featuring ${dogName}.</p>`);
  parts.push(`<p style="font-size:12px;color:#999;text-align:center;margin-top:24px;">Powered by <a href="https://pawtraitpros.com" style="color:#8B5CF6;">Pawtrait Pros</a></p>`);
  parts.push(`</div>`);
  return { subject, html: parts.join("") };
}
function buildOrderConfirmationEmail(orgName, dogName, orderId, totalCents, itemDescriptions) {
  const subject = `Order #${orderId} confirmed \u2014 ${dogName}'s portrait keepsake`;
  const total = (totalCents / 100).toFixed(2);
  const itemsHtml = itemDescriptions.map((desc2) => `<li style="margin-bottom:4px;">${desc2}</li>`).join("");
  const html = `
    <div style="font-family:'Libre Baskerville',Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;">
      <h2 style="color:#1a1a1a;text-align:center;">Order Confirmed!</h2>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Thank you for your order from <strong>${orgName}</strong>!
        Your keepsake${itemDescriptions.length > 1 ? "s" : ""} featuring <strong>${dogName}</strong> will be on the way soon.
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#333;">Order #${orderId}</p>
        <ul style="margin:0;padding-left:20px;color:#555;">
          ${itemsHtml}
        </ul>
        <p style="margin:12px 0 0;font-weight:600;color:#333;">Total: $${total}</p>
      </div>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Your hi-res digital download with ${orgName}'s logo is attached to this email \u2014 it's yours to keep!
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        We'll email you tracking information once your order ships.
      </p>
      <p style="font-size:13px;color:#999;text-align:center;margin-top:32px;">
        Powered by <a href="https://pawtraitpros.com" style="color:#8B5CF6;">Pawtrait Pros</a>
      </p>
    </div>
  `;
  return { subject, html };
}
var init_email = __esm({
  "server/routes/email.ts"() {
    "use strict";
  }
});

// server/routes/delivery.ts
async function deliverPortraitToOwner(dog, org) {
  if (!dog.ownerPhone && !dog.ownerEmail) {
    return { sent: false, error: "No owner contact info" };
  }
  let petCode = dog.petCode;
  if (!petCode) {
    petCode = generatePetCode(dog.name);
    await storage.updateDog(dog.id, { petCode });
  }
  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  const pawfileUrl = `${appUrl}/pawfile/code/${petCode}`;
  const notifMode = org.notificationMode || "both";
  const methods = [];
  let sent = false;
  const portraits2 = await storage.getPortraitsByDog(dog.id);
  const latestPortrait = portraits2.length > 0 ? portraits2[0] : null;
  const portraitImageUrl = latestPortrait?.generatedImageUrl?.startsWith("https://") ? latestPortrait.generatedImageUrl : latestPortrait ? `${appUrl}/api/portraits/${latestPortrait.id}/image` : void 0;
  const sourcePhotoUrl = dog.originalPhotoUrl?.startsWith("https://") ? dog.originalPhotoUrl : void 0;
  if ((notifMode === "sms" || notifMode === "both") && dog.ownerPhone && isSmsConfigured()) {
    try {
      const smsBody = `Hi from ${org.name}! We created a stunning portrait of ${dog.name} and it's ready for you. View it and order a keepsake: ${pawfileUrl}`;
      const smsResult = await sendSms(dog.ownerPhone, smsBody, portraitImageUrl);
      if (smsResult.success) {
        methods.push("sms");
        sent = true;
      } else {
        console.error(`[deliver] SMS failed for ${dog.name}:`, smsResult.error);
      }
    } catch (smsErr) {
      console.error(`[deliver] SMS error:`, smsErr.message);
    }
  }
  if ((notifMode === "email" || notifMode === "both") && dog.ownerEmail && isEmailConfigured()) {
    try {
      const { subject, html } = buildDepartureEmail(
        org.name,
        org.logoUrl,
        dog.name,
        pawfileUrl,
        portraitImageUrl,
        org.id,
        sourcePhotoUrl
      );
      const emailResult = await sendEmail(dog.ownerEmail, subject, html, void 0, org.name);
      if (emailResult.success) {
        methods.push("email");
        sent = true;
      } else {
        console.error(`[deliver] Email failed for ${dog.name}:`, emailResult.error);
      }
    } catch (emailErr) {
      console.error(`[deliver] Email error:`, emailErr.message);
    }
  }
  return sent ? { sent: true, method: methods.join("+") } : { sent: false, method: "link_only", error: "No notification channel available or all failed" };
}
var init_delivery = __esm({
  "server/routes/delivery.ts"() {
    "use strict";
    init_storage();
    init_sms();
    init_email();
    init_helpers();
  }
});

// server/gelato-config.ts
var gelato_config_exports = {};
__export(gelato_config_exports, {
  CARD_DIMENSIONS: () => CARD_DIMENSIONS,
  CARD_OCCASIONS: () => CARD_OCCASIONS,
  GELATO_CARD_FLAT_5x7_PRODUCT_UID: () => GELATO_CARD_FLAT_5x7_PRODUCT_UID,
  GELATO_CARD_FOLDED_5x7_PRODUCT_UID: () => GELATO_CARD_FOLDED_5x7_PRODUCT_UID,
  GELATO_PRODUCTS: () => GELATO_PRODUCTS,
  getAllGelatoProducts: () => getAllGelatoProducts,
  getAllOccasions: () => getAllOccasions,
  getGelatoProduct: () => getGelatoProduct,
  getOccasion: () => getOccasion,
  sortOccasionsForDisplay: () => sortOccasionsForDisplay
});
function getGelatoProduct(key) {
  return GELATO_PRODUCTS[key];
}
function getAllGelatoProducts() {
  return Object.values(GELATO_PRODUCTS);
}
function getOccasion(id) {
  return CARD_OCCASIONS.find((o) => o.id === id);
}
function getAllOccasions() {
  return CARD_OCCASIONS;
}
function sortOccasionsForDisplay(month) {
  return CARD_OCCASIONS.map((o) => ({
    ...o,
    featured: o.seasonalMonths !== null && o.seasonalMonths.includes(month)
  })).sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const aEvergreen = a.seasonalMonths === null;
    const bEvergreen = b.seasonalMonths === null;
    if (aEvergreen && !bEvergreen) return -1;
    if (!aEvergreen && bEvergreen) return 1;
    return a.sortOrder - b.sortOrder;
  });
}
var GELATO_CARD_FLAT_5x7_PRODUCT_UID, GELATO_CARD_FOLDED_5x7_PRODUCT_UID, GELATO_PRODUCTS, CARD_DIMENSIONS, CARD_OCCASIONS;
var init_gelato_config = __esm({
  "server/gelato-config.ts"() {
    "use strict";
    GELATO_CARD_FLAT_5x7_PRODUCT_UID = "cards_pf_5r_pt_130-lb-cover-coated-silk_cl_4-4_ct_matt-protection_prt_1-1_ver";
    GELATO_CARD_FOLDED_5x7_PRODUCT_UID = "brochures_pf_5r_pt_130-lb-cover-coated-silk_cl_4-4_ft_fold-ver_ct_matt-protection_prt_1-1_ver";
    GELATO_PRODUCTS = {
      card_flat_5x7: {
        productUid: GELATO_CARD_FLAT_5x7_PRODUCT_UID,
        name: "Flat Greeting Card \u2014 5\xD77",
        format: "flat",
        size: "5x7",
        priceCents: 1500,
        artworkFiles: [
          { type: "default", description: "Front artwork (print-ready PNG/JPG)" },
          { type: "back", description: "Back artwork (print-ready PNG/JPG)" }
        ]
      },
      card_folded_5x7: {
        productUid: GELATO_CARD_FOLDED_5x7_PRODUCT_UID,
        name: "Folded Greeting Card \u2014 5\xD77",
        format: "folded",
        size: "5x7",
        priceCents: 2e3,
        artworkFiles: [
          { type: "default", description: "Outside artwork \u2014 front cover + back when folded" },
          { type: "inside", description: "Inside artwork (greeting text spread)" }
        ]
      }
    };
    CARD_DIMENSIONS = {
      flat_front: { width: 1500, height: 2100 },
      // portrait orientation
      flat_back: { width: 1500, height: 2100 },
      folded_outside: { width: 1500, height: 2100 },
      // outside when closed (front cover visible)
      folded_inside: { width: 1500, height: 2100 }
      // inside spread when opened
    };
    CARD_OCCASIONS = [
      {
        id: "birthday",
        name: "Birthday",
        greetingText: "Happy Birthday!",
        subText: "Wishing you a day full of treats and belly rubs!",
        seasonalMonths: null,
        sortOrder: 1,
        templateColors: { primary: "#FF6B35", secondary: "#FFF0E6", textColor: "#CC4400" }
        // warm orange
      },
      {
        id: "thank_you",
        name: "Thank You",
        greetingText: "Thank You!",
        subText: "Your kindness means the world to us.",
        seasonalMonths: null,
        sortOrder: 2,
        templateColors: { primary: "#2E8B57", secondary: "#E0F2E9", textColor: "#1B5E3A" }
        // sea green
      },
      {
        id: "congratulations",
        name: "Congratulations",
        greetingText: "Congratulations!",
        subText: "Here's to celebrating this special moment!",
        seasonalMonths: null,
        sortOrder: 3,
        templateColors: { primary: "#DAA520", secondary: "#FDF5DC", textColor: "#8B6914" }
        // goldenrod
      },
      {
        id: "get_well",
        name: "Get Well Soon",
        greetingText: "Get Well Soon!",
        subText: "Sending warm thoughts and healing vibes your way.",
        seasonalMonths: null,
        sortOrder: 4,
        templateColors: { primary: "#4A90D9", secondary: "#E1EFFA", textColor: "#2A5FAA" }
        // cornflower blue
      },
      {
        id: "thinking_of_you",
        name: "Thinking of You",
        greetingText: "Thinking of You",
        subText: "Just a little reminder that someone cares.",
        seasonalMonths: null,
        sortOrder: 5,
        templateColors: { primary: "#9B59B6", secondary: "#F0E4F7", textColor: "#6C3483" }
        // soft purple
      },
      {
        id: "valentines",
        name: "Valentine's Day",
        greetingText: "Be My Valentine!",
        subText: "You make my heart do zoomies!",
        seasonalMonths: [0, 1],
        // Jan–Feb
        sortOrder: 10,
        templateColors: { primary: "#E91E63", secondary: "#FDDDE6", textColor: "#AD1457" }
        // hot pink
      },
      {
        id: "easter",
        name: "Easter / Spring",
        greetingText: "Happy Easter!",
        subText: "Hoppy Easter from your favorite fur baby!",
        seasonalMonths: [2, 3],
        // Mar–Apr
        sortOrder: 11,
        templateColors: { primary: "#7CB342", secondary: "#EDF5E0", textColor: "#4E7A1E" }
        // spring green
      },
      {
        id: "mothers_day",
        name: "Mother's Day",
        greetingText: "Happy Mother's Day!",
        subText: "To the best pet mom \u2014 with love and slobbery kisses.",
        seasonalMonths: [3, 4],
        // Apr–May
        sortOrder: 12,
        templateColors: { primary: "#E84393", secondary: "#FDE0ED", textColor: "#B5176D" }
        // rose pink
      },
      {
        id: "fathers_day",
        name: "Father's Day",
        greetingText: "Happy Father's Day!",
        subText: "To the best pet dad \u2014 thanks for all the walks and treats.",
        seasonalMonths: [4, 5],
        // May–Jun
        sortOrder: 13,
        templateColors: { primary: "#2C3E7B", secondary: "#DEE3F2", textColor: "#1A2550" }
        // navy blue
      },
      {
        id: "halloween",
        name: "Halloween",
        greetingText: "Happy Halloween!",
        subText: "Have a spooktacular day!",
        seasonalMonths: [8, 9],
        // Sep–Oct
        sortOrder: 14,
        templateColors: { primary: "#FF6F00", secondary: "#FFE8CC", textColor: "#CC5800" }
        // pumpkin orange
      },
      {
        id: "holiday",
        name: "Holiday / Christmas",
        greetingText: "Happy Holidays!",
        subText: "Wishing you a season full of joy, love, and treats!",
        seasonalMonths: [10, 11],
        // Nov–Dec
        sortOrder: 15,
        templateColors: { primary: "#1B7A3D", secondary: "#DFF0E5", textColor: "#145C2E" }
        // christmas green
      },
      {
        id: "new_year",
        name: "New Year",
        greetingText: "Happy New Year!",
        subText: "Here's to a pawsome new year together!",
        seasonalMonths: [11, 0],
        // Dec–Jan
        sortOrder: 16,
        templateColors: { primary: "#C0A000", secondary: "#FAF6DC", textColor: "#8B7500" }
        // champagne gold
      }
    ];
  }
});

// server/gelato.ts
var gelato_exports = {};
__export(gelato_exports, {
  buildCardOrderItem: () => buildCardOrderItem,
  cancelGelatoOrder: () => cancelGelatoOrder,
  createGelatoOrder: () => createGelatoOrder,
  getGelatoOrder: () => getGelatoOrder,
  getGelatoProduct: () => getGelatoProduct2,
  listCatalogs: () => listCatalogs,
  quoteGelatoOrder: () => quoteGelatoOrder,
  searchCardProducts: () => searchCardProducts,
  searchFoldedCardProducts: () => searchFoldedCardProducts
});
function getApiKey2() {
  const key = process.env.GELATO_API_KEY;
  if (!key) throw new Error("GELATO_API_KEY env var is not set");
  return key;
}
async function gelatoFetch(baseUrl, path5, options = {}) {
  const url = `${baseUrl}${path5}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-KEY": getApiKey2(),
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Gelato API error ${response.status}`;
    throw new Error(`Gelato ${response.status}: ${errorMsg}`);
  }
  return data;
}
async function createGelatoOrder(items, shippingAddress, orderReferenceId, customerReferenceId) {
  const body = {
    orderType: "order",
    orderReferenceId,
    customerReferenceId,
    currency: "USD",
    items,
    shipmentMethodUid: "standard",
    shippingAddress
  };
  return gelatoFetch(GELATO_ORDER_BASE, "/orders", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
async function getGelatoOrder(orderId) {
  return gelatoFetch(GELATO_ORDER_BASE, `/orders/${orderId}`);
}
async function quoteGelatoOrder(items, shippingAddress) {
  const body = {
    orderType: "order",
    currency: "USD",
    items,
    shipmentMethodUid: "standard",
    shippingAddress
  };
  return gelatoFetch(GELATO_ORDER_BASE, "/orders:quote", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
async function cancelGelatoOrder(orderId) {
  return gelatoFetch(GELATO_ORDER_BASE, `/orders/${orderId}:cancel`, {
    method: "POST"
  });
}
async function listCatalogs() {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs");
}
async function searchCardProducts() {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs/cards/products:search", {
    method: "POST",
    body: JSON.stringify({ attributeFilters: {} })
  });
}
async function searchFoldedCardProducts() {
  return gelatoFetch(GELATO_PRODUCT_BASE, "/catalogs/folded-cards/products:search", {
    method: "POST",
    body: JSON.stringify({ attributeFilters: {} })
  });
}
async function getGelatoProduct2(productUid) {
  return gelatoFetch(GELATO_PRODUCT_BASE, `/products/${productUid}`);
}
function buildCardOrderItem(productUid, quantity, artworkUrls, itemReferenceId) {
  return {
    itemReferenceId,
    productUid,
    quantity,
    files: artworkUrls
  };
}
var GELATO_ORDER_BASE, GELATO_PRODUCT_BASE;
var init_gelato = __esm({
  "server/gelato.ts"() {
    "use strict";
    GELATO_ORDER_BASE = "https://order.gelatoapis.com/v4";
    GELATO_PRODUCT_BASE = "https://product.gelatoapis.com/v3";
  }
});

// server/portrait-scheduler.ts
var portrait_scheduler_exports = {};
__export(portrait_scheduler_exports, {
  startPortraitScheduler: () => startPortraitScheduler
});
async function processPortraitRotation() {
  if (isRunning) {
    console.log("[scheduler] Previous run still in progress, skipping");
    return;
  }
  isRunning = true;
  try {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const dogsDue = await storage.getDogsDueForPortrait(today);
    if (dogsDue.length === 0) return;
    console.log(`[scheduler] ${dogsDue.length} dog(s) due for portraits on ${today}`);
    const byOrg = /* @__PURE__ */ new Map();
    for (const dog of dogsDue) {
      const list = byOrg.get(dog.organizationId) || [];
      list.push(dog);
      byOrg.set(dog.organizationId, list);
    }
    for (const [orgId, orgDogs] of byOrg) {
      const org = await storage.getOrganization(orgId);
      if (!org || !org.isActive) continue;
      const allStyles = await storage.getAllPortraitStyles();
      for (const dog of orgDogs) {
        try {
          const species = dog.species || "dog";
          const packResult = await pool.query(
            `SELECT pack_type FROM daily_pack_selections WHERE organization_id = $1 AND date = $2 AND species = $3 LIMIT 1`,
            [orgId, today, species]
          );
          if (packResult.rows.length === 0) {
            const nextDate2 = calculateNextPortraitDate(dog, today);
            await storage.advanceNextPortraitDate(dog.id, nextDate2);
            console.log(`[scheduler] ${dog.name}: no daily pack selected for org ${orgId}, bumped to ${nextDate2}`);
            continue;
          }
          const packType = packResult.rows[0].pack_type;
          const pack = getPackByType(species, packType);
          if (!pack) continue;
          const usedStyleIds = await storage.getUsedStyleIdsForDog(dog.id);
          const availableStyleIds = pack.styleIds.filter((id) => !usedStyleIds.includes(id));
          const stylePool = availableStyleIds.length > 0 ? availableStyleIds : pack.styleIds;
          if (stylePool.length === 0) {
            const nextDate2 = calculateNextPortraitDate(dog, today);
            await storage.advanceNextPortraitDate(dog.id, nextDate2);
            console.log(`[scheduler] ${dog.name}: no styles available, bumped to ${nextDate2}`);
            continue;
          }
          const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
          if (plan?.monthlyPortraitCredits) {
            const { creditsUsed } = await storage.getAccurateCreditsUsed(orgId);
            if (creditsUsed >= plan.monthlyPortraitCredits) {
              console.log(`[scheduler] Org ${orgId} out of credits, skipping ${dog.name}`);
              continue;
            }
          }
          const styleId = stylePool[Math.floor(Math.random() * stylePool.length)];
          const style = allStyles.find((s) => s.id === styleId);
          if (!style) continue;
          const breed = dog.breed || dog.species || "dog";
          const prompt = sanitizeForPrompt(
            style.promptTemplate.replace(/\{breed\}/g, breed).replace(/\{species\}/g, species).replace(/\{name\}/g, dog.name)
          );
          const generatedImageRaw = await generateImage(prompt, dog.originalPhotoUrl || void 0);
          let generatedImageUrl = generatedImageRaw;
          try {
            const fname = `portrait-${dog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
            generatedImageUrl = await uploadToStorage(generatedImageRaw, "portraits", fname);
          } catch (err) {
            console.error("[scheduler] Upload failed, using base64:", err);
          }
          await storage.createPortrait({
            dogId: dog.id,
            styleId: style.id,
            generatedImageUrl,
            isSelected: true
          });
          await storage.incrementOrgPortraitsUsed(orgId);
          const nextDate = calculateNextPortraitDate(dog, today);
          await storage.advanceNextPortraitDate(dog.id, nextDate);
          try {
            await deliverPortraitToOwner(dog, org);
          } catch (err) {
            console.error(`[scheduler] Delivery failed for ${dog.name}:`, err.message);
          }
          console.log(`[scheduler] Generated + delivered portrait for ${dog.name} (style ${style.name}, org ${orgId}, next: ${nextDate || "done"})`);
        } catch (err) {
          console.error(`[scheduler] Error processing ${dog.name} (${dog.id}):`, err.message);
        }
      }
    }
  } finally {
    isRunning = false;
  }
}
function calculateNextPortraitDate(dog, currentDate) {
  if (dog.stayNights) {
    let checkInDate;
    if (dog.checkedInAt) {
      checkInDate = typeof dog.checkedInAt === "string" ? dog.checkedInAt.slice(0, 10) : dog.checkedInAt.toISOString().slice(0, 10);
    } else if (dog.createdAt) {
      checkInDate = typeof dog.createdAt === "string" ? dog.createdAt.slice(0, 10) : dog.createdAt.toISOString().slice(0, 10);
    } else {
      console.warn(`[scheduler] Boarding dog ${dog.name} (${dog.id}) has no checkedInAt or createdAt \u2014 using daycare fallback`);
      const preference2 = dog.updatePreference || "weekly";
      const daysToAdd2 = preference2 === "biweekly" ? 14 : 7;
      const next2 = new Date(currentDate);
      next2.setDate(next2.getDate() + daysToAdd2);
      return next2.toISOString().slice(0, 10);
    }
    const portraitDates = calculateBoardingPortraitDates(checkInDate, dog.stayNights);
    const nextDate = portraitDates.find((d) => d > currentDate);
    return nextDate || null;
  }
  const preference = dog.updatePreference || "weekly";
  const daysToAdd = preference === "biweekly" ? 14 : 7;
  const next = new Date(currentDate);
  next.setDate(next.getDate() + daysToAdd);
  return next.toISOString().slice(0, 10);
}
function calculateBoardingPortraitDates(checkInDate, nights) {
  let count;
  if (nights <= 3) count = 1;
  else if (nights <= 7) count = 2;
  else if (nights <= 14) count = 3;
  else count = Math.min(Math.ceil(nights / 5), 7);
  const dates = [];
  const start = new Date(checkInDate);
  if (count === 1) {
    const checkout = new Date(start);
    checkout.setDate(checkout.getDate() + nights);
    dates.push(checkout.toISOString().slice(0, 10));
  } else {
    const interval = Math.floor(nights / count);
    for (let i = 1; i <= count; i++) {
      const day = i === count ? nights : i * interval;
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      dates.push(date.toISOString().slice(0, 10));
    }
  }
  return dates;
}
function startPortraitScheduler() {
  setTimeout(() => {
    processPortraitRotation().catch((err) => {
      console.error("[scheduler] Initial run error:", err.message);
    });
  }, 1e4);
  setInterval(() => {
    processPortraitRotation().catch((err) => {
      console.error("[scheduler] Periodic run error:", err.message);
    });
  }, 30 * 60 * 1e3);
  console.log("[scheduler] Portrait auto-rotation started (every 30 min)");
}
var isRunning;
var init_portrait_scheduler = __esm({
  "server/portrait-scheduler.ts"() {
    "use strict";
    init_storage();
    init_gemini();
    init_supabase_storage();
    init_pack_config();
    init_db();
    init_helpers();
    init_delivery();
    isRunning = false;
  }
});

// vite.config.ts
var import_vite, import_plugin_react, import_path3, import_meta2, vite_config_default;
var init_vite_config = __esm({
  "vite.config.ts"() {
    "use strict";
    import_vite = require("vite");
    import_plugin_react = __toESM(require("@vitejs/plugin-react"), 1);
    import_path3 = __toESM(require("path"), 1);
    import_meta2 = {};
    vite_config_default = (0, import_vite.defineConfig)({
      plugins: [
        (0, import_plugin_react.default)()
      ],
      resolve: {
        alias: {
          "@": import_path3.default.resolve(import_meta2.dirname, "client", "src"),
          "@shared": import_path3.default.resolve(import_meta2.dirname, "shared")
        }
      },
      root: import_path3.default.resolve(import_meta2.dirname, "client"),
      build: {
        outDir: import_path3.default.resolve(import_meta2.dirname, "dist/public"),
        emptyOutDir: true
      },
      server: {
        fs: {
          strict: true,
          deny: ["**/.*"]
        }
      }
    });
  }
});

// server/vite.ts
var vite_exports = {};
__export(vite_exports, {
  setupVite: () => setupVite
});
async function setupVite(server, app2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true
  };
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = import_path4.default.resolve(
        import_meta3.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await import_fs3.default.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${(0, import_nanoid.nanoid)()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
var import_vite2, import_fs3, import_path4, import_nanoid, import_meta3, viteLogger;
var init_vite = __esm({
  "server/vite.ts"() {
    "use strict";
    import_vite2 = require("vite");
    init_vite_config();
    import_fs3 = __toESM(require("fs"), 1);
    import_path4 = __toESM(require("path"), 1);
    import_nanoid = require("nanoid");
    import_meta3 = {};
    viteLogger = (0, import_vite2.createLogger)();
  }
});

// server/index.ts
var index_exports = {};
__export(index_exports, {
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_express2 = __toESM(require("express"), 1);
var import_crypto4 = __toESM(require("crypto"), 1);
var import_helmet = __toESM(require("helmet"), 1);

// server/auth.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);

// server/auth-storage.ts
init_auth();
init_db();
var import_drizzle_orm3 = require("drizzle-orm");
var AuthStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    if (userData.id) {
      const existingById = await this.getUser(userData.id);
      if (existingById) {
        const [updated] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.id, userData.id)).returning();
        return updated;
      }
    }
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, userData.email));
      if (existingByEmail) {
        const [updated] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.email, userData.email)).returning();
        return updated;
      }
    }
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (e) {
      if (e?.code === "23505" && userData.email) {
        const [existingByEmail] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.email, userData.email));
        if (existingByEmail) {
          const { id: _ignoreId, ...mutableFields } = userData;
          const [updated] = await db.update(users).set({ ...mutableFields, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(users.email, userData.email)).returning();
          return updated;
        }
      }
      throw e;
    }
  }
};
var authStorage = new AuthStorage();

// server/auth.ts
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey);
var recentUsers = /* @__PURE__ */ new Map();
var CACHE_TTL = 5 * 60 * 1e3;
var isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
      claims: {
        sub: user.id,
        email: user.email
      },
      access_token: token
    };
    const now = Date.now();
    const lastSeen = recentUsers.get(user.id);
    if (!lastSeen || now - lastSeen > CACHE_TTL) {
      await authStorage.upsertUser({
        id: user.id,
        email: user.email || null,
        firstName: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || null,
        lastName: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || null,
        profileImageUrl: user.user_metadata?.avatar_url || null
      });
      recentUsers.set(user.id, now);
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
function registerAuthRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const user = await authStorage.getUser(userId);
      const isAdmin2 = userEmail === process.env.ADMIN_EMAIL;
      res.json({ ...user, isAdmin: isAdmin2 });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  const signupRateLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    max: 5,
    message: { error: "Too many signup attempts. Please wait a minute." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.post("/api/auth/signup", signupRateLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, acceptedTerms } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      if (!acceptedTerms) {
        return res.status(400).json({ error: "You must accept the Terms of Service and Privacy Policy" });
      }
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || "",
          last_name: lastName || ""
        }
      });
      if (error) {
        console.error("Signup error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      try {
        const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        await pool2.query(
          "UPDATE users SET terms_accepted_at = NOW(), privacy_accepted_at = NOW() WHERE id = $1",
          [data.user.id]
        );
      } catch (consentErr) {
        console.error("Failed to record consent:", consentErr);
      }
      res.json({ user: { id: data.user.id, email: data.user.email } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
}

// server/routes.ts
init_helpers();

// server/routes/startup.ts
init_storage();
init_stripeClient();
init_subscription();
init_helpers();
async function runStartupHealthCheck() {
  if (ADMIN_EMAIL) {
    const allOrgsStartup = await storage.getAllOrganizations();
    const users2 = await storage.getAllUsers();
    let adminUserId = null;
    const adminUser = users2.find((u) => u.email === ADMIN_EMAIL);
    if (adminUser) adminUserId = adminUser.id;
    if (adminUserId) {
      const adminOrgs = allOrgsStartup.filter((o) => o.ownerId === adminUserId);
      for (const adminOrg of adminOrgs) {
        await storage.clearOrganizationOwner(adminOrg.id);
        console.log(`[startup] Removed admin ownership from "${adminOrg.name}" (ID ${adminOrg.id}) \u2014 admin should not own any business`);
      }
    }
  }
  try {
    const allOrgsForSync = await storage.getAllOrganizations();
    const orgsWithStripe = allOrgsForSync.filter((o) => o.stripeSubscriptionId);
    for (const org of orgsWithStripe) {
      try {
        const stripe = getStripeClient(org.stripeTestMode);
        const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        const newStatus = mapStripeStatusToInternal(sub.status, org.subscriptionStatus);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const matchedPlan = priceId ? STRIPE_PLAN_PRICE_MAP[priceId] : void 0;
        const changes = [];
        const orgUpdates = {};
        if (newStatus === "canceled") {
          const result = await handleCancellation(org.id, org);
          console.log(`[startup] Stripe sync for "${org.name}" (ID ${org.id}): ${result}`);
          continue;
        }
        if (newStatus !== org.subscriptionStatus) {
          await storage.updateOrganizationStripeInfo(org.id, {
            subscriptionStatus: newStatus,
            stripeSubscriptionId: org.stripeSubscriptionId
          });
          changes.push(`status: ${org.subscriptionStatus} \u2192 ${newStatus}`);
        }
        if (matchedPlan && matchedPlan.id !== org.planId) {
          orgUpdates.planId = matchedPlan.id;
          changes.push(`plan: \u2192 ${matchedPlan.name}`);
        }
        if (sub.status === "active" && sub.current_period_start) {
          const periodStart = new Date(sub.current_period_start * 1e3);
          if (!org.billingCycleStart || org.billingCycleStart.getTime() !== periodStart.getTime()) {
            orgUpdates.billingCycleStart = periodStart;
            changes.push(`billing cycle updated`);
          }
        }
        if (Object.keys(orgUpdates).length > 0) {
          await storage.updateOrganization(org.id, orgUpdates);
        }
        if (changes.length > 0) {
          console.log(`[startup] Stripe sync for "${org.name}" (ID ${org.id}): ${changes.join(", ")}`);
        }
      } catch (stripeErr) {
        if (stripeErr?.type === "StripeInvalidRequestError" || stripeErr?.statusCode === 404 || stripeErr?.code === "resource_missing") {
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
  } catch (syncErr) {
    console.error("[startup] Stripe sync failed:", syncErr.message);
  }
  try {
    const stripe = getStripeClient(true);
    const dbPlans = await storage.getAllSubscriptionPlans();
    let plansSynced = 0;
    for (const plan of dbPlans) {
      if (!plan.stripePriceId) continue;
      try {
        const price = await stripe.prices.retrieve(plan.stripePriceId, { expand: ["product"] });
        const product = price.product;
        if (product && !product.deleted) {
          const dbUpdates = {};
          if (product.name && product.name !== plan.name) {
            dbUpdates.name = product.name;
          }
          if (product.description !== void 0 && product.description !== null && product.description !== plan.description) {
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
      } catch (prodErr) {
        console.warn(`[startup] Could not sync Stripe product for plan "${plan.name}":`, prodErr.message);
      }
    }
    if (plansSynced > 0) {
      console.log(`[startup] Updated ${plansSynced} plan(s) from Stripe product data`);
    }
  } catch (descSyncErr) {
    console.warn("[startup] Stripe product sync failed:", descSyncErr.message);
  }
  const seqFixes = await storage.repairSequences();
  if (seqFixes.length > 0) {
    console.log(`[startup] Repaired DB sequences: ${seqFixes.join(", ")}`);
  }
  const creditResults = await storage.recalculateAllOrgCredits();
  if (creditResults.length > 0) {
    console.log(`[startup] Recalculated credits for ${creditResults.length} org(s):`, creditResults);
  }
  const allOrgs = await storage.getAllOrganizations();
  const allPlans = await storage.getAllSubscriptionPlans();
  const freeTrialPlan = await getFreeTrial();
  const issues = [];
  const fixes = [];
  for (const org of allOrgs) {
    if (org.subscriptionStatus === "active" && !org.stripeSubscriptionId) {
      const result = await handleCancellation(org.id, org);
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) active without subscription \u2192 ${result}`);
    }
    if (org.stripeCustomerId && !org.stripeSubscriptionId && org.subscriptionStatus !== "active") {
      try {
        const stripe = getStripeClient(org.stripeTestMode);
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (customer.deleted) {
          await storage.updateOrganizationStripeInfo(org.id, { stripeCustomerId: null, stripeSubscriptionId: null });
          fixes.push(`FIXED: "${org.name}" (ID ${org.id}) cleared deleted Stripe customer`);
        }
      } catch (custErr) {
        if (custErr?.type === "StripeInvalidRequestError" || custErr?.statusCode === 404 || custErr?.code === "resource_missing") {
          await storage.updateOrganizationStripeInfo(org.id, { stripeCustomerId: null, stripeSubscriptionId: null });
          fixes.push(`FIXED: "${org.name}" (ID ${org.id}) cleared stale Stripe customer`);
        }
      }
    }
    if (org.subscriptionStatus === "canceled" && !org.stripeSubscriptionId && isWithinTrialWindow(org)) {
      const reverted = await revertToFreeTrial(org.id);
      if (reverted) {
        fixes.push(`FIXED: "${org.name}" (ID ${org.id}) canceled without Stripe sub, still in trial \u2192 reverted to Free Trial`);
      }
    }
    if (org.subscriptionStatus === "trial" && !org.trialEndsAt && org.createdAt) {
      const trialEndsAt = new Date(new Date(org.createdAt).getTime() + 30 * 24 * 60 * 60 * 1e3);
      await storage.updateOrganization(org.id, { trialEndsAt });
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) backfilled trialEndsAt`);
    }
    if (!org.hasUsedFreeTrial && (org.subscriptionStatus === "trial" || org.trialEndsAt)) {
      await markFreeTrialUsed(org.id);
      fixes.push(`FIXED: "${org.name}" (ID ${org.id}) marked hasUsedFreeTrial`);
    }
    const dogCount = (await storage.getDogsByOrganization(org.id)).length;
    if (!org.planId && (dogCount > 0 || org.subscriptionStatus === "trial")) {
      if (freeTrialPlan) {
        await storage.updateOrganization(org.id, {
          planId: freeTrialPlan.id,
          subscriptionStatus: "trial",
          billingCycleStart: org.billingCycleStart || org.createdAt || /* @__PURE__ */ new Date()
        });
        fixes.push(`FIXED: "${org.name}" (ID ${org.id}) assigned Free Trial plan`);
      } else {
        issues.push(`CRITICAL: "${org.name}" (ID ${org.id}) has no plan and Free Trial not found`);
      }
      continue;
    }
    if (org.planId && dogCount > 0) {
      const plan = allPlans.find((p) => p.id === org.planId);
      if (plan?.dogsLimit) {
        const effectiveLimit = plan.dogsLimit + (org.additionalPetSlots || 0);
        if (dogCount > effectiveLimit) {
          issues.push(`WARNING: "${org.name}" (ID ${org.id}) has ${dogCount} pet(s) but limit is ${effectiveLimit} (${plan.name})`);
        }
      }
    }
  }
  if (fixes.length > 0) {
    console.log(`[startup] Auto-fixed ${fixes.length} org(s):
${fixes.join("\n")}`);
    const recount = await storage.recalculateAllOrgCredits();
    if (recount.length > 0) {
      console.log(`[startup] Re-recalculated credits after fixes:`, recount);
    }
  }
  if (issues.length > 0) {
    console.log(`[startup] Data integrity issues found:
${issues.join("\n")}`);
  }
}

// server/routes/organizations.ts
init_storage();
init_subscription();
init_helpers();
function registerOrganizationRoutes(app2) {
  app2.get("/api/my-organization", isAuthenticated, async (req, res) => {
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
      const { stripeCustomerId, stripeSubscriptionId, ...safeOrg } = org;
      res.json({
        ...safeOrg,
        hasStripeAccount: !!stripeCustomerId,
        hasActiveSubscription: !!stripeSubscriptionId,
        ...computePetLimitInfo(org, plan, orgDogs.length)
      });
    } catch (error) {
      console.error("Error fetching user organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });
  app2.post("/api/my-organization", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
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
        portraitsUsedThisMonth: 0
      });
      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });
  app2.patch("/api/my-organization", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(404).json({ error: "No organization found" });
      }
      const allowedFields = [
        "name",
        "description",
        "websiteUrl",
        "logoUrl",
        "contactName",
        "contactEmail",
        "contactPhone",
        "socialFacebook",
        "socialInstagram",
        "socialTwitter",
        "socialNextdoor",
        "billingStreet",
        "billingCity",
        "billingState",
        "billingZip",
        "billingCountry",
        "locationStreet",
        "locationCity",
        "locationState",
        "locationZip",
        "locationCountry",
        "speciesHandled",
        "onboardingCompleted",
        "industryType",
        "notificationMode"
      ];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const MAX_LENGTHS = {
        name: 200,
        description: 2e3,
        websiteUrl: 500,
        contactName: 200,
        contactEmail: 200,
        contactPhone: 50,
        socialFacebook: 500,
        socialInstagram: 500,
        socialTwitter: 500,
        socialNextdoor: 500,
        billingStreet: 500,
        billingCity: 200,
        billingState: 100,
        billingZip: 20,
        billingCountry: 100,
        locationStreet: 500,
        locationCity: 200,
        locationState: 100,
        locationZip: 20,
        locationCountry: 100
      };
      for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
        if (updates[field] !== void 0 && updates[field] !== null) {
          if (typeof updates[field] !== "string") {
            return res.status(400).json({ error: `${field} must be a string` });
          }
          if (updates[field].length > maxLen) {
            return res.status(400).json({ error: `${field} must be ${maxLen} characters or less` });
          }
        }
      }
      if (updates.name !== void 0 && typeof updates.name === "string" && updates.name.trim().length === 0) {
        return res.status(400).json({ error: "Organization name cannot be empty" });
      }
      if (updates.speciesHandled !== void 0) {
        if (!["dogs", "cats", "both"].includes(updates.speciesHandled)) {
          return res.status(400).json({ error: "speciesHandled must be 'dogs', 'cats', or 'both'" });
        }
      }
      if (updates.notificationMode !== void 0) {
        if (!["sms", "email", "both"].includes(updates.notificationMode)) {
          return res.status(400).json({ error: "notificationMode must be 'sms', 'email', or 'both'" });
        }
      }
      if (updates.logoUrl !== void 0 && updates.logoUrl !== null) {
        const MAX_LOGO_LENGTH = 5e5;
        if (typeof updates.logoUrl !== "string" || updates.logoUrl.length > MAX_LOGO_LENGTH) {
          return res.status(400).json({ error: "Logo data too large or invalid" });
        }
      }
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
  app2.post("/api/select-plan", isAuthenticated, async (req, res) => {
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
      const trialEndsAt = plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1e3) : null;
      const isNewPlan = org.planId !== plan.id;
      const orgUpdate = {
        planId: plan.id,
        subscriptionStatus: isFreeTrialPlan ? "trial" : "active"
      };
      if (isNewPlan) {
        orgUpdate.billingCycleStart = org.billingCycleStart || org.createdAt || /* @__PURE__ */ new Date();
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
  app2.get("/api/organizations", async (req, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      res.json(orgs.map(toPublicOrg));
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });
  app2.get("/api/organizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
  app2.get("/api/business/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org || !org.isActive) {
        return res.status(404).json({ error: "Business not found" });
      }
      const orgDogs = await storage.getDogsByOrganization(org.id);
      const dogsWithPortraits = await Promise.all(
        orgDogs.filter((d) => d.isAvailable).map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          return { ...dog, portrait: portrait || void 0 };
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
        dogs: dogsWithPortraits
      });
    } catch (error) {
      console.error("Error fetching business showcase:", error);
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });
}

// server/routes/plans-billing.ts
init_storage();
init_stripeService();
init_stripeClient();
init_helpers();
function getEffectivePlanPrice(plan, testMode) {
  if (testMode === false) {
    return plan.stripeLivePriceId || plan.stripePriceId || null;
  }
  return plan.stripePriceId || null;
}
function registerPlansBillingRoutes(app2) {
  app2.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });
  app2.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const testMode = req.query.testMode === "true";
      const key = getStripePublishableKey(testMode);
      res.json({ publishableKey: key, testMode });
    } catch (error) {
      console.error("Error fetching Stripe key:", error);
      res.status(500).json({ error: "Failed to get payment configuration" });
    }
  });
  app2.post("/api/stripe/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId, orgId, testMode: reqTestMode } = req.body;
      const testMode = reqTestMode === true;
      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }
      const plan = await storage.getSubscriptionPlan(planId);
      const effectivePrice = plan ? getEffectivePlanPrice(plan, testMode) : null;
      if (!plan || !effectivePrice) {
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
      const orgCurrentMode = org.stripeTestMode ?? true;
      if (org.stripeCustomerId && orgCurrentMode !== testMode) {
        await storage.updateOrganizationStripeInfo(org.id, {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeTestMode: testMode
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
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        effectivePrice,
        `${baseUrl}/dashboard?subscription=success&plan=${planId}&session_id={CHECKOUT_SESSION_ID}&orgId=${org.id}&testMode=${testMode}`,
        `${baseUrl}/dashboard`,
        testMode,
        void 0,
        { orgId: String(org.id), planId: String(planId) }
      );
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error?.message || error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
  app2.post("/api/stripe/confirm-checkout", isAuthenticated, async (req, res) => {
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
      const metadataOrgIdRaw = bodyOrgId ? parseInt(bodyOrgId) : null;
      const preOrg = metadataOrgIdRaw ? await storage.getOrganization(metadataOrgIdRaw) : null;
      const testMode = reqTestMode === true || reqTestMode === "true" || (preOrg?.stripeTestMode ?? true);
      const session = await stripeService.retrieveCheckoutSession(sessionId, testMode);
      if (!session || session.payment_status !== "paid" && session.status !== "complete") {
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
      const callerIsAdmin = req.user.claims.email === ADMIN_EMAIL;
      if (!callerIsAdmin && org.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const sessionCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (org.stripeCustomerId && sessionCustomerId !== org.stripeCustomerId) {
        return res.status(403).json({ error: "Session does not match your account" });
      }
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      let subscription = null;
      if (typeof session.subscription === "object" && session.subscription) {
        subscription = session.subscription;
      } else if (subscriptionId) {
        subscription = await stripeService.retrieveSubscription(subscriptionId, testMode);
      }
      const confirmEffectivePrice = getEffectivePlanPrice(plan, testMode);
      if (subscription && confirmEffectivePrice) {
        const subItems = subscription.items?.data || [];
        const matchesPlan = subItems.some((item) => {
          const priceId = typeof item.price === "string" ? item.price : item.price?.id;
          return priceId === confirmEffectivePrice || priceId === plan.stripePriceId || priceId === plan.stripeLivePriceId;
        });
        if (!matchesPlan) {
          return res.status(400).json({ error: "Subscription does not match the selected plan" });
        }
      }
      let billingCycleStart = /* @__PURE__ */ new Date();
      if (subscription?.current_period_start) {
        billingCycleStart = new Date(subscription.current_period_start * 1e3);
      }
      await storage.updateOrganization(org.id, {
        planId: plan.id,
        subscriptionStatus: "active",
        additionalPetSlots: 0,
        billingCycleStart
      });
      await storage.syncOrgCredits(org.id);
      const stripeInfo = { subscriptionStatus: "active", stripeTestMode: testMode };
      if (sessionCustomerId && !org.stripeCustomerId) {
        stripeInfo.stripeCustomerId = sessionCustomerId;
      }
      if (subscriptionId) {
        stripeInfo.stripeSubscriptionId = subscriptionId;
      }
      await storage.updateOrganizationStripeInfo(org.id, stripeInfo);
      const updated = await storage.getOrganization(org.id);
      const { stripeCustomerId: _sc, stripeSubscriptionId: _ss, ...safeUpdated } = updated;
      res.json(safeUpdated);
    } catch (error) {
      console.error("Error confirming checkout:", error);
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });
  app2.post("/api/stripe/portal", isAuthenticated, async (req, res) => {
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
      const testMode = refreshedOrg?.stripeTestMode ?? true;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
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
  app2.get("/api/subscription-info", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const reqOrgId = req.query.orgId ? parseInt(req.query.orgId) : null;
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
      let renewalDate = null;
      let pendingPlanName = null;
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
        hasStripeSubscription: !!org.stripeSubscriptionId
      });
    } catch (error) {
      console.error("Error getting subscription info:", error);
      res.status(500).json({ error: "Failed to get subscription info" });
    }
  });
  app2.post("/api/stripe/change-plan", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planId, orgId } = req.body;
      if (!planId || !orgId) {
        return res.status(400).json({ error: "Plan ID and Organization ID are required" });
      }
      const plan = await storage.getSubscriptionPlan(planId);
      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(400).json({ error: "Organization not found" });
      }
      const orgTestMode = org.stripeTestMode ?? true;
      const changePlanPrice = plan ? getEffectivePlanPrice(plan, orgTestMode) : null;
      if (!plan || !changePlanPrice) {
        return res.status(400).json({ error: "Invalid plan selected" });
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
        return res.json({ action: "upgrade", planId: plan.id });
      }
      const result = await stripeService.scheduleDowngrade(org.stripeSubscriptionId, changePlanPrice, orgTestMode);
      await storage.updateOrganization(org.id, {
        pendingPlanId: plan.id
      });
      res.json({
        action: "scheduled",
        renewalDate: result.currentPeriodEnd.toISOString(),
        newPlanName: plan.name
      });
    } catch (error) {
      console.error("Error changing plan:", error?.message || error);
      res.status(500).json({ error: "Failed to change plan" });
    }
  });
  app2.post("/api/stripe/cancel-plan-change", isAuthenticated, async (req, res) => {
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
        const cancelOrgTestMode = org.stripeTestMode ?? true;
        const currentPrice = currentPlan ? getEffectivePlanPrice(currentPlan, cancelOrgTestMode) : null;
        if (currentPrice) {
          await stripeService.scheduleDowngrade(org.stripeSubscriptionId, currentPrice, cancelOrgTestMode);
        }
      }
      await storage.updateOrganization(org.id, {
        pendingPlanId: null
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error canceling plan change:", error?.message || error);
      res.status(500).json({ error: "Failed to cancel plan change" });
    }
  });
  app2.get("/api/addon-slots", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const callerEmail = req.user.claims.email;
      const callerIsAdmin = callerEmail && callerEmail === ADMIN_EMAIL;
      const reqOrgId = req.query.orgId ? parseInt(req.query.orgId) : null;
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
        basePetLimit: plan?.dogsLimit ?? null
      });
    } catch (error) {
      console.error("Error fetching addon slots info:", error);
      res.status(500).json({ error: "Failed to fetch add-on information" });
    }
  });
  app2.post("/api/addon-slots", isAuthenticated, async (req, res) => {
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
            error: `Cannot reduce to ${quantity} add-on slots. You have ${orgDogs.length} pets but would only have ${effectiveNewLimit} slots. Remove some pets first.`
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
        message: quantity > 0 ? `You now have ${quantity} extra pet ${slotWord}. Your card will be charged $${(quantity * 3).toFixed(2)}/month.` : "Add-on pet slots removed."
      });
    } catch (error) {
      console.error("Error updating addon slots:", error);
      res.status(500).json({ error: "Failed to update add-on slots. Please try again." });
    }
  });
}

// server/routes/packs.ts
init_storage();
init_db();
init_pack_config();
function registerPackRoutes(app2) {
  app2.get("/api/portrait-styles", async (req, res) => {
    try {
      const styles = await storage.getAllPortraitStyles();
      res.json(styles);
    } catch (error) {
      console.error("Error fetching portrait styles:", error);
      res.status(500).json({ error: "Failed to fetch portrait styles" });
    }
  });
  app2.get("/api/packs", async (req, res) => {
    try {
      const species = req.query.species || "dog";
      if (!["dog", "cat"].includes(species)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }
      const packs = getPacks(species);
      const allStyles = await storage.getAllPortraitStyles();
      const styleMap = new Map(allStyles.map((s) => [s.id, s]));
      const resolved = packs.map((pack) => ({
        ...pack,
        styles: pack.styleIds.map((id) => styleMap.get(id)).filter(Boolean)
      }));
      res.json(resolved);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ error: "Failed to fetch packs" });
    }
  });
  app2.get("/api/daily-pack", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const isAdmin2 = userEmail === process.env.ADMIN_EMAIL;
      const orgIdParam = req.query.orgId;
      let orgId = null;
      if (isAdmin2 && orgIdParam) {
        orgId = parseInt(orgIdParam);
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) return res.json(null);
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const species = req.query.species || "dog";
      const result = await pool.query(
        "SELECT * FROM daily_pack_selections WHERE organization_id = $1 AND date = $2 AND species = $3",
        [orgId, date, species]
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
  app2.delete("/api/daily-pack", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const isAdmin2 = userEmail === process.env.ADMIN_EMAIL;
      let org;
      if (isAdmin2 && req.query.orgId) {
        org = await storage.getOrganization(parseInt(req.query.orgId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const species = req.query.species || "dog";
      await pool.query(
        "DELETE FROM daily_pack_selections WHERE organization_id = $1 AND date = $2 AND species = $3",
        [org.id, date, species]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("Error clearing daily pack:", error);
      res.status(500).json({ error: "Failed to clear daily pack" });
    }
  });
  app2.post("/api/daily-pack", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const isAdmin2 = userEmail === process.env.ADMIN_EMAIL;
      let org;
      if (isAdmin2 && req.body.organizationId) {
        org = await storage.getOrganization(parseInt(req.body.organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });
      const { packType, date, species } = req.body;
      if (!packType || !["celebrate", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType. Must be celebrate, fun, or artistic." });
      }
      const targetSpecies = species || "dog";
      if (!["dog", "cat"].includes(targetSpecies)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }
      const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const result = await pool.query(
        `INSERT INTO daily_pack_selections (organization_id, date, species, pack_type, selected_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (organization_id, date, species) DO UPDATE SET pack_type = EXCLUDED.pack_type, selected_by = EXCLUDED.selected_by
         RETURNING *`,
        [org.id, targetDate, targetSpecies, packType, userId]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error setting daily pack:", error);
      res.status(500).json({ error: "Failed to set daily pack", detail: error?.message || String(error) });
    }
  });
}

// server/routes/dogs.ts
var import_zod = require("zod");
init_storage();
init_db();

// shared/content-filter.ts
var blockedWords = [
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "blowjob",
  "boob",
  "boobs",
  "butt",
  "cock",
  "crap",
  "cum",
  "cunt",
  "damn",
  "dick",
  "dildo",
  "douche",
  "fag",
  "fuck",
  "fucker",
  "fucking",
  "handjob",
  "hell",
  "hoe",
  "homo",
  "horny",
  "jerk",
  "milf",
  "mofo",
  "motherfucker",
  "naked",
  "nazi",
  "nigga",
  "nigger",
  "nude",
  "orgasm",
  "penis",
  "piss",
  "porn",
  "porno",
  "pussy",
  "rape",
  "rapist",
  "retard",
  "scrotum",
  "sex",
  "shit",
  "shitty",
  "slut",
  "smut",
  "sperm",
  "stripper",
  "tit",
  "tits",
  "titty",
  "twat",
  "vagina",
  "viagra",
  "vulva",
  "whore",
  "wanker",
  "xxx"
];
var leetMap = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
  "*": "",
  "+": "t"
};
function normalizeLeet(text2) {
  return text2.split("").map((c) => leetMap[c] || c).join("");
}
function normalizeText(text2) {
  let n = text2.toLowerCase();
  n = normalizeLeet(n);
  n = n.replace(/[^a-z]/g, "");
  return n;
}
var blockedPatterns = blockedWords.map((w) => new RegExp(`\\b${w}\\b`, "i"));
function containsInappropriateLanguage(text2) {
  if (blockedPatterns.some((p) => p.test(text2))) return true;
  const stripped = text2.toLowerCase().replace(/[^a-z\s]/g, "");
  if (blockedPatterns.some((p) => p.test(stripped))) return true;
  const normalized = normalizeText(text2);
  if (blockedPatterns.some((p) => p.test(normalized))) return true;
  return false;
}

// server/breeds.ts
var dogBreeds = [
  "Affenpinscher",
  "Afghan Hound",
  "Airedale Terrier",
  "Akita",
  "Alaskan Malamute",
  "American Bulldog",
  "American English Coonhound",
  "American Eskimo Dog",
  "American Foxhound",
  "American Hairless Terrier",
  "American Staffordshire Terrier",
  "American Water Spaniel",
  "Anatolian Shepherd Dog",
  "Australian Cattle Dog",
  "Australian Shepherd",
  "Australian Terrier",
  "Azawakh",
  "Barbet",
  "Basenji",
  "Basset Fauve de Bretagne",
  "Basset Hound",
  "Beagle",
  "Bearded Collie",
  "Beauceron",
  "Bedlington Terrier",
  "Belgian Laekenois",
  "Belgian Malinois",
  "Belgian Sheepdog",
  "Belgian Tervuren",
  "Bergamasco Sheepdog",
  "Berger Picard",
  "Bernese Mountain Dog",
  "Bichon Frise",
  "Biewer Terrier",
  "Black and Tan Coonhound",
  "Black Russian Terrier",
  "Bloodhound",
  "Bluetick Coonhound",
  "Boerboel",
  "Border Collie",
  "Border Terrier",
  "Borzoi",
  "Boston Terrier",
  "Bouvier des Flandres",
  "Boxer",
  "Boykin Spaniel",
  "Bracco Italiano",
  "Briard",
  "Brittany",
  "Brussels Griffon",
  "Bull Terrier",
  "Bulldog",
  "Bullmastiff",
  "Cairn Terrier",
  "Canaan Dog",
  "Cane Corso",
  "Cardigan Welsh Corgi",
  "Cavalier King Charles Spaniel",
  "Cesky Terrier",
  "Chesapeake Bay Retriever",
  "Chihuahua",
  "Chinese Crested",
  "Chinese Shar-Pei",
  "Chinook",
  "Chow Chow",
  "Cirneco dell'Etna",
  "Clumber Spaniel",
  "Cocker Spaniel",
  "Collie",
  "Coton de Tulear",
  "Croatian Sheepdog",
  "Curly-Coated Retriever",
  "Dachshund",
  "Dalmatian",
  "Dandie Dinmont Terrier",
  "Danish-Swedish Farmdog",
  "Doberman Pinscher",
  "Dogo Argentino",
  "Dogue de Bordeaux",
  "English Cocker Spaniel",
  "English Foxhound",
  "English Setter",
  "English Springer Spaniel",
  "English Toy Spaniel",
  "Entlebucher Mountain Dog",
  "Field Spaniel",
  "Finnish Lapphund",
  "Finnish Spitz",
  "Flat-Coated Retriever",
  "French Bulldog",
  "German Pinscher",
  "German Shepherd Dog",
  "German Shorthaired Pointer",
  "German Wirehaired Pointer",
  "Giant Schnauzer",
  "Glen of Imaal Terrier",
  "Golden Retriever",
  "Gordon Setter",
  "Grand Basset Griffon Vendeen",
  "Great Dane",
  "Great Pyrenees",
  "Greater Swiss Mountain Dog",
  "Greyhound",
  "Harrier",
  "Havanese",
  "Ibizan Hound",
  "Icelandic Sheepdog",
  "Irish Red and White Setter",
  "Irish Setter",
  "Irish Terrier",
  "Irish Water Spaniel",
  "Irish Wolfhound",
  "Italian Greyhound",
  "Japanese Chin",
  "Japanese Spitz",
  "Keeshond",
  "Kerry Blue Terrier",
  "Komondor",
  "Kuvasz",
  "Labrador Retriever",
  "Lagotto Romagnolo",
  "Lakeland Terrier",
  "Lancashire Heeler",
  "Leonberger",
  "Lhasa Apso",
  "Lowchen",
  "Maltese",
  "Manchester Terrier",
  "Mastiff",
  "Miniature American Shepherd",
  "Miniature Bull Terrier",
  "Miniature Pinscher",
  "Miniature Schnauzer",
  "Mudi",
  "Neapolitan Mastiff",
  "Newfoundland",
  "Norfolk Terrier",
  "Norwegian Buhund",
  "Norwegian Elkhound",
  "Norwegian Lundehund",
  "Norwich Terrier",
  "Nova Scotia Duck Tolling Retriever",
  "Old English Sheepdog",
  "Otterhound",
  "Papillon",
  "Parson Russell Terrier",
  "Pekingese",
  "Pembroke Welsh Corgi",
  "Petit Basset Griffon Vendeen",
  "Pharaoh Hound",
  "Plott Hound",
  "Pointer",
  "Polish Lowland Sheepdog",
  "Pomeranian",
  "Poodle",
  "Portuguese Podengo Pequeno",
  "Portuguese Water Dog",
  "Pug",
  "Puli",
  "Pumi",
  "Pyrenean Shepherd",
  "Rat Terrier",
  "Redbone Coonhound",
  "Rhodesian Ridgeback",
  "Rottweiler",
  "Russell Terrier",
  "Russian Toy",
  "Russian Tsvetnaya Bolonka",
  "Saint Bernard",
  "Saluki",
  "Samoyed",
  "Schipperke",
  "Scottish Deerhound",
  "Scottish Terrier",
  "Sealyham Terrier",
  "Shetland Sheepdog",
  "Shiba Inu",
  "Shih Tzu",
  "Siberian Husky",
  "Silky Terrier",
  "Skye Terrier",
  "Sloughi",
  "Small Munsterlander",
  "Smooth Fox Terrier",
  "Soft Coated Wheaten Terrier",
  "Spanish Water Dog",
  "Spinone Italiano",
  "Staffordshire Bull Terrier",
  "Standard Schnauzer",
  "Sussex Spaniel",
  "Swedish Vallhund",
  "Teddy Roosevelt Terrier",
  "Thai Ridgeback",
  "Tibetan Mastiff",
  "Tibetan Spaniel",
  "Tibetan Terrier",
  "Toy Fox Terrier",
  "Treeing Walker Coonhound",
  "Vizsla",
  "Weimaraner",
  "Welsh Springer Spaniel",
  "Welsh Terrier",
  "West Highland White Terrier",
  "Whippet",
  "Wire Fox Terrier",
  "Wirehaired Pointing Griffon",
  "Wirehaired Vizsla",
  "Xoloitzcuintli",
  "Yorkshire Terrier"
];
var catBreeds = [
  "Abyssinian",
  "American Bobtail",
  "American Curl",
  "American Shorthair",
  "American Wirehair",
  "Balinese",
  "Bengal",
  "Birman",
  "Bombay",
  "British Shorthair",
  "Burmese",
  "Burmilla",
  "Chartreux",
  "Colorpoint Shorthair",
  "Cornish Rex",
  "Devon Rex",
  "Egyptian Mau",
  "European Burmese",
  "Exotic Shorthair",
  "Havana Brown",
  "Japanese Bobtail",
  "Khao Manee",
  "Korat",
  "LaPerm",
  "Lykoi",
  "Maine Coon",
  "Manx",
  "Norwegian Forest Cat",
  "Ocicat",
  "Oriental",
  "Persian",
  "Ragamuffin",
  "Ragdoll",
  "Russian Blue",
  "Scottish Fold",
  "Selkirk Rex",
  "Siamese",
  "Siberian",
  "Singapura",
  "Somali",
  "Sphynx",
  "Tonkinese",
  "Toybob",
  "Turkish Angora",
  "Turkish Van"
];
var breedAliases = {
  "German Shepherd": "German Shepherd Dog",
  "Pit Bull": "American Staffordshire Terrier",
  "Pitbull": "American Staffordshire Terrier",
  "Lab": "Labrador Retriever",
  "Golden": "Golden Retriever",
  "Husky": "Siberian Husky",
  "Yorkie": "Yorkshire Terrier",
  "GSD": "German Shepherd Dog",
  "Doodle": "Poodle Mix",
  "Goldendoodle": "Golden Retriever Mix",
  "Labradoodle": "Labrador Retriever Mix",
  "Cockapoo": "Cocker Spaniel Mix",
  "Maltipoo": "Maltese Mix",
  "Bernedoodle": "Bernese Mountain Dog Mix",
  "Aussiedoodle": "Australian Shepherd Mix",
  "Cavapoo": "Cavalier King Charles Spaniel Mix",
  "Pomsky": "Pomeranian Mix",
  "Sheepadoodle": "Old English Sheepdog Mix",
  "Shorkie": "Shih Tzu Mix",
  "Morkie": "Maltese Mix",
  "Puggle": "Pug Mix",
  "Frenchie": "French Bulldog",
  "Staffy": "Staffordshire Bull Terrier",
  "Staffie": "Staffordshire Bull Terrier",
  "Weiner Dog": "Dachshund",
  "Wiener Dog": "Dachshund",
  "Corgi": "Pembroke Welsh Corgi",
  "Sheltie": "Shetland Sheepdog",
  "Westie": "West Highland White Terrier",
  "Scottie": "Scottish Terrier"
};
function buildValidBreeds(breeds) {
  const set = /* @__PURE__ */ new Set();
  set.add("Mixed Breed");
  for (const b of breeds) {
    set.add(b);
    set.add(`${b} Mix`);
  }
  for (const alias of Object.keys(breedAliases)) {
    set.add(alias);
    set.add(`${alias} Mix`);
  }
  return set;
}
var validDogBreeds = buildValidBreeds(dogBreeds);
var validCatBreeds = buildValidBreeds(catBreeds);
function isValidBreed(breed, species) {
  if (!breed || !breed.trim()) return false;
  if (species === "cat") return validCatBreeds.has(breed);
  if (species === "dog") return validDogBreeds.has(breed);
  return validDogBreeds.has(breed) || validCatBreeds.has(breed);
}

// server/routes/dogs.ts
init_helpers();
init_pack_config();
init_gemini();
init_supabase_storage();
function registerDogRoutes(app2) {
  app2.get("/api/dogs/code/:petCode", async (req, res) => {
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
      const portraits2 = await pool.query(
        `SELECT p.*, ps.name as style_name, ps.category as style_category
         FROM portraits p
         LEFT JOIN portrait_styles ps ON p.style_id = ps.id
         WHERE p.dog_id = $1
         ORDER BY p.is_selected DESC, p.created_at DESC`,
        [dog.id]
      );
      const mapPortrait = (p) => ({
        id: p.id,
        dogId: p.dog_id,
        styleId: p.style_id,
        generatedImageUrl: p.generated_image_url,
        previousImageUrl: p.previous_image_url,
        isSelected: p.is_selected,
        editCount: p.edit_count,
        createdAt: p.created_at,
        styleName: p.style_name,
        styleCategory: p.style_category
      });
      const mappedPortraits = portraits2.rows.map(mapPortrait);
      const selectedPortrait = mappedPortraits.find((p) => p.isSelected) || mappedPortraits[0] || null;
      res.json({
        id: dog.id,
        organizationId: dog.organization_id,
        name: dog.name,
        species: dog.species,
        breed: dog.breed,
        age: dog.age,
        description: dog.description,
        originalPhotoUrl: dog.original_photo_url,
        petCode: dog.pet_code,
        isAvailable: dog.is_available,
        createdAt: dog.created_at,
        organizationName: dog.organization_name,
        organizationLogoUrl: dog.organization_logo_url,
        organizationSlug: dog.organization_slug,
        portrait: selectedPortrait,
        portraits: mappedPortraits
      });
    } catch (error) {
      console.error("Error looking up pet code:", error);
      res.status(500).json({ error: "Failed to look up pet" });
    }
  });
  app2.get("/api/dogs/code/:petCode/styles", async (req, res) => {
    try {
      const { petCode } = req.params;
      const dogResult = await pool.query(
        `SELECT d.id, d.species, d.organization_id, o.industry_type
         FROM dogs d JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = dogResult.rows[0];
      const species = dog.species || "dog";
      const packs = getPacks(species);
      let targetPackType = null;
      const portraitResult = await pool.query(
        `SELECT style_id, created_at FROM portraits
         WHERE dog_id = $1 AND is_selected = true
         ORDER BY created_at DESC LIMIT 1`,
        [dog.id]
      );
      if (portraitResult.rows.length > 0) {
        const portrait = portraitResult.rows[0];
        const portraitDate = new Date(portrait.created_at).toISOString().split("T")[0];
        const packSelResult = await pool.query(
          `SELECT pack_type FROM daily_pack_selections
           WHERE organization_id = $1 AND date = $2 AND species = $3`,
          [dog.organization_id, portraitDate, species]
        );
        if (packSelResult.rows.length > 0) {
          targetPackType = packSelResult.rows[0].pack_type;
        } else {
          const matchingPack = packs.find((p) => p.styleIds.includes(portrait.style_id));
          if (matchingPack) {
            targetPackType = matchingPack.type;
          }
        }
      }
      const filteredPacks = targetPackType ? packs.filter((p) => p.type === targetPackType) : packs;
      const existing = await pool.query(
        `SELECT style_id FROM portraits WHERE dog_id = $1`,
        [dog.id]
      );
      const generatedStyleIds = new Set(existing.rows.map((r) => r.style_id));
      const allStyles = await storage.getAllPortraitStyles();
      const result = filteredPacks.map((pack) => ({
        type: pack.type,
        name: pack.name,
        styles: pack.styleIds.map((sid) => {
          const style = allStyles.find((s) => s.id === sid);
          return style ? {
            id: style.id,
            name: style.name,
            category: style.category,
            generated: generatedStyleIds.has(style.id)
          } : null;
        }).filter(Boolean)
      }));
      res.json({ packs: result });
    } catch (error) {
      console.error("Error fetching pack styles:", error);
      res.status(500).json({ error: "Failed to fetch styles" });
    }
  });
  app2.post("/api/dogs/code/:petCode/generate", publicExpensiveRateLimiter, async (req, res) => {
    try {
      const { petCode } = req.params;
      const { styleId } = req.body;
      if (!styleId) {
        return res.status(400).json({ error: "styleId is required" });
      }
      const dogResult = await pool.query(
        `SELECT d.*, o.industry_type, o.id as org_id
         FROM dogs d JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = dogResult.rows[0];
      const species = dog.species || "dog";
      const packs = getPacks(species);
      let allowedStyleIds = [];
      const curPortrait = await pool.query(
        `SELECT style_id, created_at FROM portraits
         WHERE dog_id = $1 AND is_selected = true
         ORDER BY created_at DESC LIMIT 1`,
        [dog.id]
      );
      if (curPortrait.rows.length > 0) {
        const portrait2 = curPortrait.rows[0];
        const portraitDate = new Date(portrait2.created_at).toISOString().split("T")[0];
        const packSelResult = await pool.query(
          `SELECT pack_type FROM daily_pack_selections
           WHERE organization_id = $1 AND date = $2 AND species = $3`,
          [dog.organization_id, portraitDate, species]
        );
        let targetPack;
        if (packSelResult.rows.length > 0) {
          targetPack = packs.find((p) => p.type === packSelResult.rows[0].pack_type);
        } else {
          targetPack = packs.find((p) => p.styleIds.includes(portrait2.style_id));
        }
        if (targetPack) {
          allowedStyleIds = targetPack.styleIds;
        }
      }
      if (allowedStyleIds.length === 0) {
        allowedStyleIds = packs.flatMap((p) => p.styleIds);
      }
      if (!allowedStyleIds.includes(parseInt(styleId))) {
        return res.status(400).json({ error: "Style not available for this pet" });
      }
      const existing = await pool.query(
        `SELECT id, generated_image_url FROM portraits WHERE dog_id = $1 AND style_id = $2`,
        [dog.id, parseInt(styleId)]
      );
      if (existing.rows.length > 0) {
        return res.json({
          portraitId: existing.rows[0].id,
          generatedImageUrl: existing.rows[0].generated_image_url,
          alreadyExists: true
        });
      }
      const org = await storage.getOrganization(dog.org_id);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const style = await storage.getPortraitStyle(parseInt(styleId));
      if (!style) return res.status(404).json({ error: "Style not found" });
      if (!dog.original_photo_url) {
        return res.status(400).json({ error: "No photo available for this pet" });
      }
      const breed = dog.breed || dog.species || "dog";
      const prompt = sanitizeForPrompt(
        style.promptTemplate.replace(/\{breed\}/g, breed).replace(/\{species\}/g, dog.species || "dog").replace(/\{name\}/g, dog.name)
      );
      let generatedImageUrl = await generateImage(prompt, dog.original_photo_url);
      try {
        const fname = `portrait-${dog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        generatedImageUrl = await uploadToStorage(generatedImageUrl, "portraits", fname);
      } catch (err) {
        console.error("[storage-upload] Portrait upload failed, using base64 fallback:", err);
      }
      await pool.query(
        `UPDATE portraits SET is_selected = false WHERE dog_id = $1`,
        [dog.id]
      );
      const portrait = await storage.createPortrait({
        dogId: dog.id,
        styleId: parseInt(styleId),
        generatedImageUrl,
        isSelected: true
      });
      await storage.incrementOrgPortraitsUsed(dog.org_id);
      res.json({
        portraitId: portrait.id,
        generatedImageUrl,
        alreadyExists: false
      });
    } catch (error) {
      console.error("Error generating portrait via pet code:", error);
      res.status(500).json({ error: "Failed to generate portrait" });
    }
  });
  app2.get("/api/dogs", async (req, res) => {
    try {
      const allDogs = await storage.getAllDogs();
      const activeOrgs = await storage.getAllOrganizations();
      const activeOrgIds = new Set(activeOrgs.filter((o) => o.isActive).map((o) => o.id));
      const dogsWithPortraits = await Promise.all(
        allDogs.filter((dog) => dog.organizationId && activeOrgIds.has(dog.organizationId)).map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          if (portrait) {
            const style = await storage.getPortraitStyle(portrait.styleId);
            return {
              ...dog,
              portrait: { ...portrait, style }
            };
          }
          return dog;
        })
      );
      const isRealImage = (url) => {
        if (!url) return false;
        if (url.includes("placehold.co") || url.includes("placeholder") || url.includes("via.placeholder")) return false;
        return true;
      };
      const visibleDogs = dogsWithPortraits.filter(
        (dog) => dog.isAvailable && (isRealImage(dog.portrait?.generatedImageUrl) || isRealImage(dog.originalPhotoUrl))
      );
      res.json(visibleDogs);
    } catch (error) {
      console.error("Error fetching dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });
  app2.get("/api/my-dogs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.json([]);
      }
      const orgDogs = await storage.getDogsByOrganization(org.id);
      const dogsWithPortraits = await Promise.all(
        orgDogs.map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          if (portrait) {
            const style = await storage.getPortraitStyle(portrait.styleId);
            return {
              ...dog,
              portrait: { ...portrait, style }
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
  app2.get("/api/dogs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid pet ID" });
      }
      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const org = dog.organizationId ? await storage.getOrganization(dog.organizationId) : null;
      if (!org || !org.isActive || !dog.isAvailable) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const allPortraits = await storage.getPortraitsByDog(dog.id);
      const portraitsWithStyles = await Promise.all(
        allPortraits.map(async (p) => {
          const style = await storage.getPortraitStyle(p.styleId);
          return { ...p, style: style || null };
        })
      );
      const portrait = portraitsWithStyles.find((p) => p.isSelected) || (portraitsWithStyles.length > 0 ? portraitsWithStyles[0] : void 0);
      res.json({
        ...dog,
        organizationName: org?.name || null,
        organizationLogoUrl: org?.logoUrl || null,
        organizationWebsiteUrl: org?.websiteUrl || null,
        portrait: portrait || void 0,
        portraits: portraitsWithStyles
      });
    } catch (error) {
      console.error("Error fetching dog:", error);
      res.status(500).json({ error: "Failed to fetch pet" });
    }
  });
  app2.post("/api/dogs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      let orgId;
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
      const { originalPhotoUrl, generatedPortraitUrl, styleId, organizationId: _orgId, ...rawData } = req.body;
      const allowedFields = ["name", "species", "breed", "age", "description", "ownerEmail", "ownerPhone", "checkedInAt", "isAvailable", "adoptionUrl", "externalId", "externalSource", "tags"];
      const dogData = {};
      for (const key of allowedFields) {
        if (rawData[key] !== void 0) dogData[key] = rawData[key];
      }
      if (dogData.species && !["dog", "cat"].includes(dogData.species)) {
        return res.status(400).json({ error: "species must be 'dog' or 'cat'" });
      }
      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }
      if (!dogData.breed || !dogData.breed.trim()) {
        dogData.breed = "Mixed";
      }
      if (dogData.breed && !isValidBreed(dogData.breed, dogData.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }
      if (!dogData.checkedInAt) {
        dogData.checkedInAt = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      }
      const dog = await createDogWithPortrait(dogData, orgId, originalPhotoUrl, generatedPortraitUrl, styleId);
      res.status(201).json(dog);
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating pet:", errMsg, error);
      res.status(500).json({ error: "Failed to save pet" });
    }
  });
  app2.patch("/api/dogs/:id", isAuthenticated, async (req, res) => {
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
      const { selectedPortraitId, ...rawData } = req.body;
      const allowedFields = ["name", "species", "breed", "age", "description", "ownerEmail", "ownerPhone", "checkedInAt", "isAvailable", "adoptionUrl", "originalPhotoUrl", "tags"];
      const dogData = {};
      for (const key of allowedFields) {
        if (rawData[key] !== void 0) dogData[key] = rawData[key];
      }
      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }
      if (dogData.breed !== void 0 && !isValidBreed(dogData.breed, dogData.species || dog.species)) {
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
      res.status(500).json({ error: "Failed to update pet" });
    }
  });
  app2.post("/api/dogs/:id/check-in", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const dog = await storage.getDog(id);
      if (!dog) return res.status(404).json({ error: "Pet not found" });
      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      const date = req.body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await storage.updateDog(id, { checkedInAt: date });
      res.json({ success: true, checkedInAt: date });
    } catch (error) {
      console.error("Error checking in pet:", error);
      res.status(500).json({ error: "Failed to check in pet" });
    }
  });
  app2.delete("/api/dogs/:id", isAuthenticated, async (req, res) => {
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
  app2.get("/api/dogs/:id/photo", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dog = await storage.getDog(id);
      if (!dog || !dog.originalPhotoUrl) {
        return res.status(404).send("Photo not found");
      }
      const dataUri = dog.originalPhotoUrl;
      if (!dataUri.startsWith("data:")) {
        return res.redirect(dataUri);
      }
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }
      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], "base64");
      res.set({
        "Content-Type": contentType,
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400"
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving pet photo:", error);
      res.status(500).send("Error loading photo");
    }
  });
  app2.get("/api/dogs/:id/visit-photos", isAuthenticated, async (req, res) => {
    try {
      const dogId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const dog = await storage.getDog(dogId);
      if (!dog) return res.status(404).json({ error: "Pet not found" });
      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      const visitDate = req.query.date;
      const photos = await storage.getVisitPhotos(dogId, visitDate);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching visit photos:", error);
      res.status(500).json({ error: "Failed to fetch visit photos" });
    }
  });
  app2.post("/api/dogs/:id/visit-photos", isAuthenticated, async (req, res) => {
    try {
      const dogId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const dog = await storage.getDog(dogId);
      if (!dog) return res.status(404).json({ error: "Pet not found" });
      let org;
      if (userIsAdmin) {
        org = await storage.getOrganization(dog.organizationId);
      } else {
        org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const { photo, caption } = req.body;
      if (!photo) return res.status(400).json({ error: "Photo data is required" });
      const industryType = org.industryType || "groomer";
      const photoLimits = { groomer: 3, boarding: 5, daycare: 4 };
      const limit = photoLimits[industryType] || 3;
      const visitDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const currentCount = await storage.countVisitPhotosForDate(dogId, visitDate);
      if (currentCount >= limit) {
        return res.status(400).json({
          error: `Photo limit reached (${limit} per ${industryType === "groomer" ? "visit" : "day"})`
        });
      }
      let photoUrl;
      if (isDataUri(photo)) {
        const fname = `visit-${dogId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        photoUrl = await uploadToStorage(photo, "originals", fname);
      } else {
        photoUrl = photo;
      }
      const visitPhoto = await storage.createVisitPhoto({
        dogId,
        organizationId: org.id,
        photoUrl,
        visitDate,
        caption: caption || null,
        sortOrder: currentCount
      });
      res.status(201).json(visitPhoto);
    } catch (error) {
      console.error("Error uploading visit photo:", error);
      res.status(500).json({ error: "Failed to upload visit photo" });
    }
  });
  app2.delete("/api/dogs/:id/visit-photos/:photoId", isAuthenticated, async (req, res) => {
    try {
      const dogId = parseInt(req.params.id);
      const photoId = parseInt(req.params.photoId);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const photos = await storage.getVisitPhotos(dogId);
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }
      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || photo.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      await storage.deleteVisitPhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting visit photo:", error);
      res.status(500).json({ error: "Failed to delete visit photo" });
    }
  });
}

// server/routes/portraits.ts
var import_sharp3 = __toESM(require("sharp"), 1);
init_storage();
init_gemini();

// server/generate-mockups.ts
var import_sharp2 = __toESM(require("sharp"), 1);
init_storage();
init_supabase_storage();
import_sharp2.default.cache(false);
var WIDTH = 1200;
var HEIGHT = 630;
var CREAM_BG = { r: 253, g: 250, b: 245 };
var ORANGE = { r: 234, g: 121, b: 35 };
var DARK_TEXT = { r: 51, g: 38, b: 25 };
var MUTED_TEXT = { r: 120, g: 100, b: 80 };
function roundedRectSvg(w, h, r, fill) {
  return `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/></svg>`;
}
function textSvg(text2, fontSize, color, maxWidth, fontWeight = "bold") {
  const escaped = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${Math.round(fontSize * 1.4)}">
    <text x="0" y="${fontSize}" font-family="sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}
function pawtraitProsLogoSvg(height) {
  const iconSize = Math.round(height * 0.6);
  const fontSize = Math.round(height * 0.45);
  const textWidth = Math.ceil(fontSize * 0.6 * 13);
  const totalWidth = iconSize * 2 + 8 + textWidth + 8;
  const orange = `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
    <g transform="translate(0, ${Math.round(height * 0.15)})">
      <svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${orange}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/>
        <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>
        <path d="M8 14v.5"/>
        <path d="M16 14v.5"/>
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
        <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/>
      </svg>
      <svg x="${iconSize + 2}" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${orange}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.2 6.71-.56 1.73 1.69 1.97 4.5.56 6.71a9.5 9.5 0 0 1 .03 5.09c-.27 1.61-1.54 2.84-3.3 2.84H6c-1.76 0-3.03-1.23-3.3-2.84A9.5 9.5 0 0 1 2.73 11.41C1.34 9.72 1.56 6.91 3.29 5.26 4.97 3.56 8.22 3.76 10 5.76A6.01 6.01 0 0 1 12 5Z"/>
        <path d="M8 14v.5"/>
        <path d="M16 14v.5"/>
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
      </svg>
    </g>
    <text x="${iconSize * 2 + 10}" y="${Math.round(height * 0.65)}" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" fill="${orange}">Pawtrait Pros</text>
  </svg>`;
  return { svg: Buffer.from(svg), width: totalWidth, height };
}
function pillSvg(text2, fontSize, bgColor, textColor, paddingX, paddingY) {
  const charWidth = fontSize * 0.6;
  const textWidth = Math.ceil(text2.length * charWidth);
  const width = textWidth + paddingX * 2;
  const height = Math.round(fontSize * 1.3) + paddingY * 2;
  const radius = height / 2;
  const escaped = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${bgColor}"/>
    <text x="${width / 2}" y="${height / 2 + fontSize * 0.35}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">${escaped}</text>
  </svg>`;
  return { svg: Buffer.from(svg), width, height };
}
async function resizeToFit(imageBuffer, maxW, maxH) {
  return (0, import_sharp2.default)(imageBuffer).resize(maxW, maxH, { fit: "cover", position: "center" }).png().toBuffer();
}
async function makeRoundedImage(imageBuffer, w, h, radius) {
  const resized = await resizeToFit(imageBuffer, w, h);
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  );
  return (0, import_sharp2.default)(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}
async function generateShowcaseMockup(orgId) {
  const org = await storage.getOrganization(orgId);
  if (!org) throw new Error("Organization not found");
  const dogs2 = await storage.getDogsByOrganization(orgId);
  const dogsWithPortraits = [];
  for (const dog of dogs2) {
    const portrait = await storage.getSelectedPortraitByDog(dog.id);
    if (portrait && portrait.generatedImageUrl) {
      try {
        const buf = await fetchImageAsBuffer(portrait.generatedImageUrl);
        dogsWithPortraits.push({
          name: dog.name,
          breed: dog.breed || "Unknown",
          species: dog.species || "dog",
          portraitBuffer: buf
        });
      } catch (e) {
      }
    }
  }
  const petCount = dogsWithPortraits.length;
  if (petCount === 0) throw new Error("No pets with portraits found");
  const petsToShow = dogsWithPortraits.slice(0, 4);
  const composites = [];
  const bg = await (0, import_sharp2.default)({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: CREAM_BG }
  }).png().toBuffer();
  const topBar = await (0, import_sharp2.default)(Buffer.from(roundedRectSvg(WIDTH, 6, 0, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`))).png().toBuffer();
  composites.push({ input: topBar, top: 0, left: 0 });
  const orgLogoSize = 70;
  let orgLogoWidth = 0;
  if (org.logoUrl) {
    try {
      const orgLogoBuf = await fetchImageAsBuffer(org.logoUrl);
      const orgLogo = await makeRoundedImage(orgLogoBuf, orgLogoSize, orgLogoSize, 8);
      composites.push({ input: orgLogo, top: 18, left: 30 });
      orgLogoWidth = orgLogoSize + 14;
    } catch (e) {
    }
  }
  const orgNameText = textSvg(org.name, 36, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, 700);
  composites.push({ input: orgNameText, top: 25, left: 30 + orgLogoWidth });
  const adoptPill = pillSvg("Featured Pet", 16, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`, "white", 16, 8);
  composites.push({ input: adoptPill.svg, top: 70, left: 30 + orgLogoWidth });
  const portraitAreaTop = 130;
  const portraitAreaHeight = HEIGHT - portraitAreaTop - 60;
  const maxPortraitW = Math.floor((WIDTH - 60 - (petsToShow.length - 1) * 20) / petsToShow.length);
  const portraitImgH = portraitAreaHeight - 70;
  const portraitW = Math.min(maxPortraitW, 280);
  const totalWidth = petsToShow.length * portraitW + (petsToShow.length - 1) * 20;
  let startX = Math.floor((WIDTH - totalWidth) / 2);
  for (let i = 0; i < petsToShow.length; i++) {
    const pet = petsToShow[i];
    const x = startX + i * (portraitW + 20);
    const cardBg = await (0, import_sharp2.default)(Buffer.from(roundedRectSvg(portraitW, portraitAreaHeight, 12, "white"))).png().toBuffer();
    composites.push({ input: cardBg, top: portraitAreaTop, left: x });
    const rounded = await makeRoundedImage(pet.portraitBuffer, portraitW - 16, portraitImgH - 8, 8);
    composites.push({ input: rounded, top: portraitAreaTop + 8, left: x + 8 });
    const nameText = textSvg(pet.name, 20, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, portraitW - 16);
    composites.push({ input: nameText, top: portraitAreaTop + portraitImgH + 8, left: x + 12 });
    const breedText = textSvg(pet.breed, 14, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, portraitW - 16, "normal");
    composites.push({ input: breedText, top: portraitAreaTop + portraitImgH + 34, left: x + 12 });
  }
  const poweredByText = textSvg("Powered by", 13, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 200, "normal");
  composites.push({ input: poweredByText, top: HEIGHT - 38, left: WIDTH - 370 });
  const ppLogo = pawtraitProsLogoSvg(40);
  composites.push({ input: ppLogo.svg, top: HEIGHT - 48, left: WIDTH - 280 });
  return (0, import_sharp2.default)(bg).composite(composites).png().toBuffer();
}
async function generatePawfileMockup(dogId) {
  const dog = await storage.getDog(dogId);
  if (!dog) throw new Error("Dog not found");
  const org = await storage.getOrganization(dog.organizationId);
  if (!org) throw new Error("Organization not found");
  const portrait = await storage.getSelectedPortraitByDog(dog.id);
  if (!portrait || !portrait.generatedImageUrl) throw new Error("No portrait found");
  const portraitBuffer = await fetchImageAsBuffer(portrait.generatedImageUrl);
  const composites = [];
  const bg = await (0, import_sharp2.default)({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: CREAM_BG }
  }).png().toBuffer();
  const topBar = await (0, import_sharp2.default)(Buffer.from(roundedRectSvg(WIDTH, 6, 0, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`))).png().toBuffer();
  composites.push({ input: topBar, top: 0, left: 0 });
  const portraitW = 420;
  const portraitH = 480;
  const portraitTop = 80;
  const portraitLeft = 40;
  const rounded = await makeRoundedImage(portraitBuffer, portraitW, portraitH, 16);
  composites.push({ input: rounded, top: portraitTop, left: portraitLeft });
  const infoLeft = portraitLeft + portraitW + 40;
  const orgLogoSize = 60;
  if (org.logoUrl) {
    try {
      const orgLogoBuf = await fetchImageAsBuffer(org.logoUrl);
      const orgLogo = await makeRoundedImage(orgLogoBuf, orgLogoSize, orgLogoSize, 8);
      composites.push({ input: orgLogo, top: 20, left: WIDTH - orgLogoSize - 30 });
    } catch (e) {
    }
  }
  const nameText = textSvg(dog.name, 48, `rgb(${DARK_TEXT.r},${DARK_TEXT.g},${DARK_TEXT.b})`, 600);
  composites.push({ input: nameText, top: 100, left: infoLeft });
  const breedText = textSvg(dog.breed || "Unknown Breed", 22, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 500, "normal");
  composites.push({ input: breedText, top: 160, left: infoLeft });
  const ageStr = dog.age ? `${dog.age}` : "";
  if (ageStr) {
    const ageText = textSvg(ageStr, 20, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 400, "normal");
    composites.push({ input: ageText, top: 195, left: infoLeft });
  }
  const speciesLabel = (dog.species || "dog") === "cat" ? "Cat" : "Dog";
  const speciesPill = pillSvg(speciesLabel, 16, `rgb(${ORANGE.r},${ORANGE.g},${ORANGE.b})`, "white", 16, 8);
  composites.push({ input: speciesPill.svg, top: 240, left: infoLeft });
  const adoptPill = pillSvg("Featured Pet", 16, `rgb(34,139,34)`, "white", 16, 8);
  composites.push({ input: adoptPill.svg, top: 240, left: infoLeft + speciesPill.width + 12 });
  const orgText = textSvg(`From ${org.name}`, 18, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 500, "normal");
  composites.push({ input: orgText, top: 300, left: infoLeft });
  if (dog.description) {
    const desc2 = dog.description.length > 120 ? dog.description.substring(0, 117) + "..." : dog.description;
    const descText = textSvg(desc2, 16, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 550, "normal");
    composites.push({ input: descText, top: 340, left: infoLeft });
  }
  const poweredByText2 = textSvg("Powered by", 13, `rgb(${MUTED_TEXT.r},${MUTED_TEXT.g},${MUTED_TEXT.b})`, 200, "normal");
  composites.push({ input: poweredByText2, top: HEIGHT - 38, left: WIDTH - 370 });
  const ppLogo2 = pawtraitProsLogoSvg(40);
  composites.push({ input: ppLogo2.svg, top: HEIGHT - 48, left: WIDTH - 280 });
  return (0, import_sharp2.default)(bg).composite(composites).png().toBuffer();
}

// server/routes/portraits.ts
init_subscription();
init_helpers();
init_supabase_storage();

// server/job-queue.ts
var import_crypto = require("crypto");
var jobs = /* @__PURE__ */ new Map();
var pendingQueue = [];
var processing = 0;
var MAX_CONCURRENT = 10;
var workerFn = null;
var CLEANUP_INTERVAL = 5 * 60 * 1e3;
var JOB_TTL = 60 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL && (job.status === "completed" || job.status === "failed")) {
      jobs.delete(id);
    }
  }
}, CLEANUP_INTERVAL);
function registerWorker(fn) {
  workerFn = fn;
}
function enqueue(type, payload, total = 1) {
  const id = (0, import_crypto.randomUUID)();
  const job = {
    id,
    type,
    status: "queued",
    progress: { current: 0, total },
    payload,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  jobs.set(id, job);
  pendingQueue.push(id);
  processNext();
  return id;
}
function getJob(id) {
  return jobs.get(id);
}
function getJobs(ids) {
  return ids.map((id) => jobs.get(id));
}
function processNext() {
  if (!workerFn || processing >= MAX_CONCURRENT || pendingQueue.length === 0) return;
  const jobId = pendingQueue.shift();
  const job = jobs.get(jobId);
  if (!job || job.status !== "queued") {
    processNext();
    return;
  }
  processing++;
  job.status = "processing";
  job.updatedAt = Date.now();
  const worker = workerFn;
  worker(job).then((result) => {
    job.status = "completed";
    job.result = result;
    job.progress = { current: job.progress.total, total: job.progress.total };
    job.updatedAt = Date.now();
  }).catch((err) => {
    job.status = "failed";
    job.error = err?.message || "Generation failed. Please try again.";
    job.updatedAt = Date.now();
    console.error(`[job-queue] Job ${jobId} failed:`, err?.message || err);
  }).finally(() => {
    processing--;
    processNext();
  });
  processNext();
}

// server/routes/portraits.ts
import_sharp3.default.cache(false);
var MAX_STYLES_PER_PET = 5;
function registerPortraitRoutes(app2) {
  registerWorker(async (job) => {
    const p = job.payload;
    if (job.type === "generate") {
      const generatedImageRaw = await generateImage(p.prompt, p.originalImage || void 0);
      let generatedImage = generatedImageRaw;
      try {
        const fname = `portrait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        generatedImage = await uploadToStorage(generatedImageRaw, "portraits", fname);
      } catch (err) {
        console.error("[storage-upload] Portrait upload failed, using base64 fallback:", err);
      }
      let portraitRecord = p.existingPortrait ? { ...p.existingPortrait } : null;
      if (p.dogId && p.styleId) {
        if (p.existingPortrait) {
          await storage.updatePortrait(p.existingPortrait.id, {
            previousImageUrl: p.existingPortrait.generatedImageUrl || null,
            generatedImageUrl: generatedImage
          });
          await storage.incrementPortraitEditCount(p.existingPortrait.id);
          await storage.selectPortraitForGallery(p.dogId, p.existingPortrait.id);
          portraitRecord = {
            ...p.existingPortrait,
            editCount: p.existingPortrait.editCount + 1,
            generatedImageUrl: generatedImage,
            previousImageUrl: p.existingPortrait.generatedImageUrl || null
          };
        } else {
          portraitRecord = await storage.createPortrait({
            dogId: p.dogId,
            styleId: p.styleId,
            generatedImageUrl: generatedImage
          });
          await storage.selectPortraitForGallery(p.dogId, portraitRecord.id);
          await storage.incrementOrgPortraitsUsed(p.orgId);
        }
      }
      return {
        generatedImage,
        dogName: p.dogName,
        portraitId: portraitRecord?.id,
        editCount: portraitRecord ? portraitRecord.editCount : null,
        maxEdits: MAX_EDITS_PER_IMAGE,
        isNewPortrait: p.isNewPortrait,
        hasPreviousImage: !!portraitRecord?.previousImageUrl
      };
    }
    if (job.type === "edit") {
      const editedImageRaw = await editImage(p.imageForEdit, p.editPrompt);
      let editedImage = editedImageRaw;
      try {
        const fname = `portrait-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        editedImage = await uploadToStorage(editedImageRaw, "portraits", fname);
      } catch (err) {
        console.error("[storage-upload] Edited portrait upload failed, using base64 fallback:", err);
      }
      let editCount = null;
      if (p.portraitId) {
        const existing = await storage.getPortrait(p.portraitId);
        await storage.updatePortrait(p.portraitId, {
          previousImageUrl: existing?.generatedImageUrl || null,
          generatedImageUrl: editedImage
        });
        await storage.incrementPortraitEditCount(p.portraitId);
        const updated = await storage.getPortrait(p.portraitId);
        editCount = updated?.editCount ?? null;
      }
      return {
        editedImage,
        editCount,
        maxEdits: MAX_EDITS_PER_IMAGE,
        hasPreviousImage: true
      };
    }
    if (job.type === "batch") {
      let generatedImageUrl = await generateImage(p.prompt, p.originalPhotoUrl);
      try {
        const fname = `portrait-${p.dogId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        generatedImageUrl = await uploadToStorage(generatedImageUrl, "portraits", fname);
      } catch (err) {
        console.error("[storage-upload] Batch portrait upload failed, using base64 fallback:", err);
      }
      const portrait = await storage.createPortrait({
        dogId: p.dogId,
        styleId: p.styleId,
        generatedImageUrl,
        isSelected: true
      });
      await storage.incrementOrgPortraitsUsed(p.orgId);
      if (p.needsPetCode) {
        const petCode = generatePetCode(p.dogName);
        await storage.updateDog(p.dogId, { petCode });
      }
      return {
        dogId: p.dogId,
        success: true,
        portraitId: portrait.id,
        generatedImageUrl
      };
    }
    throw new Error(`Unknown job type: ${job.type}`);
  });
  app2.get("/api/portraits/:id/image", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const portrait = await storage.getPortrait(id);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).send("Image not found");
      }
      const dataUri = portrait.generatedImageUrl;
      if (!dataUri.startsWith("data:")) {
        return res.redirect(dataUri);
      }
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }
      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], "base64");
      res.set({
        "Content-Type": contentType,
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400"
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving portrait image:", error);
      res.status(500).send("Error loading image");
    }
  });
  app2.get("/api/portraits/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const portrait = await storage.getPortrait(id);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).send("Image not found");
      }
      const portraitBuffer = await fetchImageAsBuffer(portrait.generatedImageUrl);
      const dog = await storage.getDog(portrait.dogId);
      if (!dog) {
        res.set({ "Content-Type": "image/png", "Content-Disposition": "attachment; filename=portrait.png" });
        return res.send(portraitBuffer);
      }
      const org = await storage.getOrganization(dog.organizationId);
      if (!org || !org.logoUrl) {
        res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename=${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png` });
        return res.send(portraitBuffer);
      }
      let logoBuffer;
      try {
        logoBuffer = await fetchImageAsBuffer(org.logoUrl);
      } catch {
        res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename=${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png` });
        return res.send(portraitBuffer);
      }
      const portraitMeta = await (0, import_sharp3.default)(portraitBuffer).metadata();
      const pw = portraitMeta.width || 1024;
      const ph = portraitMeta.height || 1024;
      const logoSize = Math.max(48, Math.round(Math.min(pw, ph) * 0.08));
      const margin = Math.round(logoSize * 0.4);
      const resizedLogo = await (0, import_sharp3.default)(logoBuffer).resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().png().toBuffer();
      const circleSize = logoSize + 8;
      const circleSvg = Buffer.from(
        `<svg width="${circleSize}" height="${circleSize}"><circle cx="${circleSize / 2}" cy="${circleSize / 2}" r="${circleSize / 2}" fill="rgba(255,255,255,0.6)"/></svg>`
      );
      const logoBadge = await (0, import_sharp3.default)(circleSvg).composite([{ input: resizedLogo, gravity: "center" }]).png().toBuffer();
      const result = await (0, import_sharp3.default)(portraitBuffer).composite([{
        input: logoBadge,
        top: ph - circleSize - margin,
        left: pw - circleSize - margin
      }]).png().toBuffer();
      const filename = `${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png`;
      res.set({
        "Content-Type": "image/png",
        "Content-Length": result.length.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600"
      });
      res.send(result);
    } catch (error) {
      console.error("Error serving watermarked portrait:", error);
      res.status(500).send("Error loading image");
    }
  });
  app2.get("/api/organizations/:id/logo", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const org = await storage.getOrganization(id);
      if (!org || !org.logoUrl) {
        return res.status(404).send("Logo not found");
      }
      const dataUri = org.logoUrl;
      if (!dataUri.startsWith("data:")) {
        return res.redirect(dataUri);
      }
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid logo data");
      }
      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], "base64");
      res.set({
        "Content-Type": contentType,
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400"
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving org logo:", error);
      res.status(500).send("Error loading logo");
    }
  });
  app2.get("/api/business/:slug/og-image", async (req, res) => {
    try {
      const slug = req.params.slug;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) {
        res.status(404).send("Organization not found");
        return;
      }
      const imageBuffer = await generateShowcaseMockup(org.id);
      res.set({
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating business OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });
  app2.get("/api/pawfile/:id/og-image", async (req, res) => {
    try {
      const dogId = parseInt(req.params.id);
      if (isNaN(dogId)) {
        res.status(400).send("Invalid ID");
        return;
      }
      const imageBuffer = await generatePawfileMockup(dogId);
      res.set({
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating pawfile OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });
  app2.get("/api/dogs/:dogId/portraits", isAuthenticated, async (req, res) => {
    try {
      const dogId = parseInt(req.params.dogId);
      if (isNaN(dogId)) {
        return res.status(400).json({ error: "Invalid pet ID" });
      }
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const dog = await storage.getDog(dogId);
      if (!dog || !dog.organizationId) {
        return res.status(404).json({ error: "Pet not found" });
      }
      if (!userIsAdmin) {
        const userOrg = await storage.getOrganizationByOwner(userId);
        if (!userOrg || userOrg.id !== dog.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const dogPortraits = await storage.getPortraitsByDog(dogId);
      res.json(dogPortraits);
    } catch (error) {
      console.error("Error fetching portraits:", error);
      res.status(500).json({ error: "Failed to fetch portraits" });
    }
  });
  app2.post("/api/generate-portrait", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { prompt, dogName, originalImage, dogId, styleId, organizationId } = req.body;
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Prompt is required" });
      if (prompt.length > 2e3) {
        return res.status(400).json({ error: "Invalid prompt. Maximum 2000 characters." });
      }
      if (dogName && (typeof dogName !== "string" || dogName.length > 100)) {
        return res.status(400).json({ error: "Invalid dog name." });
      }
      if (originalImage && typeof originalImage === "string" && !originalImage.startsWith("data:image/") && !originalImage.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid image format." });
      }
      let resolvedImage = originalImage || null;
      if (resolvedImage && !isDataUri(resolvedImage)) {
        try {
          const buf = await fetchImageAsBuffer(resolvedImage);
          resolvedImage = `data:image/png;base64,${buf.toString("base64")}`;
        } catch (err) {
          console.error("[generate-portrait] Failed to fetch source image:", err);
          return res.status(400).json({ error: "Could not load the source image. Please re-upload the photo." });
        }
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
        const resolved = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : void 0);
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
              maxEdits: MAX_EDITS_PER_IMAGE
            });
          }
        } else {
          isNewPortrait = true;
          const existingPortraits = await storage.getPortraitsByDog(parsedDogId);
          const uniqueStyles = new Set(existingPortraits.map((p) => p.styleId));
          if (uniqueStyles.size >= MAX_STYLES_PER_PET) {
            return res.status(403).json({
              error: `This pet already has ${MAX_STYLES_PER_PET} styles. Edit an existing style or remove one first.`,
              stylesUsed: uniqueStyles.size,
              maxStyles: MAX_STYLES_PER_PET
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
                  creditsLimit: plan.monthlyPortraitCredits
                });
              }
            }
          }
        }
      }
      const jobId = enqueue("generate", {
        prompt: sanitizedPrompt,
        originalImage: resolvedImage,
        dogName: dogName ? sanitizeForPrompt(dogName) : dogName,
        dogId: dogId ? parseInt(dogId) : null,
        styleId: styleId ? parseInt(styleId) : null,
        orgId: org.id,
        existingPortrait: existingPortrait ? {
          id: existingPortrait.id,
          editCount: existingPortrait.editCount,
          generatedImageUrl: existingPortrait.generatedImageUrl
        } : null,
        isNewPortrait
      });
      res.status(202).json({ jobId });
    } catch (error) {
      console.error("[generate-portrait]", error);
      res.status(500).json({ error: "Failed to start portrait generation. Please try again." });
    }
  });
  app2.post("/api/edit-portrait", isAuthenticated, aiRateLimiter, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { currentImage, editPrompt, dogId, portraitId } = req.body;
      if (!currentImage) return res.status(400).json({ error: "Current image is required" });
      if (!editPrompt || typeof editPrompt !== "string") return res.status(400).json({ error: "Edit instructions are required" });
      if (editPrompt.length > 500) return res.status(400).json({ error: "Edit instructions too long (max 500 characters)." });
      const sanitizedEditPrompt = sanitizeForPrompt(editPrompt);
      if (!sanitizedEditPrompt) return res.status(400).json({ error: "Edit instructions contain invalid characters." });
      const { org, error, status } = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : void 0);
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
        const dog = await storage.getDog(portrait.dogId);
        if (!dog || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to edit this portrait" });
        }
        if (portrait.editCount >= MAX_EDITS_PER_IMAGE) {
          return res.status(403).json({
            error: `You've used all ${MAX_EDITS_PER_IMAGE} edits for this portrait. Try a different style!`,
            editCount: portrait.editCount,
            maxEdits: MAX_EDITS_PER_IMAGE
          });
        }
      }
      let imageForEdit = currentImage;
      if (!isDataUri(currentImage)) {
        const buf = await fetchImageAsBuffer(currentImage);
        imageForEdit = `data:image/png;base64,${buf.toString("base64")}`;
      }
      const jobId = enqueue("edit", {
        imageForEdit,
        editPrompt: sanitizedEditPrompt,
        portraitId: portraitId ? parseInt(portraitId) : null
      });
      res.status(202).json({ jobId });
    } catch (error) {
      console.error("[edit-portrait]", error);
      res.status(500).json({ error: "Failed to start portrait edit. Please try again." });
    }
  });
  app2.post("/api/revert-portrait", isAuthenticated, async (req, res) => {
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
        previousImageUrl: null
      });
      res.json({
        revertedImage: portrait.previousImageUrl,
        portraitId: portrait.id,
        editCount: portrait.editCount,
        hasPreviousImage: false
      });
    } catch (error) {
      console.error("[revert-portrait]", error);
      res.status(500).json({ error: "Failed to revert portrait. Please try again." });
    }
  });
}

// server/routes/batch.ts
init_storage();
init_db();
init_pack_config();
init_delivery();
init_helpers();
function registerBatchRoutes(app2) {
  app2.post("/api/generate-batch", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      const { dogIds, packType, styleId, organizationId } = req.body;
      if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
        return res.status(400).json({ error: "dogIds array is required" });
      }
      if (!packType || !["celebrate", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType" });
      }
      let org;
      if (userIsAdmin && organizationId) {
        org = await storage.getOrganization(parseInt(organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });
      const allStyles = await storage.getAllPortraitStyles();
      const jobIds = [];
      const errors = [];
      for (const dogId of dogIds) {
        const dog = await storage.getDog(dogId);
        if (!dog || dog.organizationId !== org.id) {
          errors.push({ dogId, error: "Dog not found or wrong org" });
          continue;
        }
        if (!dog.originalPhotoUrl) {
          errors.push({ dogId, error: "No photo uploaded" });
          continue;
        }
        const petSpecies = dog.species || "dog";
        const packs = getPacks(petSpecies);
        const pack = packs.find((p) => p.type === packType);
        if (!pack) {
          errors.push({ dogId, error: "Pack not found for species" });
          continue;
        }
        const packStyles = pack.styleIds.map((id) => allStyles.find((s) => s.id === id)).filter(Boolean);
        if (packStyles.length === 0) {
          errors.push({ dogId, error: "No styles found for this pack" });
          continue;
        }
        let style;
        if (styleId) {
          style = packStyles.find((s) => s.id === parseInt(styleId));
          if (!style) {
            errors.push({ dogId, error: "Selected style not in this pack" });
            continue;
          }
        } else {
          const usedStyleIds = await storage.getUsedStyleIdsForDog(dogId);
          const availableStyles = packStyles.filter((s) => !usedStyleIds.includes(s.id));
          if (availableStyles.length > 0) {
            style = availableStyles[Math.floor(Math.random() * availableStyles.length)];
          } else {
            style = packStyles[Math.floor(Math.random() * packStyles.length)];
          }
        }
        if (!style) {
          errors.push({ dogId, error: "Could not select style" });
          continue;
        }
        const species = dog.species || "dog";
        const breed = dog.breed || species;
        const prompt = sanitizeForPrompt(
          style.promptTemplate.replace(/\{breed\}/g, breed).replace(/\{species\}/g, species).replace(/\{name\}/g, dog.name)
        );
        const jobId = enqueue("batch", {
          dogId: dog.id,
          dogName: dog.name,
          prompt,
          originalPhotoUrl: dog.originalPhotoUrl,
          styleId: style.id,
          orgId: org.id,
          needsPetCode: !dog.petCode
        });
        jobIds.push({ dogId: dog.id, jobId });
      }
      res.status(202).json({
        jobIds,
        errors,
        status: "generating",
        totalQueued: jobIds.filter((j) => j.jobId).length
      });
    } catch (error) {
      console.error("Error in batch generation:", error.message);
      res.status(500).json({ error: "Batch generation failed" });
    }
  });
  app2.post("/api/deliver-batch", isAuthenticated, async (req, res) => {
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
      const results = [];
      for (const dogId of dogIds) {
        try {
          const dog = await storage.getDog(dogId);
          if (!dog || dog.organizationId !== org.id) {
            results.push({ dogId, sent: false, error: "Dog not found" });
            continue;
          }
          const result = await deliverPortraitToOwner(dog, org);
          results.push({ dogId, ...result });
        } catch (err) {
          results.push({ dogId, sent: false, error: err.message });
        }
      }
      res.json({ results, totalSent: results.filter((r) => r.sent).length });
    } catch (error) {
      console.error("Error in batch delivery:", error.message);
      res.status(500).json({ error: "Batch delivery failed" });
    }
  });
  app2.post("/api/batch/start", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const { orgId: bodyOrgId } = req.body;
      let orgId = null;
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
    } catch (error) {
      console.error("Error starting batch session:", error);
      res.status(500).json({ error: "Failed to start batch session" });
    }
  });
  app2.post("/api/batch/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }
      const userId = req.user.claims.sub;
      const { photo } = req.body;
      if (!photo) {
        return res.status(400).json({ error: "Photo data is required" });
      }
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
      if (batch.owner_id !== userId) {
        const userEmail = req.user.claims.email;
        if (userEmail !== process.env.ADMIN_EMAIL) {
          return res.status(403).json({ error: "Not authorized to access this batch" });
        }
      }
      if (batch.status !== "uploading" && batch.status !== "assigning") {
        return res.status(400).json({ error: "Batch is no longer accepting photos" });
      }
      if (batch.photo_count >= 20) {
        return res.status(400).json({ error: "Maximum 20 photos per batch" });
      }
      const photoResult = await pool.query(
        `INSERT INTO batch_photos (batch_session_id, photo_url)
         VALUES ($1, $2) RETURNING id`,
        [batchId, photo]
      );
      await pool.query(
        `UPDATE batch_sessions SET photo_count = photo_count + 1 WHERE id = $1`,
        [batchId]
      );
      res.json({ photoId: photoResult.rows[0].id, photoCount: batch.photo_count + 1 });
    } catch (error) {
      console.error("Error uploading batch photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
  app2.patch("/api/batch/:id/photos/:photoId", isAuthenticated, async (req, res) => {
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
      const batchResult = await pool.query(
        `SELECT bs.organization_id, o.owner_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }
      const userId = req.user.claims.sub;
      if (batchResult.rows[0].owner_id !== userId) {
        const userEmail = req.user.claims.email;
        if (userEmail !== process.env.ADMIN_EMAIL) {
          return res.status(403).json({ error: "Not authorized to access this batch" });
        }
      }
      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== batchResult.rows[0].organization_id) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to this organization" });
      }
      await pool.query(
        `UPDATE batch_photos SET dog_id = $1, assigned_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND batch_session_id = $3`,
        [parseInt(dogId), photoId, batchId]
      );
      await pool.query(
        `UPDATE batch_sessions SET status = 'assigning' WHERE id = $1 AND status = 'uploading'`,
        [batchId]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning batch photo:", error);
      res.status(500).json({ error: "Failed to assign photo" });
    }
  });
  app2.post("/api/batch/:id/generate", isAuthenticated, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const { packType } = req.body;
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }
      const batchResult = await pool.query(
        `SELECT bs.*, o.industry_type, o.id as org_id, o.owner_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }
      const batch = batchResult.rows[0];
      const userId = req.user.claims.sub;
      if (batch.owner_id !== userId) {
        const userEmail = req.user.claims.email;
        if (userEmail !== process.env.ADMIN_EMAIL) {
          return res.status(403).json({ error: "Not authorized to access this batch" });
        }
      }
      const photosResult = await pool.query(
        `SELECT * FROM batch_photos WHERE batch_session_id = $1 AND dog_id IS NOT NULL ORDER BY id`,
        [batchId]
      );
      if (photosResult.rows.length === 0) {
        return res.status(400).json({ error: "No photos have been assigned to pets yet" });
      }
      await pool.query(
        `UPDATE batch_sessions SET status = 'generating' WHERE id = $1`,
        [batchId]
      );
      res.status(202).json({
        batchId,
        status: "generating",
        assignedPhotos: photosResult.rows.length,
        packType: packType || "celebrate",
        message: `Generating portraits for ${photosResult.rows.length} photos. Check batch status for progress.`
      });
    } catch (error) {
      console.error("Error generating batch portraits:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });
  app2.get("/api/batch/:id", isAuthenticated, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }
      const batchResult = await pool.query(
        `SELECT bs.*, o.owner_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }
      const userId = req.user.claims.sub;
      if (batchResult.rows[0].owner_id !== userId) {
        const userEmail = req.user.claims.email;
        if (userEmail !== process.env.ADMIN_EMAIL) {
          return res.status(403).json({ error: "Not authorized to access this batch" });
        }
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
        photos: photosResult.rows
      });
    } catch (error) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ error: "Failed to fetch batch" });
    }
  });
}

// server/routes/merch.ts
init_storage();
init_db();
init_stripeClient();

// server/printful-config.ts
var PRINTFUL_PRODUCTS = {
  // --- UNFRAMED MATTE PRINT ---
  print_8x10: {
    variantId: 4463,
    name: "Enhanced Matte Print \u2014 8\xD710",
    category: "print",
    size: "8x10",
    priceCents: 4500
    // $45.00
  },
  // --- MUGS ---
  mug_11oz: {
    variantId: 1320,
    name: "White Glossy Mug \u2014 11 oz",
    category: "mug",
    size: "11oz",
    priceCents: 3500
    // $35.00
  },
  mug_15oz: {
    variantId: 4830,
    name: "White Glossy Mug \u2014 15 oz",
    category: "mug",
    size: "15oz",
    priceCents: 4e3
    // $40.00
  },
  // --- TOTE ---
  tote_natural: {
    variantId: 4533,
    name: "All-Over Print Tote Bag",
    category: "tote",
    priceCents: 8500
    // $85.00
  },
  // --- FRAMED PRINTS: 8×10 ---
  frame_8x10_wood: {
    variantId: 11790,
    name: "Framed Poster 8\xD710 \u2014 Wood",
    category: "frame",
    size: "8x10",
    frameColor: "wood",
    priceCents: 13500
    // $135.00
  },
  frame_8x10_black: {
    variantId: 11789,
    name: "Framed Poster 8\xD710 \u2014 Black",
    category: "frame",
    size: "8x10",
    frameColor: "black",
    priceCents: 13500
  },
  frame_8x10_white: {
    variantId: 11791,
    name: "Framed Poster 8\xD710 \u2014 White",
    category: "frame",
    size: "8x10",
    frameColor: "white",
    priceCents: 13500
  },
  // --- FRAMED PRINTS: 11×14 ---
  frame_11x14_wood: {
    variantId: 11793,
    name: "Framed Poster 11\xD714 \u2014 Wood",
    category: "frame",
    size: "11x14",
    frameColor: "wood",
    priceCents: 16900
    // $169.00
  },
  frame_11x14_black: {
    variantId: 11792,
    name: "Framed Poster 11\xD714 \u2014 Black",
    category: "frame",
    size: "11x14",
    frameColor: "black",
    priceCents: 16900
  },
  frame_11x14_white: {
    variantId: 11794,
    name: "Framed Poster 11\xD714 \u2014 White",
    category: "frame",
    size: "11x14",
    frameColor: "white",
    priceCents: 16900
  },
  // --- FRAMED PRINTS: 12×16 ---
  frame_12x16_wood: {
    variantId: 11796,
    name: "Framed Poster 12\xD716 \u2014 Wood",
    category: "frame",
    size: "12x16",
    frameColor: "wood",
    priceCents: 20900
    // $209.00
  },
  frame_12x16_black: {
    variantId: 11795,
    name: "Framed Poster 12\xD716 \u2014 Black",
    category: "frame",
    size: "12x16",
    frameColor: "black",
    priceCents: 20900
  },
  frame_12x16_white: {
    variantId: 11797,
    name: "Framed Poster 12\xD716 \u2014 White",
    category: "frame",
    size: "12x16",
    frameColor: "white",
    priceCents: 20900
  }
};
function getProductsByCategory(category) {
  return Object.values(PRINTFUL_PRODUCTS).filter((p) => p.category === category);
}
function getProduct(key) {
  return PRINTFUL_PRODUCTS[key];
}
function getFrameSizes() {
  return [...new Set(
    Object.values(PRINTFUL_PRODUCTS).filter((p) => p.category === "frame" && p.size).map((p) => p.size)
  )];
}
function getFrameColors(size) {
  return Object.values(PRINTFUL_PRODUCTS).filter((p) => p.category === "frame" && p.size === size && p.frameColor).map((p) => p.frameColor);
}

// server/printful.ts
var PRINTFUL_BASE = "https://api.printful.com";
var PRINTFUL_STORE_ID = "17752122";
function getApiKey() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY env var is not set");
  return key;
}
async function printfulFetch(path5, options = {}) {
  const url = `${PRINTFUL_BASE}${path5}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": PRINTFUL_STORE_ID,
      ...options.headers
    }
  });
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.result || data?.error?.message || `Printful API error ${response.status}`;
    throw new Error(`Printful ${response.status}: ${errorMsg}`);
  }
  return data;
}
async function createOrder(recipient, items, externalId) {
  const body = {
    recipient,
    items,
    packing_slip: {
      email: "hello@pawtraitpros.com",
      phone: "",
      message: "Thank you for your Pawtrait Pros order! Your pet's portrait was created with love.",
      logo_url: ""
      // TODO: add Pawtrait Pros logo URL once hosted
    }
  };
  if (externalId) {
    body.external_id = externalId;
  }
  const data = await printfulFetch("/orders", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return data.result;
}
async function confirmOrder(orderId) {
  const data = await printfulFetch(`/orders/${orderId}/confirm`, {
    method: "POST"
  });
  return data.result;
}
async function getOrder(orderId) {
  const data = await printfulFetch(`/orders/${orderId}`);
  return data.result;
}
async function estimateShipping(recipient, items) {
  const data = await printfulFetch("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient, items })
  });
  return data.result;
}
function buildOrderItem(variantId, quantity, imageUrl) {
  return {
    variant_id: variantId,
    quantity,
    files: [
      {
        type: "default",
        url: imageUrl
      }
    ]
  };
}

// server/routes/merch.ts
init_email();
init_helpers();
init_gelato_config();

// server/card-artwork.ts
var import_sharp5 = __toESM(require("sharp"), 1);
init_supabase_storage();
init_gelato_config();
import_sharp5.default.cache(false);
function roundedRectSvg2(w, h, r, fill) {
  return `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"/></svg>`;
}
function textSvg2(text2, fontSize, color, maxWidth, fontWeight = "bold", align = "start") {
  const escaped = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const anchor = align === "middle" ? "middle" : "start";
  const x = align === "middle" ? maxWidth / 2 : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${Math.round(fontSize * 1.5)}">
    <text x="${x}" y="${fontSize}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${anchor}">${escaped}</text>
  </svg>`;
  return Buffer.from(svg);
}
function multiLineTextSvg(lines, fontSize, color, maxWidth, fontWeight = "normal", lineHeight = 1.6, align = "middle") {
  const anchor = align === "middle" ? "middle" : "start";
  const x = align === "middle" ? maxWidth / 2 : 0;
  const totalHeight = Math.round(fontSize * lineHeight * lines.length);
  const escapedLines = lines.map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  const tspans = escapedLines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? fontSize : Math.round(fontSize * lineHeight)}">${l}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${totalHeight + 20}">
    <text font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${anchor}">${tspans}</text>
  </svg>`;
  return Buffer.from(svg);
}
function decorativeBorderSvg(w, h, color, thickness, radius) {
  const inset = thickness / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="${inset}" y="${inset}" width="${w - thickness}" height="${h - thickness}" rx="${radius}" ry="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}"/>
  </svg>`;
  return Buffer.from(svg);
}
async function resizeToFit2(imageBuffer, maxW, maxH) {
  return (0, import_sharp5.default)(imageBuffer).resize(maxW, maxH, { fit: "cover", position: "top" }).png().toBuffer();
}
async function makeRoundedImage2(imageBuffer, w, h, radius) {
  const resized = await resizeToFit2(imageBuffer, w, h);
  const mask = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  );
  return (0, import_sharp5.default)(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}
async function generateFlatCardArtwork(portraitUrl, occasion, petName, orgName) {
  const { width: W, height: H } = CARD_DIMENSIONS.flat_front;
  const { primary, secondary, textColor } = occasion.templateColors;
  const portraitBuf = await fetchImageAsBuffer(portraitUrl);
  const composites = [];
  const bg = await (0, import_sharp5.default)({
    create: { width: W, height: H, channels: 4, background: hexToRgb(secondary) }
  }).png().toBuffer();
  composites.push({ input: decorativeBorderSvg(W, H, primary, 16, 24), top: 0, left: 0 });
  composites.push({ input: decorativeBorderSvg(W - 60, H - 60, primary, 4, 16), top: 30, left: 30 });
  const greetingText = textSvg2(occasion.greetingText, 72, textColor, W - 120, "bold", "middle");
  composites.push({ input: greetingText, top: 80, left: 60 });
  const portraitW = W - 200;
  const portraitH = H - 550;
  const roundedPortrait = await makeRoundedImage2(portraitBuf, portraitW, portraitH, 20);
  const portraitLeft = Math.round((W - portraitW) / 2);
  composites.push({ input: roundedPortrait, top: 220, left: portraitLeft });
  const nameText = textSvg2(petName, 52, textColor, W - 120, "bold", "middle");
  composites.push({ input: nameText, top: 220 + portraitH + 30, left: 60 });
  const fromText = textSvg2(`from ${orgName}`, 24, primary, W - 120, "normal", "middle");
  composites.push({ input: fromText, top: H - 80, left: 60 });
  return (0, import_sharp5.default)(bg).composite(composites).png().toBuffer();
}
async function generateFlatCardBack(orgName) {
  const { width: W, height: H } = CARD_DIMENSIONS.flat_back;
  const composites = [];
  const bg = await (0, import_sharp5.default)({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } }
  }).png().toBuffer();
  const orgText = textSvg2(orgName, 32, "#666666", W - 200, "normal", "middle");
  composites.push({ input: orgText, top: Math.round(H / 2) - 40, left: 100 });
  const poweredText = textSvg2("Powered by Pawtrait Pros", 22, "#999999", W - 200, "normal", "middle");
  composites.push({ input: poweredText, top: Math.round(H / 2) + 10, left: 100 });
  return (0, import_sharp5.default)(bg).composite(composites).png().toBuffer();
}
async function generateFoldedOutsideArtwork(portraitUrl, occasion, petName, orgName) {
  const { width: W, height: H } = CARD_DIMENSIONS.folded_outside;
  const { primary, secondary, textColor } = occasion.templateColors;
  const portraitBuf = await fetchImageAsBuffer(portraitUrl);
  const composites = [];
  const bg = await (0, import_sharp5.default)({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } }
  }).png().toBuffer();
  const halfH = Math.round(H / 2);
  const frontBg = await (0, import_sharp5.default)(Buffer.from(roundedRectSvg2(W, halfH, 0, secondary))).png().toBuffer();
  composites.push({ input: frontBg, top: 0, left: 0 });
  composites.push({ input: decorativeBorderSvg(W - 40, halfH - 40, primary, 4, 12), top: 20, left: 20 });
  const greetingText = textSvg2(occasion.greetingText, 42, textColor, W - 120, "bold", "middle");
  composites.push({ input: greetingText, top: 30, left: 60 });
  const portraitSize = halfH - 200;
  const roundedPortrait = await makeRoundedImage2(portraitBuf, portraitSize, portraitSize, 16);
  composites.push({ input: roundedPortrait, top: 95, left: Math.round((W - portraitSize) / 2) });
  const nameText = textSvg2(petName, 34, textColor, W - 120, "bold", "middle");
  composites.push({ input: nameText, top: 95 + portraitSize + 10, left: 60 });
  const backTop = halfH;
  const orgText = textSvg2(orgName, 28, "#666666", W - 200, "normal", "middle");
  composites.push({ input: orgText, top: backTop + Math.round(halfH / 2) - 30, left: 100 });
  const poweredText = textSvg2("Powered by Pawtrait Pros", 20, "#999999", W - 200, "normal", "middle");
  composites.push({ input: poweredText, top: backTop + Math.round(halfH / 2) + 10, left: 100 });
  return (0, import_sharp5.default)(bg).composite(composites).png().toBuffer();
}
async function generateFoldedInsideArtwork(occasion, petName) {
  const { width: W, height: H } = CARD_DIMENSIONS.folded_inside;
  const { primary, textColor } = occasion.templateColors;
  const composites = [];
  const bg = await (0, import_sharp5.default)({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255 } }
  }).png().toBuffer();
  const halfH = Math.round(H / 2);
  const lineSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W - 200}" height="4"><rect x="0" y="0" width="${W - 200}" height="4" rx="2" ry="2" fill="${primary}" opacity="0.3"/></svg>`
  );
  composites.push({ input: lineSvg, top: halfH - 20, left: 100 });
  const greetingTop = halfH + 80;
  const greetingText = textSvg2(occasion.greetingText, 64, textColor, W - 160, "bold", "middle");
  composites.push({ input: greetingText, top: greetingTop, left: 80 });
  const personalizedSub = occasion.subText.replace(/\b(your|you)\b/gi, petName + "'s");
  const subLines = wrapText(personalizedSub, 35);
  const subText = multiLineTextSvg(subLines, 32, primary, W - 160, "normal", 1.6, "middle");
  composites.push({ input: subText, top: greetingTop + 110, left: 80 });
  const heartSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${primary}" opacity="0.4">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`
  );
  composites.push({ input: heartSvg, top: greetingTop + 280, left: Math.round(W / 2) - 20 });
  return (0, import_sharp5.default)(bg).composite(composites).png().toBuffer();
}
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}
function wrapText(text2, maxCharsPerLine) {
  const words = text2.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
function bufferToDataUri(buffer, mimeType = "image/png") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// server/routes/merch.ts
init_supabase_storage();
function registerMerchRoutes(app2) {
  const previewCache = /* @__PURE__ */ new Map();
  const PREVIEW_CACHE_TTL = 15 * 60 * 1e3;
  const PREVIEW_CACHE_MAX = 50;
  function getCachedPreview(key) {
    const entry = previewCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > PREVIEW_CACHE_TTL) {
      previewCache.delete(key);
      return null;
    }
    return entry.buffer;
  }
  function setCachedPreview(key, buffer) {
    if (previewCache.size >= PREVIEW_CACHE_MAX) {
      const oldest = [...previewCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) previewCache.delete(oldest[0]);
    }
    previewCache.set(key, { buffer, timestamp: Date.now() });
  }
  app2.get("/api/merch/products", async (req, res) => {
    try {
      res.json({
        frames: getProductsByCategory("frame"),
        mugs: getProductsByCategory("mug"),
        totes: getProductsByCategory("tote"),
        frameSizes: getFrameSizes(),
        frameColors: getFrameColors("8x10")
        // all sizes have same colors
      });
    } catch (error) {
      console.error("Error fetching merch products:", error);
      res.status(500).json({ error: "Failed to fetch merch products" });
    }
  });
  app2.post("/api/merch/estimate", isAuthenticated, async (req, res) => {
    try {
      const { items, address } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required" });
      }
      if (!address || !address.address1 || !address.city || !address.state_code || !address.zip || !address.country_code) {
        return res.status(400).json({ error: "Complete shipping address is required" });
      }
      const recipient = {
        name: address.name || "Customer",
        address1: address.address1,
        city: address.city,
        state_code: address.state_code,
        zip: address.zip,
        country_code: address.country_code
      };
      const printfulItems = items.map((item) => {
        const product = getProduct(item.productKey);
        if (!product) throw new Error(`Unknown product: ${item.productKey}`);
        return { variant_id: product.variantId, quantity: item.quantity || 1 };
      });
      const rates = await estimateShipping(recipient, printfulItems);
      res.json({ rates });
    } catch (error) {
      console.error("Error estimating shipping:", error);
      res.status(500).json({ error: "Failed to estimate shipping" });
    }
  });
  app2.post("/api/merch/checkout", publicExpensiveRateLimiter, async (req, res) => {
    try {
      const { items, customer, address, imageUrl, portraitId, dogId, orgId, sessionToken } = req.body;
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
      let subtotalCents = 0;
      const validatedItems = [];
      for (const item of items) {
        const isCard = item.productKey.startsWith("card_");
        const printfulProduct = isCard ? null : getProduct(item.productKey);
        const gelatoProduct = isCard ? getGelatoProduct(item.productKey) : null;
        if (!printfulProduct && !gelatoProduct) {
          return res.status(400).json({ error: `Unknown product: ${item.productKey}` });
        }
        const priceCents = printfulProduct?.priceCents || gelatoProduct?.priceCents || 0;
        const qty = item.quantity || 1;
        subtotalCents += priceCents * qty;
        validatedItems.push({
          productKey: item.productKey,
          variantId: printfulProduct?.variantId || 0,
          quantity: qty,
          priceCents,
          occasion: isCard ? item.occasion || void 0 : void 0
        });
      }
      const recipient = {
        name: customer.name,
        address1: address.address1,
        city: address.city,
        state_code: address.state_code,
        zip: address.zip,
        country_code: address.country_code || "US",
        email: customer.email,
        phone: customer.phone
      };
      let shippingCents = 0;
      try {
        const printfulShippingItems = validatedItems.filter((i) => !i.productKey.startsWith("card_")).map((i) => ({ variant_id: i.variantId, quantity: i.quantity }));
        if (printfulShippingItems.length === 0) throw new Error("No Printful items for shipping estimate");
        const rates = await estimateShipping(recipient, printfulShippingItems);
        if (rates.length > 0) {
          shippingCents = Math.round(parseFloat(rates[0].rate) * 100);
        }
      } catch (shippingErr) {
        console.warn("[merch] Shipping estimate failed, proceeding with $0:", shippingErr.message);
      }
      const totalCents = subtotalCents + shippingCents;
      const orderResult = await pool.query(
        `INSERT INTO merch_orders (
          organization_id, dog_id, portrait_id,
          customer_name, customer_email, customer_phone,
          shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
          total_cents, shipping_cents, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          orgId,
          dogId || null,
          portraitId || null,
          customer.name,
          customer.email || null,
          customer.phone || null,
          address.address1,
          address.city,
          address.state_code,
          address.zip,
          address.country_code || "US",
          totalCents,
          shippingCents,
          "awaiting_payment"
        ]
      );
      const merchOrderId = orderResult.rows[0].id;
      for (const item of validatedItems) {
        await pool.query(
          `INSERT INTO merch_order_items (order_id, product_key, variant_id, quantity, price_cents, occasion)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [merchOrderId, item.productKey, item.variantId, item.quantity, item.priceCents, item.occasion || null]
        );
      }
      const org = await storage.getOrganization(parseInt(orgId));
      const testMode = org?.stripeTestMode;
      const stripe = getStripeClient(testMode);
      const lineItems = validatedItems.map((item) => {
        const printfulProduct = getProduct(item.productKey);
        const gelatoProduct = getGelatoProduct(item.productKey);
        const occasion = item.occasion ? getOccasion(item.occasion) : null;
        let displayName = printfulProduct?.name || gelatoProduct?.name || item.productKey;
        if (occasion) displayName = `${occasion.name} ${displayName}`;
        return {
          price_data: {
            currency: "usd",
            product_data: { name: displayName },
            unit_amount: item.priceCents
          },
          quantity: item.quantity
        };
      });
      if (shippingCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Shipping" },
            unit_amount: shippingCents
          },
          quantity: 1
        });
      }
      const baseUrl = process.env.APP_URL || (process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000");
      const successUrl = sessionToken ? `${baseUrl}/order/${sessionToken}?payment=success&session_id={CHECKOUT_SESSION_ID}` : `${baseUrl}/order-complete?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = sessionToken ? `${baseUrl}/order/${sessionToken}?payment=canceled` : `${baseUrl}/`;
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: customer.email || void 0,
        metadata: {
          merchOrderId: String(merchOrderId),
          imageUrl,
          orgId: String(orgId),
          dogId: dogId ? String(dogId) : "",
          portraitId: portraitId ? String(portraitId) : ""
        },
        success_url: successUrl,
        cancel_url: cancelUrl
      });
      await pool.query(
        `UPDATE merch_orders SET stripe_payment_intent_id = $1 WHERE id = $2`,
        [checkoutSession.id, merchOrderId]
      );
      res.json({
        checkoutUrl: checkoutSession.url,
        orderId: merchOrderId,
        sessionId: checkoutSession.id,
        totalCents,
        shippingCents,
        subtotalCents
      });
    } catch (error) {
      console.error("Error creating merch checkout:", error);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });
  app2.post("/api/merch/confirm-checkout", publicExpensiveRateLimiter, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      const orderResult = await pool.query(
        `SELECT * FROM merch_orders WHERE stripe_payment_intent_id = $1`,
        [sessionId]
      );
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "Order not found for this session" });
      }
      const order = orderResult.rows[0];
      if (order.status !== "awaiting_payment") {
        return res.json({
          orderId: order.id,
          status: order.status,
          totalCents: order.total_cents,
          alreadyProcessed: true
        });
      }
      const org = await storage.getOrganization(order.organization_id);
      const stripe = getStripeClient(org?.stripeTestMode);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "Payment not completed", paymentStatus: session.payment_status });
      }
      await pool.query(
        `UPDATE merch_orders SET status = 'paid' WHERE id = $1`,
        [order.id]
      );
      const itemsResult = await pool.query(
        `SELECT * FROM merch_order_items WHERE order_id = $1`,
        [order.id]
      );
      const imageUrl = session.metadata?.imageUrl;
      if (!imageUrl) {
        console.error(`[merch] No imageUrl in session metadata for order ${order.id}`);
        return res.json({ orderId: order.id, status: "paid", warning: "Fulfillment pending \u2014 missing image URL" });
      }
      const printfulRows = itemsResult.rows.filter((item) => !item.product_key.startsWith("card_"));
      const gelatoRows = itemsResult.rows.filter((item) => item.product_key.startsWith("card_"));
      const recipient = {
        name: order.customer_name,
        address1: order.shipping_street,
        city: order.shipping_city,
        state_code: order.shipping_state,
        zip: order.shipping_zip,
        country_code: order.shipping_country || "US",
        email: order.customer_email,
        phone: order.customer_phone
      };
      let printfulOrderId = null;
      let gelatoOrderId = null;
      if (printfulRows.length > 0) {
        try {
          const printfulItems = printfulRows.map(
            (item) => buildOrderItem(item.variant_id, item.quantity, imageUrl)
          );
          const printfulOrder = await createOrder(recipient, printfulItems, String(order.id));
          printfulOrderId = printfulOrder.id;
          await pool.query(
            `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
            [String(printfulOrder.id), printfulOrder.status, order.id]
          );
          try {
            await confirmOrder(printfulOrder.id);
            await pool.query(
              `UPDATE merch_orders SET status = 'confirmed' WHERE id = $1`,
              [order.id]
            );
          } catch (confirmErr) {
            console.warn(`[merch] Printful auto-confirm failed for order ${order.id}:`, confirmErr.message);
          }
        } catch (printfulErr) {
          console.error(`[merch] Printful order failed for paid order ${order.id}:`, printfulErr.message);
          await pool.query(
            `UPDATE merch_orders SET status = 'paid_fulfillment_pending' WHERE id = $1`,
            [order.id]
          );
        }
      }
      if (gelatoRows.length > 0) {
        try {
          const { createGelatoOrder: createGelatoOrder2, buildCardOrderItem: buildCardOrderItem2 } = await Promise.resolve().then(() => (init_gelato(), gelato_exports));
          const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
          const petName = dogResult?.name || "Your Pet";
          const orgName = org?.name || "Pawtrait Pros";
          const gelatoItems = [];
          for (let i = 0; i < gelatoRows.length; i++) {
            const item = gelatoRows[i];
            const product = getGelatoProduct(item.product_key);
            const occasion = item.occasion ? getOccasion(item.occasion) : null;
            let files;
            if (occasion) {
              const format = product?.format || "flat";
              console.log(`[merch] Generating ${occasion.id} ${format} card artwork for order ${order.id}`);
              if (format === "flat") {
                const frontBuf = await generateFlatCardArtwork(imageUrl, occasion, petName, orgName);
                const backBuf = await generateFlatCardBack(orgName);
                const frontUrl = await uploadToStorage(bufferToDataUri(frontBuf), "portraits", `card-${order.id}-${i}-front.png`);
                const backUrl = await uploadToStorage(bufferToDataUri(backBuf), "portraits", `card-${order.id}-${i}-back.png`);
                files = [{ type: "default", url: frontUrl }, { type: "back", url: backUrl }];
                await pool.query(`UPDATE merch_order_items SET artwork_url = $1 WHERE id = $2`, [frontUrl, item.id]);
              } else {
                const outsideBuf = await generateFoldedOutsideArtwork(imageUrl, occasion, petName, orgName);
                const insideBuf = await generateFoldedInsideArtwork(occasion, petName);
                const outsideUrl = await uploadToStorage(bufferToDataUri(outsideBuf), "portraits", `card-${order.id}-${i}-outside.png`);
                const insideUrl = await uploadToStorage(bufferToDataUri(insideBuf), "portraits", `card-${order.id}-${i}-inside.png`);
                files = [{ type: "default", url: outsideUrl }, { type: "inside", url: insideUrl }];
                await pool.query(`UPDATE merch_order_items SET artwork_url = $1 WHERE id = $2`, [outsideUrl, item.id]);
              }
            } else {
              files = [{ type: "default", url: imageUrl }];
            }
            gelatoItems.push(buildCardOrderItem2(
              product?.productUid || item.product_key,
              item.quantity,
              files,
              `item-${order.id}-${i}`
            ));
          }
          const nameParts = (order.customer_name || "Customer").split(" ");
          const gelatoAddress = {
            firstName: nameParts[0] || "Customer",
            lastName: nameParts.slice(1).join(" ") || "",
            addressLine1: order.shipping_street,
            city: order.shipping_city,
            state: order.shipping_state,
            postCode: order.shipping_zip,
            country: order.shipping_country || "US",
            email: order.customer_email,
            phone: order.customer_phone
          };
          const gelatoOrder = await createGelatoOrder2(
            gelatoItems,
            gelatoAddress,
            `pp-${order.id}`,
            `org-${order.organization_id}`
          );
          gelatoOrderId = gelatoOrder.id;
          if (!printfulOrderId) {
            await pool.query(
              `UPDATE merch_orders SET printful_order_id = $1, status = 'submitted' WHERE id = $2`,
              [`gelato:${gelatoOrder.id}`, order.id]
            );
          }
          console.log(`[merch] Gelato order ${gelatoOrder.id} created for merch order ${order.id}`);
        } catch (gelatoErr) {
          console.error(`[merch] Gelato order failed for paid order ${order.id}:`, gelatoErr.message);
          if (!printfulOrderId) {
            await pool.query(
              `UPDATE merch_orders SET status = 'paid_fulfillment_pending' WHERE id = $1`,
              [order.id]
            );
          }
        }
      }
      if (order.customer_email && isEmailConfigured()) {
        try {
          const itemDescriptions = itemsResult.rows.map((item) => {
            const product = getProduct(item.product_key);
            return `${product?.name || item.product_key} x${item.quantity}`;
          });
          const orgName = org?.name || "Pawtrait Pros";
          const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
          const dogName = dogResult?.name || "your pet";
          const { subject, html } = buildOrderConfirmationEmail(orgName, dogName, order.id, order.total_cents, itemDescriptions);
          let attachments;
          if (order.portrait_id) {
            try {
              const baseUrl = process.env.APP_URL || "https://pawtraitpros.com";
              const downloadRes = await fetch(`${baseUrl}/api/portraits/${order.portrait_id}/download`);
              if (downloadRes.ok) {
                const buffer = Buffer.from(await downloadRes.arrayBuffer());
                attachments = [{ filename: `${dogName.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png`, content: buffer }];
              }
            } catch (dlErr) {
              console.warn(`[merch] Failed to fetch watermarked portrait for email:`, dlErr.message);
            }
          }
          await sendEmail(order.customer_email, subject, html, attachments, orgName);
          console.log(`[merch] Confirmation email sent to ${order.customer_email} for order ${order.id}`);
        } catch (emailErr) {
          console.warn(`[merch] Failed to send confirmation email for order ${order.id}:`, emailErr.message);
        }
      }
      const finalStatus = printfulOrderId || gelatoOrderId ? "confirmed" : "paid_fulfillment_pending";
      res.json({
        orderId: order.id,
        printfulOrderId,
        gelatoOrderId,
        totalCents: order.total_cents,
        status: finalStatus
      });
    } catch (error) {
      console.error("Error confirming merch checkout:", error);
      res.status(500).json({ error: "Failed to confirm checkout" });
    }
  });
  app2.get("/api/merch/order/:id", isAuthenticated, async (req, res) => {
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
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      if (userEmail !== ADMIN_EMAIL) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || orderResult.rows[0].organization_id !== org.id) {
          return res.status(403).json({ error: "Not authorized to view this order" });
        }
      }
      const itemsResult = await pool.query(
        `SELECT * FROM merch_order_items WHERE order_id = $1`,
        [orderId]
      );
      const items = itemsResult.rows.map((item) => ({
        ...item,
        product: getProduct(item.product_key)
      }));
      res.json({ order: orderResult.rows[0], items });
    } catch (error) {
      console.error("Error fetching merch order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  app2.get("/api/merch/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      let orgId = null;
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
    } catch (error) {
      console.error("Error fetching merch orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app2.post("/api/merch/order/:id/sync", isAuthenticated, async (req, res) => {
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
      const printfulOrder = await getOrder(parseInt(printfulOrderId));
      await pool.query(
        `UPDATE merch_orders SET printful_status = $1 WHERE id = $2`,
        [printfulOrder.status, orderId]
      );
      res.json({ orderId, printfulStatus: printfulOrder.status, printfulOrder });
    } catch (error) {
      console.error("Error syncing merch order:", error);
      res.status(500).json({ error: "Failed to sync order" });
    }
  });
  app2.get("/api/gelato/products", async (_req, res) => {
    try {
      res.json({ cards: getAllGelatoProducts() });
    } catch (error) {
      console.error("Error fetching Gelato products:", error);
      res.status(500).json({ error: "Failed to fetch card products" });
    }
  });
  app2.get("/api/gelato/availability", async (_req, res) => {
    const available = !!process.env.GELATO_API_KEY;
    const month = (/* @__PURE__ */ new Date()).getMonth();
    const occasions = sortOccasionsForDisplay(month);
    res.json({ available, occasions });
  });
  app2.get("/api/cards/occasions", async (_req, res) => {
    const month = (/* @__PURE__ */ new Date()).getMonth();
    res.json({ occasions: sortOccasionsForDisplay(month) });
  });
  app2.post("/api/cards/preview", publicExpensiveRateLimiter, async (req, res) => {
    try {
      const { portraitId, occasion: occasionId, format, petName } = req.body;
      if (!portraitId || !occasionId) {
        return res.status(400).json({ error: "portraitId and occasion are required" });
      }
      const occasion = getOccasion(occasionId);
      if (!occasion) {
        return res.status(400).json({ error: `Unknown occasion: ${occasionId}` });
      }
      const cardFormat = format || "flat";
      const cacheKey = `${portraitId}-${occasionId}-${cardFormat}`;
      const cached = getCachedPreview(cacheKey);
      if (cached) {
        res.set("Content-Type", "image/png");
        res.set("Cache-Control", "public, max-age=900");
        return res.send(cached);
      }
      const portrait = await storage.getPortrait(portraitId);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).json({ error: "Portrait not found" });
      }
      const name = petName || "Your Pet";
      let orgName = "Your Business";
      try {
        if (portrait.dogId) {
          const dog = await storage.getDog(portrait.dogId);
          if (dog?.organizationId) {
            const org = await storage.getOrganization(dog.organizationId);
            if (org?.name) orgName = org.name;
          }
        }
      } catch (e) {
      }
      let previewBuf;
      const { default: sharpLib } = await import("sharp");
      if (cardFormat === "folded") {
        const fullSpread = await generateFoldedOutsideArtwork(portrait.generatedImageUrl, occasion, name, orgName);
        const meta = await sharpLib(fullSpread).metadata();
        const halfH = Math.round((meta.height || 2100) / 2);
        previewBuf = await sharpLib(fullSpread).extract({ left: 0, top: 0, width: meta.width || 1500, height: halfH }).png().toBuffer();
      } else {
        previewBuf = await generateFlatCardArtwork(portrait.generatedImageUrl, occasion, name, orgName);
      }
      const preview = await sharpLib(previewBuf).resize(600, null, { fit: "inside" }).png().toBuffer();
      setCachedPreview(cacheKey, preview);
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=900");
      res.send(preview);
    } catch (error) {
      console.error("Error generating card preview:", error);
      res.status(500).json({ error: "Failed to generate preview" });
    }
  });
  app2.post("/api/gelato/order", publicExpensiveRateLimiter, async (req, res) => {
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
      const { getGelatoProduct: getGelatoCardProduct } = await Promise.resolve().then(() => (init_gelato_config(), gelato_config_exports));
      const { createGelatoOrder: createGelatoOrder2, buildCardOrderItem: buildCardOrderItem2 } = await Promise.resolve().then(() => (init_gelato(), gelato_exports));
      let subtotalCents = 0;
      const gelatoItems = [];
      const dbItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = getGelatoCardProduct(item.productKey);
        if (!product) {
          return res.status(400).json({ error: `Unknown card product: ${item.productKey}` });
        }
        const qty = item.quantity || 1;
        subtotalCents += product.priceCents * qty;
        const files = artworkUrls.map((url, idx) => ({
          type: idx === 0 ? "default" : "back",
          url
        }));
        gelatoItems.push(
          buildCardOrderItem2(product.productUid, qty, files, `item-${i}`)
        );
        dbItems.push({
          productKey: item.productKey,
          quantity: qty,
          priceCents: product.priceCents
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
          orgId,
          req.body.dogId || null,
          req.body.portraitId || null,
          customer.name,
          customer.email || null,
          customer.phone || null,
          address.address1,
          address.city,
          address.state,
          address.zip,
          address.country || "US",
          subtotalCents,
          0,
          "pending"
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
        const gelatoOrder = await createGelatoOrder2(
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
            phone: customer.phone
          },
          `gelato-${merchOrderId}`,
          `customer-${merchOrderId}`
        );
        await pool.query(
          `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
          [gelatoOrder.id, gelatoOrder.fulfillmentStatus, merchOrderId]
        );
        res.json({
          orderId: merchOrderId,
          gelatoOrderId: gelatoOrder.id,
          totalCents: subtotalCents,
          status: "submitted"
        });
      } catch (gelatoErr) {
        console.error(`[gelato] Order creation failed for merch_order ${merchOrderId}:`, gelatoErr.message);
        await pool.query(
          `UPDATE merch_orders SET status = 'failed', printful_status = $1 WHERE id = $2`,
          [gelatoErr.message, merchOrderId]
        );
        res.status(500).json({ error: "Failed to submit card order", orderId: merchOrderId });
      }
    } catch (error) {
      console.error("Error creating Gelato order:", error);
      res.status(500).json({ error: "Failed to create card order" });
    }
  });
  app2.get("/api/gelato/discover-products", isAuthenticated, async (req, res) => {
    const email = req.user.claims.email;
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin only" });
    }
    try {
      const { searchCardProducts: searchCardProducts2, searchFoldedCardProducts: searchFoldedCardProducts2, listCatalogs: listCatalogs2 } = await Promise.resolve().then(() => (init_gelato(), gelato_exports));
      const catalogs = await listCatalogs2();
      const flatCards = await searchCardProducts2();
      const foldedCards = await searchFoldedCardProducts2();
      res.json({ catalogs, flatCards, foldedCards });
    } catch (error) {
      console.error("Error discovering Gelato products:", error);
      res.status(500).json({ error: "Failed to discover products" });
    }
  });
}

// server/routes/customer-sessions.ts
var import_crypto2 = __toESM(require("crypto"), 1);
init_storage();
init_db();
init_sms();
init_helpers();
function registerCustomerSessionRoutes(app2) {
  app2.post("/api/customer-session", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const { dogId, portraitId, packType, customerPhone, orgId: bodyOrgId } = req.body;
      if (!dogId || !portraitId) {
        return res.status(400).json({ error: "dogId and portraitId are required" });
      }
      let orgId = null;
      if (isAdminUser && bodyOrgId) {
        orgId = parseInt(bodyOrgId);
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== orgId) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to your organization" });
      }
      let token = "";
      let attempts = 0;
      while (attempts < 10) {
        token = import_crypto2.default.randomBytes(4).toString("hex");
        const existing = await pool.query("SELECT id FROM customer_sessions WHERE token = $1", [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, pack_type, customer_phone, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [token, orgId, parseInt(dogId), parseInt(portraitId), packType || null, customerPhone || null, expiresAt.toISOString()]
      );
      const host = process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000";
      const orderUrl = `${host}/order/${token}`;
      console.log(`[customer-session] Created session ${token} for org ${orgId}, dog ${dogId}`);
      res.json({
        token,
        orderUrl,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("Error creating customer session:", error);
      res.status(500).json({ error: "Failed to create customer session" });
    }
  });
  app2.post("/api/customer-session/from-code", publicExpensiveRateLimiter, async (req, res) => {
    try {
      const { petCode } = req.body;
      if (!petCode) {
        return res.status(400).json({ error: "petCode is required" });
      }
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
      let token = "";
      let attempts = 0;
      while (attempts < 10) {
        token = import_crypto2.default.randomBytes(4).toString("hex");
        const existing = await pool.query("SELECT id FROM customer_sessions WHERE token = $1", [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [token, dog.organization_id, dog.id, dog.portrait_id, expiresAt.toISOString()]
      );
      const host = process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000";
      res.json({
        token,
        orderUrl: `${host}/order/${token}`,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("Error creating customer session from code:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });
  app2.get("/api/customer-session/:token", async (req, res) => {
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
      if (session.expires_at && new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
        return res.status(410).json({ error: "This order link has expired" });
      }
      const alternatesResult = await pool.query(
        `SELECT id, generated_image_url, style_id FROM portraits
         WHERE dog_id = $1 AND generated_image_url IS NOT NULL AND id != $2
         ORDER BY created_at DESC LIMIT 5`,
        [session.dog_id, session.portrait_id]
      );
      res.json({
        token: session.token,
        orgId: session.organization_id,
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogId: session.dog_id,
        dogName: session.dog_name,
        dogBreed: session.dog_breed,
        dogSpecies: session.dog_species,
        portraitImage: session.portrait_image,
        portraitId: session.portrait_id,
        packType: session.pack_type,
        expiresAt: session.expires_at,
        alternatePortraits: alternatesResult.rows.map((p) => ({
          id: p.id,
          imageUrl: p.generated_image_url,
          styleId: p.style_id
        }))
      });
    } catch (error) {
      console.error("Error fetching customer session:", error);
      res.status(500).json({ error: "Failed to load order page" });
    }
  });
  app2.get("/api/customer-session/:token/receipt", async (req, res) => {
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
      const host = process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000";
      const orderUrl = `${host}/order/${token}`;
      res.json({
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogName: session.dog_name,
        orderUrl,
        token,
        expiresAt: session.expires_at
      });
    } catch (error) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ error: "Failed to generate receipt" });
    }
  });
  app2.post("/api/customer-session/:token/send-sms", isAuthenticated, async (req, res) => {
    try {
      const { token } = req.params;
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }
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
      const host = process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000";
      const orderUrl = `${host}/order/${token}`;
      const message = `Hi from ${session.org_name}! ${session.dog_name}'s portrait is ready. View it & order prints here: ${orderUrl}`;
      if (!isSmsConfigured()) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }
      const formattedPhone = formatPhoneNumber(phone);
      const result = await sendSms(formattedPhone, message);
      if (!result.success) {
        throw new Error(result.error || "Failed to send SMS");
      }
      await pool.query(
        `UPDATE customer_sessions SET customer_phone = $1 WHERE token = $2`,
        [formattedPhone, token]
      );
      res.json({ success: true, message: "SMS sent" });
    } catch (error) {
      console.error("Error sending customer session SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });
}

// server/routes/admin.ts
var import_zod2 = require("zod");
init_storage();
init_stripeClient();
init_subscription();
init_helpers();
function registerAdminRoutes(app2) {
  app2.post("/api/admin/organizations", isAuthenticated, isAdmin, async (req, res) => {
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
        portraitsUsedThisMonth: 0
      });
      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization (admin):", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });
  app2.get("/api/admin/organizations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const allPlans = await storage.getAllSubscriptionPlans();
      const planMap = new Map(allPlans.map((p) => [p.id, p]));
      const orgsWithStats = await Promise.all(
        orgs.map(async (org) => {
          const dogs2 = await storage.getDogsByOrganization(org.id);
          let portraitCount = 0;
          for (const dog of dogs2) {
            const portraits2 = await storage.getPortraitsByDog(dog.id);
            portraitCount += portraits2.length;
          }
          const plan = org.planId ? planMap.get(org.planId) : null;
          const planName = plan ? plan.name.toLowerCase() : "none";
          const planPriceCents = plan ? plan.priceMonthly : 0;
          const addonSlots = org.additionalPetSlots || 0;
          const addonRevenueCents = addonSlots * 300;
          const totalRevenueCents = (org.subscriptionStatus === "active" ? planPriceCents : 0) + (org.subscriptionStatus === "active" ? addonRevenueCents : 0);
          return {
            ...org,
            dogCount: dogs2.length,
            portraitCount,
            planName,
            planPriceCents,
            addonRevenueCents,
            totalRevenueCents
          };
        })
      );
      res.json(orgsWithStats);
    } catch (error) {
      console.error("Error fetching admin organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });
  app2.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      const dogs2 = await storage.getAllDogs();
      let totalPortraits = 0;
      for (const dog of dogs2) {
        const portraits2 = await storage.getPortraitsByDog(dog.id);
        totalPortraits += portraits2.length;
      }
      const activeSubscriptions = orgs.filter((o) => o.subscriptionStatus === "active").length;
      const pastDue = orgs.filter((o) => o.subscriptionStatus === "past_due").length;
      const allPlans = await storage.getAllSubscriptionPlans();
      const planMap = new Map(allPlans.map((p) => [p.id, p]));
      const planDistribution = {};
      for (const plan of allPlans) {
        const key = plan.name.toLowerCase() === "free trial" ? "trial" : plan.name.toLowerCase();
        planDistribution[key] = orgs.filter((o) => o.planId === plan.id).length;
      }
      planDistribution.trial = (planDistribution.trial || 0) + orgs.filter((o) => !o.planId && o.subscriptionStatus === "trial").length;
      planDistribution.inactive = orgs.filter((o) => o.subscriptionStatus === "inactive" || o.subscriptionStatus === "canceled").length;
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
        totalDogs: dogs2.length,
        totalPortraits,
        activeSubscriptions,
        pastDue,
        monthlyRevenue,
        planDistribution
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app2.get("/api/admin/organizations/:id/dogs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orgId = parseInt(req.params.id);
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
  app2.post("/api/admin/organizations/:id/dogs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orgId = parseInt(req.params.id);
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
      if (error instanceof import_zod2.z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating pet for org:", error);
      res.status(500).json({ error: "Failed to save pet" });
    }
  });
  app2.get("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const synced = await storage.syncOrgCredits(id);
      if (synced) org = synced;
      const dogs2 = await storage.getDogsByOrganization(id);
      const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
      res.json({
        ...org,
        dogCount: dogs2.length,
        ...computePetLimitInfo(org, plan, dogs2.length)
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });
  app2.post("/api/admin/organizations/:id/select-plan", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      const trialEndsAt = plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1e3) : null;
      const isNewPlan = org.planId !== plan.id;
      const orgUpdate = {
        planId: plan.id,
        subscriptionStatus: isFreeTrialPlan ? "trial" : "active"
      };
      if (isNewPlan) {
        orgUpdate.billingCycleStart = org.billingCycleStart || org.createdAt || /* @__PURE__ */ new Date();
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
  app2.patch("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const allowedFields = [
        "name",
        "description",
        "websiteUrl",
        "logoUrl",
        "contactName",
        "contactEmail",
        "contactPhone",
        "socialFacebook",
        "socialInstagram",
        "socialTwitter",
        "socialNextdoor",
        "locationStreet",
        "locationCity",
        "locationState",
        "locationZip",
        "locationCountry",
        "billingStreet",
        "billingCity",
        "billingState",
        "billingZip",
        "billingCountry",
        "notes",
        "isActive",
        "planId",
        "speciesHandled",
        "onboardingCompleted",
        "subscriptionStatus",
        "stripeCustomerId",
        "stripeSubscriptionId",
        "stripeTestMode",
        "billingCycleStart"
      ];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updates[field] = req.body[field];
        }
      }
      if (updates.planId !== void 0) {
        if (updates.planId !== null) {
          const plan = await storage.getSubscriptionPlan(updates.planId);
          if (!plan) {
            return res.status(400).json({ error: "Invalid plan selected" });
          }
        }
      }
      if (updates.logoUrl !== void 0 && updates.logoUrl !== null) {
        const MAX_LOGO_LENGTH = 5e5;
        if (typeof updates.logoUrl !== "string" || updates.logoUrl.length > MAX_LOGO_LENGTH) {
          return res.status(400).json({ error: "Logo data too large or invalid" });
        }
      }
      if (updates.name && updates.name !== org.name) {
        updates.slug = await generateUniqueSlug(updates.name, id);
      }
      const stripeFields = {};
      for (const key of ["stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "stripeTestMode"]) {
        if (updates[key] !== void 0) {
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
  app2.delete("/api/admin/organizations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const org = await storage.getOrganization(id);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const dogs2 = await storage.getDogsByOrganization(id);
      for (const dog of dogs2) {
        await storage.deleteDog(dog.id);
      }
      await storage.deleteOrganization(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ error: "Failed to delete organization" });
    }
  });
  app2.get("/api/admin/data-integrity", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allOrgs = await storage.getAllOrganizations();
      const issues = [];
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
            message: `Has ${dogCount} pet(s) but no plan assigned`
          });
        }
        if (!org.planId && org.subscriptionStatus === "trial") {
          issues.push({
            type: "trial_no_plan",
            severity: "critical",
            orgId: org.id,
            orgName: org.name,
            message: `Status is "trial" but no plan assigned`
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
                message: `Has ${dogCount} pet(s) but limit is ${effectiveLimit}`
              });
            }
          }
        }
      }
      res.json({
        totalOrgs: allOrgs.length,
        issueCount: issues.length,
        issues
      });
    } catch (error) {
      console.error("Error checking data integrity:", error);
      res.status(500).json({ error: "Failed to check data integrity" });
    }
  });
  app2.post("/api/admin/sync-stripe", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allOrgs = await storage.getAllOrganizations();
      const orgsWithStripe = allOrgs.filter((o) => o.stripeSubscriptionId);
      const results = [];
      for (const org of orgsWithStripe) {
        try {
          const stripe = getStripeClient(org.stripeTestMode);
          const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
          const newStatus = mapStripeStatusToInternal(sub.status, org.subscriptionStatus);
          const priceId = sub.items?.data?.[0]?.price?.id;
          const matchedPlan = priceId ? STRIPE_PLAN_PRICE_MAP[priceId] : void 0;
          const updates = {};
          const changes = [];
          if (newStatus !== org.subscriptionStatus) {
            updates.subscriptionStatus = newStatus;
            changes.push(`status: ${org.subscriptionStatus} \u2192 ${newStatus}`);
          }
          if (matchedPlan && matchedPlan.id !== org.planId) {
            updates.planId = matchedPlan.id;
            changes.push(`plan: ${org.planId} \u2192 ${matchedPlan.id} (${matchedPlan.name})`);
          }
          if (newStatus === "canceled") {
            if (org.additionalPetSlots && org.additionalPetSlots > 0) {
              updates.additionalPetSlots = 0;
              changes.push(`add-on slots: ${org.additionalPetSlots} \u2192 0`);
            }
          }
          const subAny = sub;
          if (sub.status === "active" && subAny.current_period_start) {
            const periodStart = new Date(subAny.current_period_start * 1e3);
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
                stripeSubscriptionId: org.stripeSubscriptionId
              });
              delete updates.subscriptionStatus;
            }
            if (Object.keys(updates).length > 0) {
              await storage.updateOrganization(org.id, updates);
            }
            results.push(`${org.name} (id ${org.id}): ${changes.join(", ")}`);
          }
        } catch (stripeErr) {
          results.push(`${org.name} (id ${org.id}): ERROR - ${stripeErr.message}`);
        }
      }
      res.json({
        message: `Synced ${orgsWithStripe.length} org(s) with Stripe`,
        orgsChecked: orgsWithStripe.length,
        changes: results
      });
    } catch (error) {
      console.error("Error syncing Stripe data:", error);
      res.status(500).json({ error: "Failed to sync Stripe data" });
    }
  });
  app2.post("/api/admin/recalculate-credits", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const results = await storage.recalculateAllOrgCredits();
      res.json({
        message: `Recalculated credits for ${results.length} organization(s)`,
        changes: results
      });
    } catch (error) {
      console.error("Error recalculating credits:", error);
      res.status(500).json({ error: "Failed to recalculate credits" });
    }
  });
}

// server/routes/sms-routes.ts
var import_express_rate_limit3 = __toESM(require("express-rate-limit"), 1);
init_sms();
function registerSmsRoutes(app2) {
  const smsRateLimiter = (0, import_express_rate_limit3.default)({
    windowMs: 60 * 1e3,
    max: 5,
    message: { error: "Too many texts sent. Please wait a minute." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.claims?.sub || "anonymous"
  });
  app2.post("/api/send-sms", isAuthenticated, smsRateLimiter, async (req, res) => {
    try {
      const { to, message, mediaUrl } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }
      const cleaned = to.replace(/[\s\-().]/g, "");
      if (!/^\+?1?\d{10,15}$/.test(cleaned)) {
        return res.status(400).json({ error: "Please enter a valid phone number" });
      }
      if (!isSmsConfigured()) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }
      const phone = formatPhoneNumber(cleaned);
      const result = await sendSms(phone, message, mediaUrl || void 0);
      if (result.queued) {
        return res.json({ success: true, queued: true, messageId: result.messageId });
      }
      if (result.retrying) {
        return res.json({ success: false, retrying: true, messageId: result.messageId, error: result.error });
      }
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send text message" });
      }
      res.json({ success: true, delivered: result.delivered, messageId: result.messageId });
    } catch (error) {
      console.error("SMS send error:", error);
      res.status(500).json({ error: "Failed to send text message" });
    }
  });
  app2.get("/api/sms-status/:messageId", isAuthenticated, (req, res) => {
    const { messageId } = req.params;
    const entry = getRetryStatus(messageId);
    if (!entry) {
      return res.json({ status: "unknown" });
    }
    res.json({
      status: entry.status,
      error: entry.lastError
    });
  });
}

// server/routes/instagram.ts
var import_crypto3 = __toESM(require("crypto"), 1);
init_storage();
init_db();
init_helpers();
var AYRSHARE_API_URL = "https://api.ayrshare.com/api";
function getAyrshareHeaders(profileKey) {
  const headers = {
    "Authorization": `Bearer ${process.env.AYRSHARE_API_KEY}`,
    "Content-Type": "application/json"
  };
  if (profileKey) {
    headers["Profile-Key"] = profileKey;
  }
  return headers;
}
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
  } catch (e) {
    console.warn("[instagram] Could not add columns:", e.message);
  }
})();
var GRAPH_API = "https://graph.instagram.com";
var GRAPH_API_V = "https://graph.instagram.com/v21.0";
var IG_APP_ID = process.env.INSTAGRAM_APP_ID;
var IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
var imageCache = /* @__PURE__ */ new Map();
var MAX_IMAGE_CACHE_SIZE = 50;
var ALLOWED_IMAGE_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of imageCache) {
    if (now > entry.expiresAt) {
      imageCache.delete(token);
    }
  }
}, 2 * 60 * 1e3);
function storePublicImage(base64DataUri) {
  const matches = base64DataUri.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!matches) throw new Error("Invalid base64 image data");
  const contentType = matches[1];
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new Error(`Unsupported image type: ${contentType}`);
  const buffer = Buffer.from(matches[2], "base64");
  const token = import_crypto3.default.randomUUID();
  if (imageCache.size >= MAX_IMAGE_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(token, {
    data: buffer,
    contentType,
    expiresAt: Date.now() + 10 * 60 * 1e3
    // 10 min TTL
  });
  const host = process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000";
  return `${host}/api/public-image/${token}`;
}
async function getOrgForUser(req, orgIdParam) {
  const userId = req.user.claims.sub;
  const email = req.user.claims.email;
  const isAdmin2 = email === ADMIN_EMAIL;
  if (isAdmin2 && orgIdParam) {
    return storage.getOrganization(orgIdParam);
  }
  return storage.getOrganizationByOwner(userId);
}
function verifyMetaSignedRequest(signedRequest) {
  if (!IG_APP_SECRET) return null;
  const [sig, payload] = signedRequest.split(".");
  if (!sig || !payload) return null;
  const expectedSig = import_crypto3.default.createHmac("sha256", IG_APP_SECRET).update(payload).digest("base64url");
  try {
    if (!import_crypto3.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}
function registerInstagramRoutes(app2) {
  app2.get("/api/instagram/status", isAuthenticated, async (req, res) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ connected: false });
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      let org;
      if (isAdmin2 && orgIdParam) {
        org = await storage.getOrganization(orgIdParam);
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.json({ connected: false });
      const result = await pool.query(
        "SELECT ayrshare_profile_key, instagram_username FROM organizations WHERE id = $1",
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: getAyrshareHeaders(profileKey)
      });
      const userData = await userRes.json();
      const connected = Array.isArray(userData.activeSocialAccounts) && userData.activeSocialAccounts.includes("instagram");
      const username = userData.displayNames?.instagram || result.rows[0]?.instagram_username || null;
      if (connected && username && username !== result.rows[0]?.instagram_username) {
        await pool.query("UPDATE organizations SET instagram_username = $1 WHERE id = $2", [username, org.id]);
      }
      res.json({ connected, username, orgId: org.id });
    } catch (error) {
      console.error("[instagram] Status error:", error);
      res.json({ connected: false });
    }
  });
  app2.get("/api/instagram/connect", isAuthenticated, async (req, res) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      let orgId = null;
      if (isAdmin2 && orgIdParam) {
        orgId = orgIdParam;
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) return res.status(400).json({ error: "No organization found" });
      const result = await pool.query(
        "SELECT ayrshare_profile_key FROM organizations WHERE id = $1",
        [orgId]
      );
      let profileKey = result.rows[0]?.ayrshare_profile_key;
      if (!profileKey) {
        const org = await storage.getOrganization(orgId);
        const profileRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
          method: "POST",
          headers: getAyrshareHeaders(),
          body: JSON.stringify({
            title: `PP-Org-${orgId}-${(org?.name || "Unknown").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 30)}`
          })
        });
        const profileData = await profileRes.json();
        if (profileData.profileKey) {
          profileKey = profileData.profileKey;
          await pool.query(
            "UPDATE organizations SET ayrshare_profile_key = $1 WHERE id = $2",
            [profileKey, orgId]
          );
          console.log(`[instagram] Created Ayrshare profile for org ${orgId}: ${profileKey}`);
        } else {
          console.error("[instagram] Failed to create Ayrshare profile:", profileData);
          return res.redirect("/settings?instagram=error&detail=" + encodeURIComponent(profileData.message || "profile_creation_failed"));
        }
      }
      const privateKey = process.env.AYRSHARE_PRIVATE_KEY;
      const domain = process.env.AYRSHARE_DOMAIN;
      if (!privateKey || !domain) {
        console.error("[instagram] Missing AYRSHARE_PRIVATE_KEY or AYRSHARE_DOMAIN env vars");
        return res.redirect("/settings?instagram=error&detail=missing_ayrshare_config");
      }
      const jwtRes = await fetch(`${AYRSHARE_API_URL}/profiles/generateJWT`, {
        method: "POST",
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          domain,
          privateKey: privateKey.replace(/\\n/g, "\n"),
          profileKey,
          redirect: `https://pawtraitpros.com/settings?instagram=connected`,
          allowedSocial: ["instagram"]
        })
      });
      const jwtData = await jwtRes.json();
      if (jwtData.url) {
        console.log(`[instagram] Redirecting org ${orgId} to Ayrshare Social Connect`);
        return res.redirect(jwtData.url);
      } else {
        console.error("[instagram] JWT generation failed:", jwtData);
        return res.redirect("/settings?instagram=error&detail=" + encodeURIComponent(jwtData.message || "jwt_failed"));
      }
    } catch (error) {
      console.error("[instagram] Connect error:", error);
      res.redirect("/settings?instagram=error&detail=connect_failed");
    }
  });
  app2.post("/api/instagram/post", isAuthenticated, async (req, res) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;
      let imageToUpload;
      let fileName;
      let description;
      let org;
      let defaultCaption;
      if (image && bodyOrgId) {
        org = await storage.getOrganization(parseInt(bodyOrgId));
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin2) {
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
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        org = await storage.getOrganization(dog.organizationId);
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin2) {
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
        const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers["host"] || "pawtraitpros.com";
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ""}View their full portrait at ${proto}://${host}/pawfile/${dog.id}

#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }
      const result = await pool.query(
        "SELECT ayrshare_profile_key FROM organizations WHERE id = $1",
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;
      console.log(`[instagram] Uploading image for org ${org.id} to Ayrshare`);
      const uploadRes = await fetch(`${AYRSHARE_API_URL}/media/upload`, {
        method: "POST",
        headers: getAyrshareHeaders(),
        body: JSON.stringify({
          file: imageToUpload,
          fileName,
          description
        })
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) {
        console.error("[instagram] Upload failed:", uploadData);
        throw new Error(uploadData.message || "Failed to upload image");
      }
      console.log(`[instagram] Uploaded: ${uploadData.url}`);
      const postRes = await fetch(`${AYRSHARE_API_URL}/post`, {
        method: "POST",
        headers: getAyrshareHeaders(profileKey),
        body: JSON.stringify({
          post: defaultCaption,
          platforms: ["instagram"],
          mediaUrls: [uploadData.url]
        })
      });
      const postData = await postRes.json();
      if (postData.status === "error") {
        console.error("[instagram] Post failed:", postData);
        throw new Error(postData.message || "Failed to post to Instagram");
      }
      const igPost = postData.postIds?.find((p) => p.platform === "instagram");
      console.log(`[instagram] Posted to Instagram for org ${org.id} via Ayrshare`);
      res.json({
        success: true,
        mediaId: igPost?.id || postData.id,
        postUrl: igPost?.postUrl || null
      });
    } catch (error) {
      console.error("[instagram] Post error:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });
  app2.delete("/api/instagram/disconnect", isAuthenticated, async (req, res) => {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Instagram integration not configured" });
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      let org;
      if (isAdmin2 && orgIdParam) {
        org = await storage.getOrganization(orgIdParam);
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const result = await pool.query(
        "SELECT ayrshare_profile_key FROM organizations WHERE id = $1",
        [org.id]
      );
      const profileKey = result.rows[0]?.ayrshare_profile_key;
      if (profileKey) {
        await fetch(`${AYRSHARE_API_URL}/profiles/social`, {
          method: "DELETE",
          headers: getAyrshareHeaders(profileKey),
          body: JSON.stringify({ platform: "instagram" })
        });
      }
      await pool.query(
        `UPDATE organizations SET instagram_username = NULL, instagram_user_id = NULL, instagram_access_token = NULL WHERE id = $1`,
        [org.id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("[instagram] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });
  app2.get("/api/admin/instagram-debug", isAuthenticated, async (req, res) => {
    const email = req.user.claims.email;
    if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Admin only" });
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) return res.json({ error: "AYRSHARE_API_KEY not set" });
    try {
      const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const userData = await userRes.json();
      const profilesRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const profilesData = await profilesRes.json();
      res.json({
        ayrshare_user: userData,
        profiles: profilesData,
        env: {
          hasApiKey: !!apiKey,
          hasDomain: !!process.env.AYRSHARE_DOMAIN,
          hasPrivateKey: !!process.env.AYRSHARE_PRIVATE_KEY
        }
      });
    } catch (e) {
      res.json({ error: e.message });
    }
  });
  app2.get("/api/public-image/:token", (req, res) => {
    const entry = imageCache.get(req.params.token);
    if (!entry || Date.now() > entry.expiresAt) {
      imageCache.delete(req.params.token);
      return res.status(404).json({ error: "Image not found or expired" });
    }
    res.set("Content-Type", entry.contentType);
    res.set("Cache-Control", "public, max-age=600");
    res.send(entry.data);
  });
  app2.get("/api/instagram-native/status", isAuthenticated, async (req, res) => {
    try {
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      const org = await getOrgForUser(req, orgIdParam);
      if (!org) return res.json({ connected: false });
      const result = await pool.query(
        "SELECT instagram_access_token, instagram_user_id, instagram_username, instagram_token_expires_at FROM organizations WHERE id = $1",
        [org.id]
      );
      const row = result.rows[0];
      if (!row?.instagram_access_token || !row?.instagram_user_id) {
        return res.json({ connected: false });
      }
      if (row.instagram_token_expires_at && new Date(row.instagram_token_expires_at) < /* @__PURE__ */ new Date()) {
        return res.json({ connected: false, reason: "token_expired" });
      }
      const expiresAt = row.instagram_token_expires_at ? new Date(row.instagram_token_expires_at) : null;
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
      if (expiresAt && expiresAt < sevenDaysFromNow && IG_APP_SECRET) {
        try {
          const refreshRes = await fetch(
            `${GRAPH_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${row.instagram_access_token}`
          );
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            const newExpires = new Date(Date.now() + (refreshData.expires_in || 5184e3) * 1e3);
            await pool.query(
              "UPDATE organizations SET instagram_access_token = $1, instagram_token_expires_at = $2 WHERE id = $3",
              [refreshData.access_token, newExpires.toISOString(), org.id]
            );
            console.log(`[instagram-native] Token refreshed for org ${org.id}`);
          }
        } catch (refreshErr) {
          console.warn("[instagram-native] Token refresh failed:", refreshErr);
        }
      }
      const verifyRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${row.instagram_access_token}`);
      const verifyData = await verifyRes.json();
      if (verifyData.error) {
        console.warn("[instagram-native] Token invalid:", verifyData.error.message);
        return res.json({ connected: false, reason: "token_invalid" });
      }
      if (verifyData.username && verifyData.username !== row.instagram_username) {
        await pool.query("UPDATE organizations SET instagram_username = $1 WHERE id = $2", [verifyData.username, org.id]);
      }
      res.json({ connected: true, username: verifyData.username || row.instagram_username, orgId: org.id });
    } catch (error) {
      console.error("[instagram-native] Status error:", error);
      res.json({ connected: false });
    }
  });
  app2.get("/api/instagram-native/connect", isAuthenticated, async (req, res) => {
    if (!IG_APP_ID || !IG_APP_SECRET) {
      return res.redirect("/settings?instagram=error&detail=missing_instagram_config");
    }
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
      let orgId = null;
      if (isAdmin2 && orgIdParam) {
        orgId = orgIdParam;
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }
      if (!orgId) return res.redirect("/settings?instagram=error&detail=no_organization");
      const statePayload = JSON.stringify({ orgId, ts: Date.now() });
      const stateHmac = import_crypto3.default.createHmac("sha256", IG_APP_SECRET).update(statePayload).digest("hex");
      const state = Buffer.from(JSON.stringify({ p: statePayload, s: stateHmac })).toString("base64url");
      const redirectUri = `${process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000"}/api/instagram-native/callback`;
      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code&state=${state}`;
      console.log(`[instagram-native] Redirecting org ${orgId} to Facebook OAuth`);
      res.redirect(authUrl);
    } catch (error) {
      console.error("[instagram-native] Connect error:", error);
      res.redirect("/settings?instagram=error&detail=connect_failed");
    }
  });
  app2.get("/api/instagram-native/callback", async (req, res) => {
    const { code, state, error: oauthError } = req.query;
    if (oauthError) {
      console.error("[instagram-native] OAuth denied:", oauthError);
      return res.redirect("/settings?instagram=error&detail=" + encodeURIComponent(oauthError));
    }
    if (!code || !state) {
      return res.redirect("/settings?instagram=error&detail=missing_code_or_state");
    }
    try {
      const stateOuter = JSON.parse(Buffer.from(state, "base64url").toString());
      const expectedHmac = import_crypto3.default.createHmac("sha256", IG_APP_SECRET).update(stateOuter.p).digest("hex");
      if (!import_crypto3.default.timingSafeEqual(Buffer.from(stateOuter.s, "hex"), Buffer.from(expectedHmac, "hex"))) {
        return res.redirect("/settings?instagram=error&detail=invalid_state");
      }
      const stateData = JSON.parse(stateOuter.p);
      const orgId = stateData.orgId;
      if (!orgId) throw new Error("No orgId in state");
      const redirectUri = `${process.env.NODE_ENV === "production" ? "https://pawtraitpros.com" : "http://localhost:5000"}/api/instagram-native/callback`;
      const cleanCode = code.replace(/#_$/, "");
      console.log(`[instagram-native] Token exchange: client_id=${IG_APP_ID}, redirect_uri=${redirectUri}, code_length=${cleanCode.length}`);
      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: IG_APP_ID,
          client_secret: IG_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code: cleanCode
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error_type || tokenData.error) {
        console.error("[instagram-native] Token exchange error:", JSON.stringify(tokenData));
        console.error("[instagram-native] Used redirect_uri:", redirectUri);
        console.error("[instagram-native] Used client_id:", IG_APP_ID);
        throw new Error(tokenData.error_message || tokenData.error?.message || "Token exchange failed");
      }
      const shortLivedToken = tokenData.access_token;
      const longTokenRes = await fetch(
        `${GRAPH_API}/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortLivedToken}`
      );
      const longTokenData = await longTokenRes.json();
      if (longTokenData.error) {
        console.error("[instagram-native] Long-lived token error:", longTokenData.error);
        throw new Error(longTokenData.error.message || "Long-lived token exchange failed");
      }
      const longLivedToken = longTokenData.access_token;
      const expiresIn = longTokenData.expires_in || 5184e3;
      const igProfileRes = await fetch(`${GRAPH_API_V}/me?fields=user_id,username&access_token=${longLivedToken}`);
      const igProfileData = await igProfileRes.json();
      const igUserId = igProfileData.id;
      const igUsername = igProfileData.username || null;
      console.log(`[instagram-native] Profile: id=${igUserId}, username=${igUsername}`);
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
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
      res.redirect("/settings?instagram=connected");
    } catch (error) {
      console.error("[instagram-native] Callback error:", error);
      res.redirect("/settings?instagram=error&detail=callback_failed");
    }
  });
  app2.post("/api/instagram-native/post", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdmin2 = email === ADMIN_EMAIL;
      const { dogId, caption, image, orgId: bodyOrgId } = req.body;
      let imageToPost;
      let org;
      let defaultCaption;
      if (image && bodyOrgId) {
        org = await storage.getOrganization(parseInt(bodyOrgId));
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin2) {
          const userOrg = await storage.getOrganizationByOwner(userId);
          if (!userOrg || userOrg.id !== org.id) {
            return res.status(403).json({ error: "You don't have access to this organization" });
          }
        }
        imageToPost = image;
        defaultCaption = caption || `Check out the adorable pets at ${org.name}! #petportrait #pawtraitpros`;
      } else if (dogId) {
        const dog = await storage.getDog(parseInt(dogId));
        if (!dog) return res.status(404).json({ error: "Dog not found" });
        org = await storage.getOrganization(dog.organizationId);
        if (!org) return res.status(404).json({ error: "Organization not found" });
        if (!isAdmin2) {
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
        const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers["host"] || "pawtraitpros.com";
        defaultCaption = caption || `Meet ${dog.name}! ${dog.breed ? `A beautiful ${dog.breed} ` : ""}View their full portrait at ${proto}://${host}/pawfile/${dog.id}

#petportrait #pawtraitpros`;
      } else {
        return res.status(400).json({ error: "dogId or image+orgId is required" });
      }
      const result = await pool.query(
        "SELECT instagram_access_token, instagram_user_id FROM organizations WHERE id = $1",
        [org.id]
      );
      const token = result.rows[0]?.instagram_access_token;
      const igUserId = result.rows[0]?.instagram_user_id;
      if (!token || !igUserId) {
        return res.status(400).json({ error: "Instagram not connected. Please connect Instagram first." });
      }
      const imageUrl = storePublicImage(imageToPost);
      console.log(`[instagram-native] Posting for org ${org.id}, image URL: ${imageUrl}`);
      console.log(`[instagram-native] Creating container: user=${igUserId}, image_url=${imageUrl}`);
      const containerRes = await fetch(`${GRAPH_API_V}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: defaultCaption,
          access_token: token
        })
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
      let ready = false;
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const statusRes = await fetch(
          `${GRAPH_API_V}/${containerId}?fields=status_code&access_token=${token}`
        );
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
          ready = true;
          break;
        }
        if (statusData.status_code === "ERROR") {
          throw new Error("Instagram rejected the image. It may be too large or in an unsupported format.");
        }
      }
      if (!ready) {
        throw new Error("Image processing timed out. Please try again.");
      }
      console.log(`[instagram-native] Publishing container ${containerId} for user ${igUserId}`);
      const publishRes = await fetch(`${GRAPH_API_V}/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token
        })
      });
      const publishText = await publishRes.text();
      console.log(`[instagram-native] Publish response (${publishRes.status}): ${publishText}`);
      const publishData = JSON.parse(publishText);
      if (publishData.error) {
        console.error("[instagram-native] Publish error:", JSON.stringify(publishData.error));
        throw new Error(publishData.error.message || "Failed to publish to Instagram");
      }
      console.log(`[instagram-native] Published to Instagram: ${publishData.id}`);
      const tokenFromUrl = imageUrl.split("/").pop();
      if (tokenFromUrl) imageCache.delete(tokenFromUrl);
      res.json({
        success: true,
        mediaId: publishData.id,
        postUrl: null
        // Graph API doesn't return permalink directly
      });
    } catch (error) {
      console.error("[instagram-native] Post error:", error);
      res.status(500).json({ error: "Failed to post to Instagram" });
    }
  });
  app2.delete("/api/instagram-native/disconnect", isAuthenticated, async (req, res) => {
    try {
      const orgIdParam = req.query.orgId ? parseInt(req.query.orgId) : null;
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
    } catch (error) {
      console.error("[instagram-native] Disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect Instagram" });
    }
  });
  app2.post("/api/instagram-native/data-deletion", async (req, res) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request || !IG_APP_SECRET) {
        return res.status(400).json({ error: "Invalid request" });
      }
      const data = verifyMetaSignedRequest(signed_request);
      if (!data) {
        return res.status(403).json({ error: "Invalid signature" });
      }
      const fbUserId = data.user_id;
      if (fbUserId) {
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_user_id = $1`,
          [String(fbUserId)]
        );
        console.log(`[instagram-native] Data deletion processed for FB user ${fbUserId}`);
      }
      const confirmationCode = import_crypto3.default.randomUUID();
      res.json({
        url: `https://pawtraitpros.com/privacy`,
        confirmation_code: confirmationCode
      });
    } catch (error) {
      console.error("[instagram-native] Data deletion error:", error);
      res.status(500).json({ error: "Failed to process data deletion" });
    }
  });
  app2.post("/api/instagram-native/deauthorize", async (req, res) => {
    try {
      const { signed_request } = req.body;
      if (!signed_request) {
        return res.status(400).json({ error: "Invalid request" });
      }
      const data = verifyMetaSignedRequest(signed_request);
      if (!data) {
        return res.status(403).json({ error: "Invalid signature" });
      }
      const fbUserId = data.user_id;
      if (fbUserId) {
        await pool.query(
          `UPDATE organizations SET
            instagram_access_token = NULL,
            instagram_user_id = NULL,
            instagram_username = NULL,
            instagram_page_id = NULL,
            instagram_token_expires_at = NULL
          WHERE instagram_user_id = $1`,
          [String(fbUserId)]
        );
        console.log(`[instagram-native] Deauthorized FB user ${fbUserId}`);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[instagram-native] Deauthorize error:", error);
      res.status(500).json({ error: "Failed to process deauthorization" });
    }
  });
}

// server/routes/gdpr.ts
init_storage();
init_db();
init_helpers();
function registerGdprRoutes(app2) {
  app2.get("/api/my-data/export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const user = await storage.getUser(userId);
      const org = await storage.getOrganizationByOwner(userId);
      let dogs2 = [];
      let portraits2 = [];
      if (org) {
        dogs2 = await storage.getDogsByOrganization(org.id);
        for (const dog of dogs2) {
          const dogPortraits = await storage.getPortraitsByDog(dog.id);
          portraits2.push(...dogPortraits.map((p) => ({
            dogName: dog.name,
            style: p.styleId,
            createdAt: p.createdAt
          })));
        }
      }
      const exportData = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          createdAt: user?.createdAt
        },
        organization: org ? {
          name: org.name,
          slug: org.slug,
          description: org.description,
          websiteUrl: org.websiteUrl,
          phone: org.phone,
          address: org.address,
          createdAt: org.createdAt
        } : null,
        pets: dogs2.map((d) => ({
          name: d.name,
          breed: d.breed,
          species: d.species,
          age: d.age,
          gender: d.gender,
          description: d.description,
          ownerName: d.ownerName,
          ownerEmail: d.ownerEmail,
          ownerPhone: d.ownerPhone,
          createdAt: d.createdAt
        })),
        portraits: portraits2
      };
      res.set("Content-Disposition", 'attachment; filename="my-data-export.json"');
      res.set("Content-Type", "application/json");
      res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });
  app2.delete("/api/my-account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      if (userEmail === ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin account cannot be self-deleted" });
      }
      const org = await storage.getOrganizationByOwner(userId);
      if (org) {
        const dogs2 = await storage.getDogsByOrganization(org.id);
        for (const dog of dogs2) {
          await storage.deleteDog(dog.id);
        }
        await storage.deleteOrganization(org.id);
      }
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
      const supabaseUrl2 = process.env.SUPABASE_URL;
      const supabaseServiceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl2 && supabaseServiceKey2) {
        await fetch(`${supabaseUrl2}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey2}`,
            "apikey": supabaseServiceKey2
          }
        });
      }
      console.log(`[gdpr] Account deleted: ${userEmail} (${userId})`);
      res.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
}

// server/routes/jobs.ts
function registerJobRoutes(app2) {
  app2.get("/api/jobs/:jobId", isAuthenticated, (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });
  app2.get("/api/jobs", isAuthenticated, (req, res) => {
    const ids = (req.query.ids || "").split(",").filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: "Provide ?ids=id1,id2,..." });
    if (ids.length > 50) return res.status(400).json({ error: "Max 50 job IDs per request" });
    const results = getJobs(ids).map((j, i) => j || { id: ids[i], status: "not_found" });
    res.json(results);
  });
}

// server/routes.ts
async function registerRoutes(httpServer2, app2) {
  registerAuthRoutes(app2);
  (async () => {
    try {
      await runStartupHealthCheck();
    } catch (err) {
      console.error("[startup] Health check failed:", err);
    }
  })();
  app2.use("/api/", apiRateLimiter);
  registerOrganizationRoutes(app2);
  registerPlansBillingRoutes(app2);
  registerPackRoutes(app2);
  registerDogRoutes(app2);
  registerPortraitRoutes(app2);
  registerBatchRoutes(app2);
  registerMerchRoutes(app2);
  registerCustomerSessionRoutes(app2);
  registerAdminRoutes(app2);
  registerSmsRoutes(app2);
  registerInstagramRoutes(app2);
  registerGdprRoutes(app2);
  registerJobRoutes(app2);
  return httpServer2;
}

// server/static.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function serveStatic(app2) {
  const distPath = import_path.default.resolve(__dirname, "public");
  if (!import_fs.default.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(import_express.default.static(distPath));
  app2.use("/{*path}", (_req, res) => {
    res.sendFile(import_path.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var import_http = require("http");

// server/seed.ts
init_db();
init_schema();

// client/src/lib/portrait-styles.ts
var portraitStyles2 = [
  {
    id: 1,
    name: "Renaissance Noble",
    description: "A dignified portrait in the style of Italian Renaissance masters",
    category: "Classical",
    species: "dog",
    promptTemplate: "A majestic Renaissance oil painting portrait of a white fluffy {breed} dog wearing ornate noble attire with a velvet collar and golden medallion, dramatic chiaroscuro lighting, rich earth tones, in the style of Leonardo da Vinci and Raphael, museum quality, highly detailed white fur texture"
  },
  {
    id: 25,
    name: "Baroque Aristocrat",
    description: "Opulent and dramatic in the Baroque tradition",
    category: "Classical",
    species: "dog",
    promptTemplate: "An opulent Baroque oil painting portrait of a {breed} dog as an aristocrat wearing an elaborate ruff collar and jeweled chain, dramatic lighting with deep shadows, rich burgundy and gold colors, in the style of Rembrandt and Caravaggio, ornate gilded frame style"
  },
  {
    id: 2,
    name: "Victorian Gentleman",
    description: "Distinguished elegance of the Victorian era",
    category: "Classical",
    species: "dog",
    promptTemplate: "A distinguished Victorian portrait of a {breed} dog as a proper gentleman wearing a top hat and monocle with a fine tweed jacket and pocket watch chain, photographed in a Victorian study with leather books and brass fixtures, warm sepia tones, dignified and refined, professional pet photography"
  },
  {
    id: 3,
    name: "Royal Monarch",
    description: "Regal portraiture fit for royalty",
    category: "Classical",
    species: "dog",
    promptTemplate: "A regal royal portrait of a {breed} dog as a king or queen wearing an ermine-trimmed cape and crown, holding a scepter, throne room background with rich tapestries, oil painting in the style of royal court painters, majestic and commanding presence"
  },
  {
    id: 5,
    name: "Art Nouveau Beauty",
    description: "Elegant flowing lines and natural motifs",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A real {breed} dog photographed wearing a delicate floral wreath collar, posed against a painted Art Nouveau backdrop with flowing organic patterns and gilded decorative border, soft natural lighting, real dog with artistic styled setting inspired by Alphonse Mucha, pastel colors with gold accents"
  },
  {
    id: 26,
    name: "Impressionist Garden",
    description: "Soft, light-filled garden scene",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A beautiful Impressionist painting of a {breed} dog in a sunlit garden with blooming flowers, visible brushstrokes, dappled light through trees, soft and dreamy atmosphere, in the style of Monet and Renoir, vibrant yet gentle colors"
  },
  {
    id: 24,
    name: "Vintage Classic",
    description: "Timeless old-fashioned charm",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A charming vintage-style portrait of a {breed} dog in an antique setting, wearing a simple bow tie or pearl collar, sepia-toned photograph aesthetic, classic furniture and lace curtains, timeless elegance, nostalgic and refined"
  },
  {
    id: 22,
    name: "Spring Flower Crown",
    description: "Whimsical garden beauty",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A whimsical portrait of a {breed} dog wearing a delicate flower crown, sitting in a meadow of wildflowers, soft bokeh background with butterflies, dreamy golden hour lighting, gentle and sweet, natural beauty"
  },
  {
    id: 6,
    name: "Steampunk Explorer",
    description: "Victorian era meets mechanical innovation",
    category: "Artistic",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing actual steampunk costume accessories - brass goggles on head, leather aviator cap, gear-decorated collar, photographed in Victorian industrial setting with copper pipes and gears backdrop, warm sepia lighting, real dog in real costume, not cartoon or illustration"
  },
  {
    id: 9,
    name: "Space Explorer",
    description: "Futuristic astronaut among the stars",
    category: "Sci-Fi",
    species: "dog",
    promptTemplate: "A full-body portrait of a {breed} dog as an astronaut, the dog's head completely fills the open helmet with no empty space between the head and helmet rim, the dog's body naturally fills out a detailed NASA-style space suit with mission patches and life-support hoses, standing heroically on the lunar surface with Earth rising in the background, cosmic starfield, the dog's face is large and clearly visible looking straight at camera through the open visor, photorealistic cinematic lighting, highly detailed, anatomically correct dog proportions inside the suit"
  },
  {
    id: 12,
    name: "Pirate Captain",
    description: "Swashbuckling adventure on the high seas",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual pirate costume with tricorn hat and eyepatch accessory, photographed on a ship deck setting, ocean background, warm golden sunset lighting, real dog in real costume, not cartoon or illustration, professional pet photography"
  },
  {
    id: 13,
    name: "Cowboy Sheriff",
    description: "Wild West lawkeeper with frontier charm",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual cowboy hat and sheriff badge bandana, photographed against desert sunset background with cacti, warm golden lighting, real dog in real costume, not cartoon or illustration, professional pet photography"
  },
  {
    id: 15,
    name: "Country Cowboy",
    description: "Rugged Western ranch companion",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A charming portrait of a {breed} dog wearing a classic brown cowboy hat and red bandana, sitting on a rustic wooden fence, golden prairie sunset background, warm country vibes, loyal ranch companion, natural and approachable"
  },
  {
    id: 18,
    name: "Mountain Explorer",
    description: "Adventurous hiking companion",
    category: "Adventure",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a cute mini hiking backpack and adventure bandana, close-up portrait with blurred mountain background, focus on the dog not the scenery, ready for adventure, loyal hiking companion, warm natural lighting"
  },
  {
    id: 10,
    name: "Halloween Pumpkin",
    description: "Whimsical spooky season costume",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A whimsical Halloween portrait of a {breed} dog wearing a cute pumpkin costume or witch hat, surrounded by jack-o-lanterns and autumn decorations, playful spooky atmosphere, orange and purple lighting, fun quirky expression, memorable and shareable"
  },
  {
    id: 23,
    name: "Holiday Spirit",
    description: "Festive seasonal celebration",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a fluffy red and white Santa hat, close-up portrait with cozy holiday background of twinkling lights and wrapped presents, warm fireplace glow, joyful expression, heartwarming holiday spirit"
  },
  {
    id: 20,
    name: "Autumn Leaves",
    description: "Fall season beauty",
    category: "Seasonal",
    species: "dog",
    promptTemplate: "A beautiful portrait of a {breed} dog sitting among colorful autumn leaves in a park, warm golden and orange foliage, soft afternoon sunlight filtering through trees, cozy fall sweater weather vibes, natural seasonal beauty"
  },
  {
    id: 4,
    name: "Bandana Portrait",
    description: "Charming portrait with a colorful bandana",
    category: "Showcase",
    species: "dog",
    promptTemplate: "A charming portrait of a {breed} dog wearing a bright colorful bandana, sitting attentively with happy eyes, soft studio lighting, clean simple background, friendly and approachable expression, professional pet photo style, captures the dog's sweet personality"
  },
  {
    id: 7,
    name: "Tutu Princess",
    description: "Adorable ballerina with soft pink tutu",
    category: "Humanizing",
    species: "dog",
    promptTemplate: "An adorable portrait of a {breed} dog wearing a soft fluffy pink tutu and a delicate tiara, sitting gracefully like a little princess, soft pastel background with sparkles, gentle lighting, sweet innocent expression, humanizing and approachable, perfect for softening tough breed reputations"
  },
  {
    id: 8,
    name: "Cozy Pajamas",
    description: "Snuggly sleepyhead in cute pajamas",
    category: "Humanizing",
    species: "dog",
    promptTemplate: "An adorable portrait of a {breed} dog wearing cozy striped pajamas, curled up on a fluffy pillow with a soft blanket, sleepy content expression, warm bedroom lighting, stuffed toy nearby, like a toddler ready for bedtime, heartwarming and cuddly"
  },
  {
    id: 11,
    name: "Birthday Party",
    description: "Celebratory party pup with festive hat",
    category: "Celebration",
    species: "dog",
    promptTemplate: "A joyful birthday portrait of a {breed} dog wearing a colorful party hat, surrounded by balloons and streamers, birthday cake with candles nearby, confetti falling, bright cheerful colors, happy excited expression, celebrating being part of a forever family"
  },
  {
    id: 14,
    name: "Superhero",
    description: "Caped crusader ready to save the day",
    category: "Modern",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing an actual superhero costume - red satin cape and simple eye mask, photographed in heroic pose against city skyline backdrop, dramatic studio lighting, real dog in real costume, professional pet photography, not cartoon or illustration"
  },
  {
    id: 16,
    name: "Garden Party",
    description: "Elegant outdoor celebration guest",
    category: "Fun",
    species: "dog",
    promptTemplate: "A delightful portrait of a {breed} dog wearing a simple floral collar or bow tie, sitting among blooming flowers in a beautiful English garden, soft afternoon light, charming and refined, tea party atmosphere"
  },
  {
    id: 17,
    name: "Beach Day",
    description: "Sun-kissed seaside companion",
    category: "Fun",
    species: "dog",
    promptTemplate: "A sunny portrait of a {breed} dog relaxing on a beautiful sandy beach, wearing stylish sunglasses, golden sand and turquoise ocean waves, tropical sunset colors, happy carefree summer vibes, natural beach setting"
  },
  {
    id: 19,
    name: "Cozy Cabin",
    description: "Warm fireside friend",
    category: "Fun",
    species: "dog",
    promptTemplate: "A cozy portrait of a {breed} dog curled up by a warm fireplace in a rustic cabin, wearing a plaid flannel bow tie, soft blankets and warm lighting, comfortable winter evening atmosphere, loving and content"
  },
  {
    id: 21,
    name: "Picnic Buddy",
    description: "Perfect park day companion",
    category: "Fun",
    species: "dog",
    promptTemplate: "A real {breed} dog sitting on a cozy picnic blanket in a sunny park, wearing a cute bandana, picnic basket nearby, warm afternoon sunlight, happy relaxed expression, ready for family fun, approachable and friendly"
  },
  {
    id: 28,
    name: "Yoga Instructor",
    description: "Flexible fitness guru striking a pose",
    category: "Fun",
    species: "dog",
    promptTemplate: "A balanced portrait of a {breed} dog as a yoga instructor doing downward dog pose on a purple yoga mat, peaceful studio with plants and natural light, wearing athletic gear, zen atmosphere, namaste energy"
  },
  {
    id: 27,
    name: "Taco Tuesday Chef",
    description: "Festive fiesta friend with tasty treats",
    category: "Fun",
    species: "dog",
    promptTemplate: "A real {breed} dog wearing a small sombrero hat and colorful serape bandana, photographed in a festive Mexican cantina setting with papel picado decorations, surrounded by tacos and fresh ingredients on the table, warm fiesta lighting, real dog in real costume, professional pet photography, not cartoon or illustration"
  },
  {
    id: 29,
    name: "Pool Party",
    description: "Splashy summer fun on a pool float",
    category: "Fun",
    species: "dog",
    promptTemplate: "A fun portrait of a {breed} dog lounging on a colorful inflatable pool float in a sparkling blue swimming pool, wearing tiny sunglasses, bright summer day with pool toys and tropical drinks nearby, splashing water droplets catching the sunlight, happy carefree expression, vibrant summer pool party atmosphere"
  },
  {
    id: 30,
    name: "Campfire",
    description: "Cozy campfire under the stars with roasted treats",
    category: "Fun",
    species: "dog",
    promptTemplate: "A cozy portrait of a {breed} dog sitting by a warm campfire under a starry night sky, wearing a tiny camping bandana, roasting pet treats on a stick over the flames, marshmallows and camping supplies nearby, warm flickering firelight on fur, pine trees silhouetted against the stars, happy content expression, outdoor adventure camping atmosphere"
  },
  {
    id: 31,
    name: "Sleepover Party",
    description: "Epic blanket fort sleepover with all the fixings",
    category: "Fun",
    species: "dog",
    promptTemplate: "A fun portrait of a {breed} dog in the middle of an epic sleepover party inside a blanket fort made of colorful sheets and pillows, wearing cozy pajamas, surrounded by sleeping bags, a flashlight casting warm glow, popcorn bowl and stuffed animals scattered around, excited happy expression, playful nighttime sleepover atmosphere"
  },
  {
    id: 101,
    name: "Egyptian Royalty",
    description: "Ancient Egyptian deity with golden adornments",
    category: "Classical",
    species: "cat",
    promptTemplate: "A majestic ancient Egyptian portrait of a {breed} cat as a divine feline deity, wearing golden collar with lapis lazuli and turquoise jewels, Egyptian temple background with hieroglyphics, warm golden lighting, regal and mysterious, in the style of ancient Egyptian art but photorealistic, museum quality"
  },
  {
    id: 102,
    name: "Renaissance Feline",
    description: "Elegant portrait in the Italian Renaissance tradition",
    category: "Classical",
    species: "cat",
    promptTemplate: "A refined Renaissance oil painting portrait of a {breed} cat lounging on a velvet cushion wearing an ornate jeweled collar, dramatic chiaroscuro lighting, rich warm tones, in the style of Leonardo da Vinci, elegant and aristocratic, museum quality, detailed fur texture"
  },
  {
    id: 103,
    name: "Victorian Lady",
    description: "Prim and proper Victorian elegance",
    category: "Classical",
    species: "cat",
    promptTemplate: "A distinguished Victorian portrait of a {breed} cat wearing a delicate lace collar and cameo brooch, perched gracefully on an ornate chair in a parlor with velvet curtains and antique furniture, warm sepia tones, dignified and refined, professional pet photography"
  },
  {
    id: 104,
    name: "Sunbeam Napper",
    description: "Cozy cat basking in a warm sunbeam",
    category: "Cozy",
    species: "cat",
    promptTemplate: "A heartwarming portrait of a {breed} cat curled up and napping in a warm golden sunbeam on a cozy window seat, soft knit blanket underneath, dust motes floating in the light, peaceful sleeping expression, warm amber and honey tones, gentle bokeh background of a cozy living room, photorealistic, tender and serene atmosphere"
  },
  {
    id: 105,
    name: "Space Cadet",
    description: "Cosmic kitty exploring the final frontier",
    category: "Sci-Fi",
    species: "cat",
    promptTemplate: "A full-body portrait of a {breed} cat as an astronaut, the cat's head completely fills the open helmet with no empty space between the head and helmet rim, the cat's furry body naturally fills out a detailed NASA-style space suit with mission patches and life-support hoses, standing heroically on the lunar surface with Earth rising in the background, cosmic starfield and nebula, the cat's face is large and clearly visible looking straight at camera through the open visor, photorealistic cinematic lighting, highly detailed, anatomically correct cat proportions inside the suit"
  },
  {
    id: 106,
    name: "Purrista Barista",
    description: "Your favorite feline coffee artist",
    category: "Fun",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat as a tiny barista behind a miniature coffee shop counter, wearing a small apron and barista cap, surrounded by espresso machines and latte cups with cat-face latte art, warm cafe lighting with chalkboard menu in background, charming and whimsical, cozy coffeehouse atmosphere, irresistibly cute"
  },
  {
    id: 107,
    name: "Midnight Prowler",
    description: "Mysterious feline under moonlight",
    category: "Adventure",
    species: "cat",
    promptTemplate: "A dramatic portrait of a {breed} cat perched on a moonlit rooftop or garden wall, silvery moonlight casting elegant shadows, starry night sky background, mysterious and enchanting atmosphere, the cat's eyes glowing softly, beautiful nighttime photography"
  },
  {
    id: 108,
    name: "Bookshelf Scholar",
    description: "Intellectual companion among the books",
    category: "Humanizing",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat sitting among stacked books on a cozy bookshelf, wearing tiny reading glasses perched on nose, warm library lighting, leather-bound books and a warm cup of tea nearby, intellectual and charming, cozy literary atmosphere"
  },
  {
    id: 109,
    name: "Garden Explorer",
    description: "Curious kitty among the flowers",
    category: "Fun",
    species: "cat",
    promptTemplate: "A delightful portrait of a {breed} cat exploring a beautiful garden among blooming flowers and butterflies, wearing a small floral collar, soft afternoon sunlight, curious playful expression, surrounded by colorful roses and lavender, natural and enchanting"
  },
  {
    id: 110,
    name: "Bow Tie Portrait",
    description: "Dapper portrait with a charming bow tie",
    category: "Showcase",
    species: "cat",
    promptTemplate: "A charming portrait of a {breed} cat wearing a cute bow tie, sitting with wide bright eyes, soft studio lighting, clean simple background, friendly and approachable expression, professional pet photo style, captures the cat's sweet personality"
  },
  {
    id: 111,
    name: "Cozy Blanket",
    description: "Snuggly kitty wrapped in warmth",
    category: "Humanizing",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat wrapped in a soft knitted blanket, peeking out with sleepy content eyes, warm bedroom lighting, fluffy pillows nearby, cozy and heartwarming, like a child tucked in for bedtime, irresistibly cuddly"
  },
  {
    id: 112,
    name: "Halloween Black Cat",
    description: "Enchanting spooky season mystique",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A whimsical Halloween portrait of a {breed} cat wearing a tiny witch hat, surrounded by glowing jack-o-lanterns and autumn decorations, mysterious and playful atmosphere, orange and purple lighting, enchanting expression, magical and shareable"
  },
  {
    id: 113,
    name: "Holiday Stocking",
    description: "Festive kitty in holiday cheer",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A real {breed} cat peeking out of a cozy holiday stocking or wearing a fluffy red and white Santa hat, twinkling lights and wrapped presents in background, warm fireplace glow, playful curious expression, heartwarming holiday spirit"
  },
  {
    id: 114,
    name: "Spring Blossoms",
    description: "Gentle beauty among cherry blossoms",
    category: "Seasonal",
    species: "cat",
    promptTemplate: "A beautiful portrait of a {breed} cat sitting among delicate cherry blossom branches, wearing a small flower crown, soft pink petals falling gently, dreamy spring atmosphere, golden hour lighting, gentle and sweet, natural beauty"
  },
  {
    id: 115,
    name: "Box Inspector",
    description: "Classic cat-in-a-box charm",
    category: "Fun",
    species: "cat",
    promptTemplate: "An adorable portrait of a {breed} cat sitting inside a cardboard box, peeking over the edge with curious wide eyes, playful and mischievous expression, warm home lighting, the box decorated with doodles, charming and relatable, captures the universal cat love of boxes"
  },
  {
    id: 116,
    name: "Tea Party Guest",
    description: "Refined afternoon tea companion",
    category: "Fun",
    species: "cat",
    promptTemplate: "A charming portrait of a {breed} cat sitting at a tiny tea party setting with miniature cups and saucers, wearing a small pearl collar, delicate floral tablecloth, soft afternoon light through a window, elegant and whimsical, very British and refined"
  },
  {
    id: 117,
    name: "Pool Lounge",
    description: "Regal poolside lounging on a flamingo float",
    category: "Fun",
    species: "cat",
    promptTemplate: "A delightful portrait of a {breed} cat lounging like royalty on a pink inflatable flamingo float in a sparkling pool, wearing tiny sunglasses, bright summer day, crystal blue water with playful reflections, tropical poolside setting with palm leaves, relaxed and regal expression, fun summer vibes"
  },
  {
    id: 118,
    name: "Starlight Camp",
    description: "Magical campfire night toasting fish treats",
    category: "Fun",
    species: "cat",
    promptTemplate: "A cozy portrait of a {breed} cat sitting by a warm campfire under a starry night sky, wearing a tiny plaid scarf, toasting fish-shaped treats on a stick over the flames, camping lantern and small tent nearby, warm flickering firelight reflecting in wide curious eyes, pine trees and stars in background, magical outdoor camping atmosphere"
  },
  {
    id: 119,
    name: "Blanket Fort",
    description: "Cozy blanket fort party with fairy lights",
    category: "Fun",
    species: "cat",
    promptTemplate: "A fun portrait of a {breed} cat peeking out from inside a cozy blanket fort made of soft sheets and fairy lights, wearing tiny pajamas, surrounded by fluffy pillows and sleeping bags, flashlight beam and popcorn bowl nearby, wide playful eyes, warm glow from string lights, magical sleepover party atmosphere"
  }
];
var dogStyles = portraitStyles2.filter((s) => s.species === "dog");
var catStyles = portraitStyles2.filter((s) => s.species === "cat");
var styleCategories = Array.from(new Set(portraitStyles2.map((s) => s.category)));

// server/seed.ts
var import_drizzle_orm6 = require("drizzle-orm");
var planDefinitions = [
  // Legacy plans (kept for backward compat, marked inactive)
  {
    id: 5,
    name: "Free Trial (Legacy)",
    description: "Legacy trial plan \u2014 replaced by vertical-specific plans.",
    priceMonthly: 0,
    dogsLimit: 3,
    monthlyPortraitCredits: 20,
    overagePriceCents: 0,
    trialDays: 30,
    isActive: false
  },
  {
    id: 6,
    name: "Starter (Legacy)",
    description: "Legacy starter plan \u2014 replaced by vertical-specific plans.",
    priceMonthly: 3900,
    dogsLimit: 15,
    monthlyPortraitCredits: 45,
    overagePriceCents: 400,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpB2LfX3IuyBIb44I2uwq",
    stripeProductId: "prod_TzMYhqaSdDwYcO"
  },
  {
    id: 7,
    name: "Professional (Legacy)",
    description: "Legacy professional plan \u2014 replaced by vertical-specific plans.",
    priceMonthly: 7900,
    dogsLimit: 45,
    monthlyPortraitCredits: 135,
    overagePriceCents: 400,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpC2LfX3IuyBIBj9Mdx3f",
    stripeProductId: "prod_TzMY4ahWLz2y9C"
  },
  {
    id: 8,
    name: "Executive (Legacy)",
    description: "Legacy executive plan \u2014 replaced by vertical-specific plans.",
    priceMonthly: 34900,
    dogsLimit: 200,
    monthlyPortraitCredits: 600,
    overagePriceCents: 300,
    trialDays: 0,
    isActive: false,
    stripePriceId: "price_1T1NpC2LfX3IuyBIPtezJkZ0",
    stripeProductId: "prod_TzMYb3LIL5kiZ5"
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
    overagePriceCents: 800,
    // $8 per 10 credits
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
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
    trialDays: 30
  }
];
async function seedDatabase() {
  console.log("Checking if seed data exists...");
  try {
    const migTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1e4));
    await Promise.race([
      (async () => {
        await pool.query("SET LOCAL statement_timeout = 8000");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_test_mode BOOLEAN DEFAULT false NOT NULL");
        const migResult = await pool.query("UPDATE organizations SET stripe_test_mode = true WHERE stripe_customer_id IS NOT NULL AND stripe_test_mode = false");
        if (migResult.rowCount && migResult.rowCount > 0) {
          console.log(`[migration] Set ${migResult.rowCount} existing org(s) to Stripe test mode`);
        }
        console.log("[migration] stripe_test_mode column ready");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_type TEXT");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS capture_mode TEXT");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'receipt'");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_mode TEXT DEFAULT 'both'");
        console.log("[migration] Pros org columns ready");
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
        await pool.query(`CREATE TABLE IF NOT EXISTS merch_order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES merch_orders(id) ON DELETE CASCADE,
          product_key TEXT NOT NULL,
          variant_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          price_cents INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        await pool.query("ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS occasion TEXT");
        await pool.query("ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS artwork_url TEXT");
        console.log("[migration] Merch order items card columns ready");
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
        await pool.query(`CREATE TABLE IF NOT EXISTS batch_sessions (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          staff_user_id VARCHAR,
          status TEXT NOT NULL DEFAULT 'uploading',
          photo_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS batch_photos (
          id SERIAL PRIMARY KEY,
          batch_session_id INTEGER NOT NULL REFERENCES batch_sessions(id) ON DELETE CASCADE,
          photo_url TEXT NOT NULL,
          dog_id INTEGER REFERENCES dogs(id),
          assigned_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS owner_email TEXT");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS owner_phone TEXT");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS pet_code VARCHAR(10)");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS visit_frequency TEXT");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS update_preference TEXT");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS stay_nights INTEGER");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS next_portrait_date TEXT");
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS last_portrait_style_id INTEGER");
        console.log("[migration] Dog vertical fields ready");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS vertical TEXT");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS unit_type TEXT");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS unit_limit INTEGER");
        console.log("[migration] Subscription plan vertical columns ready");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_live_price_id TEXT");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_live_id TEXT");
        console.log("[migration] Stripe live-mode columns ready");
        await pool.query(`CREATE TABLE IF NOT EXISTS daily_pack_selections (
          id SERIAL PRIMARY KEY,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          species TEXT NOT NULL DEFAULT 'dog',
          pack_type TEXT NOT NULL,
          selected_by VARCHAR,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        await pool.query(`ALTER TABLE daily_pack_selections ADD COLUMN IF NOT EXISTS species TEXT NOT NULL DEFAULT 'dog'`);
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
        console.log("[migration] Pros tables ready");
      })(),
      migTimeout
    ]);
  } catch (migErr) {
    console.log("[migration] Pros migrations:", migErr.message);
  }
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP");
    console.log("[migration] consent columns ready");
  } catch (migErr) {
    console.log("[migration] consent columns:", migErr.message);
  }
  await seedSubscriptionPlans();
  try {
    const { stripeService: stripeService2 } = await Promise.resolve().then(() => (init_stripeService(), stripeService_exports));
    await stripeService2.ensureVerticalPlanProducts(true);
  } catch (err) {
    console.error("[stripe] Test product setup:", err.message);
  }
  try {
    const { stripeService: stripeService2 } = await Promise.resolve().then(() => (init_stripeService(), stripeService_exports));
    await stripeService2.ensureVerticalPlanProducts(false);
  } catch (err) {
    console.error("[stripe] Live product setup:", err.message);
  }
  const existingStyles = await db.select().from(portraitStyles);
  const existingMap = new Map(existingStyles.map((s) => [s.id, s]));
  const missingStyles = portraitStyles2.filter((s) => !existingMap.has(s.id));
  if (missingStyles.length > 0) {
    console.log(`Seeding ${missingStyles.length} missing portrait styles...`);
    for (const style of missingStyles) {
      await db.insert(portraitStyles).values({
        id: style.id,
        name: style.name,
        description: style.description,
        promptTemplate: style.promptTemplate,
        category: style.category
      }).onConflictDoNothing();
    }
    console.log(`Seeded ${missingStyles.length} portrait styles`);
  }
  let updatedCount = 0;
  for (const style of portraitStyles2) {
    const existing = existingMap.get(style.id);
    if (existing && (existing.name !== style.name || existing.description !== style.description || existing.promptTemplate !== style.promptTemplate || existing.category !== style.category)) {
      await db.update(portraitStyles).set({
        name: style.name,
        description: style.description,
        promptTemplate: style.promptTemplate,
        category: style.category
      }).where((0, import_drizzle_orm6.eq)(portraitStyles.id, style.id));
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} changed portrait styles`);
  }
  const validIds = portraitStyles2.map((s) => s.id);
  const staleEntries = existingStyles.filter((s) => !validIds.includes(s.id));
  if (staleEntries.length > 0) {
    await db.delete(portraitStyles).where((0, import_drizzle_orm6.notInArray)(portraitStyles.id, validIds));
    console.log(`Removed ${staleEntries.length} stale portrait styles: ${staleEntries.map((s) => s.name).join(", ")}`);
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
      const updateData = {};
      if (existing.priceMonthly !== plan.priceMonthly) updateData.priceMonthly = plan.priceMonthly;
      if (existing.dogsLimit !== plan.dogsLimit) updateData.dogsLimit = plan.dogsLimit;
      if (existing.monthlyPortraitCredits !== plan.monthlyPortraitCredits) updateData.monthlyPortraitCredits = plan.monthlyPortraitCredits;
      if (existing.overagePriceCents !== plan.overagePriceCents) updateData.overagePriceCents = plan.overagePriceCents;
      if (existing.trialDays !== plan.trialDays) updateData.trialDays = plan.trialDays;
      if (plan.stripePriceId && existing.stripePriceId !== plan.stripePriceId) updateData.stripePriceId = plan.stripePriceId;
      if (plan.stripeProductId && existing.stripeProductId !== plan.stripeProductId) updateData.stripeProductId = plan.stripeProductId;
      if (existing.description !== plan.description) updateData.description = plan.description;
      if (existing.name !== plan.name) updateData.name = plan.name;
      if (existing.vertical !== plan.vertical) updateData.vertical = plan.vertical;
      if (existing.unitType !== plan.unitType) updateData.unitType = plan.unitType;
      if (existing.unitLimit !== plan.unitLimit) updateData.unitLimit = plan.unitLimit;
      if (existing.isActive !== plan.isActive && plan.isActive !== void 0) updateData.isActive = plan.isActive;
      if (Object.keys(updateData).length > 0) {
        await db.update(subscriptionPlans).set(updateData).where((0, import_drizzle_orm6.eq)(subscriptionPlans.id, plan.id));
        updated++;
      }
    }
  }
  if (inserted > 0) console.log(`Seeded ${inserted} subscription plans`);
  if (updated > 0) console.log(`Updated ${updated} subscription plans`);
  if (inserted === 0 && updated === 0) console.log("Subscription plans already up to date, skipping...");
}

// server/webhookHandlers.ts
init_stripeClient();
init_storage();
init_db();
init_stripeService();
init_subscription();
init_email();
var WebhookHandlers = class _WebhookHandlers {
  static async processWebhook(payload, signature) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Received type: " + typeof payload + ". This usually means express.json() parsed the body before reaching this handler. FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }
    let event;
    const liveStripe2 = getStripeClient(false);
    const testStripe2 = getStripeClient(true);
    const liveSecret = getWebhookSecret(false);
    const testSecret = getWebhookSecret(true);
    try {
      event = liveStripe2.webhooks.constructEvent(payload, signature, liveSecret);
    } catch {
      event = testStripe2.webhooks.constructEvent(payload, signature, testSecret);
    }
    await _WebhookHandlers.handleEvent(event);
  }
  static async handleEvent(event) {
    const type = event.type;
    const data = event.data?.object;
    if (!data) return;
    switch (type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
        if (!customerId) break;
        const orgs = await storage.getAllOrganizations();
        const org = orgs.find((o) => o.stripeCustomerId === customerId);
        if (!org) {
          console.log(`[webhook] No org found for Stripe customer ${customerId}`);
          break;
        }
        const testMode = org.stripeTestMode;
        const newStatus = mapStripeStatusToInternal(data.status, org.subscriptionStatus);
        if (newStatus === "canceled") {
          const result = await handleCancellation(org.id, org);
          console.log(`[webhook] Subscription canceled for org ${org.id}: ${result}`);
          break;
        }
        await storage.updateOrganizationStripeInfo(org.id, {
          subscriptionStatus: newStatus,
          stripeSubscriptionId: data.id
        });
        if (data.status === "active" && data.current_period_start) {
          const periodStart = new Date(data.current_period_start * 1e3);
          const existingStart = org.billingCycleStart;
          if (!existingStart || existingStart.getMonth() !== periodStart.getMonth() || existingStart.getFullYear() !== periodStart.getFullYear()) {
            await storage.updateOrganization(org.id, {
              billingCycleStart: periodStart
            });
            await storage.syncOrgCredits(org.id);
          }
        }
        try {
          const addonPriceId = await stripeService.getAddonPriceId(testMode);
          const subItems = data.items?.data || [];
          const addonItem = subItems.find((item) => {
            const priceId = typeof item.price === "string" ? item.price : item.price?.id;
            return priceId === addonPriceId;
          });
          const addonQuantity = addonItem ? Math.min(addonItem.quantity || 0, 5) : 0;
          if (addonQuantity !== (org.additionalPetSlots || 0)) {
            await storage.updateOrganization(org.id, { additionalPetSlots: addonQuantity });
            console.log(`[webhook] Synced add-on slots for org ${org.id}: ${addonQuantity}`);
          }
        } catch (addonErr) {
          console.error(`[webhook] Error syncing add-on slots for org ${org.id}:`, addonErr.message);
        }
        console.log(`[webhook] Updated org ${org.id} subscription: ${newStatus}`);
        break;
      }
      case "invoice.payment_succeeded": {
        const customerId = typeof data.customer === "string" ? data.customer : data.customer?.id;
        if (!customerId) break;
        const orgs = await storage.getAllOrganizations();
        const org = orgs.find((o) => o.stripeCustomerId === customerId);
        if (!org) break;
        if (data.billing_reason === "subscription_cycle") {
          const periodStart = data.period_start ? new Date(data.period_start * 1e3) : /* @__PURE__ */ new Date();
          const updateFields = { billingCycleStart: periodStart };
          if (org.pendingPlanId) {
            const pendingPlan = await storage.getSubscriptionPlan(org.pendingPlanId);
            if (pendingPlan) {
              updateFields.planId = pendingPlan.id;
              updateFields.pendingPlanId = null;
              updateFields.additionalPetSlots = 0;
              console.log(`[webhook] Applied pending plan change for org ${org.id}: plan ${pendingPlan.name}`);
            } else {
              updateFields.pendingPlanId = null;
            }
          }
          await storage.updateOrganization(org.id, updateFields);
          await storage.syncOrgCredits(org.id);
          console.log(`[webhook] Synced credits for org ${org.id} on billing cycle`);
        }
        break;
      }
      case "checkout.session.completed": {
        const merchOrderId = data.metadata?.merchOrderId;
        if (!merchOrderId) break;
        const orderResult = await pool.query(
          `SELECT * FROM merch_orders WHERE id = $1`,
          [parseInt(merchOrderId)]
        );
        if (orderResult.rows.length === 0) break;
        const order = orderResult.rows[0];
        if (order.status !== "awaiting_payment") {
          console.log(`[webhook] Merch order ${merchOrderId} already processed (status: ${order.status})`);
          break;
        }
        if (data.payment_status !== "paid") break;
        await pool.query(
          `UPDATE merch_orders SET status = 'paid' WHERE id = $1`,
          [order.id]
        );
        const itemsResult = await pool.query(
          `SELECT * FROM merch_order_items WHERE order_id = $1`,
          [order.id]
        );
        const imageUrl = data.metadata?.imageUrl;
        if (!imageUrl) {
          console.error(`[webhook] No imageUrl in session metadata for merch order ${order.id}`);
          break;
        }
        const recipient = {
          name: order.customer_name,
          address1: order.shipping_street,
          city: order.shipping_city,
          state_code: order.shipping_state,
          zip: order.shipping_zip,
          country_code: order.shipping_country || "US",
          email: order.customer_email,
          phone: order.customer_phone
        };
        try {
          const printfulItems = itemsResult.rows.map(
            (item) => buildOrderItem(item.variant_id, item.quantity, imageUrl)
          );
          const printfulOrder = await createOrder(recipient, printfulItems, String(order.id));
          await pool.query(
            `UPDATE merch_orders SET printful_order_id = $1, printful_status = $2, status = 'submitted' WHERE id = $3`,
            [String(printfulOrder.id), printfulOrder.status, order.id]
          );
          try {
            await confirmOrder(printfulOrder.id);
            await pool.query(
              `UPDATE merch_orders SET status = 'confirmed' WHERE id = $1`,
              [order.id]
            );
          } catch (confirmErr) {
            console.warn(`[webhook] Auto-confirm failed for order ${order.id}:`, confirmErr.message);
          }
          if (order.customer_email && isEmailConfigured()) {
            try {
              const org = await storage.getOrganization(order.organization_id);
              const itemDescriptions = itemsResult.rows.map((item) => {
                const product = getProduct(item.product_key);
                return `${product?.name || item.product_key} x${item.quantity}`;
              });
              const dogResult = order.dog_id ? await storage.getDog(order.dog_id) : null;
              const dogName = dogResult?.name || "your pet";
              const orgName = org?.name || "Pawtrait Pros";
              const { subject, html } = buildOrderConfirmationEmail(orgName, dogName, order.id, order.total_cents, itemDescriptions);
              let attachments;
              if (order.portrait_id) {
                try {
                  const baseUrl = process.env.APP_URL || "https://pawtraitpros.com";
                  const downloadRes = await fetch(`${baseUrl}/api/portraits/${order.portrait_id}/download`);
                  if (downloadRes.ok) {
                    const buffer = Buffer.from(await downloadRes.arrayBuffer());
                    attachments = [{ filename: `${dogName.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png`, content: buffer }];
                  }
                } catch (dlErr) {
                  console.warn(`[webhook] Failed to fetch watermarked portrait:`, dlErr.message);
                }
              }
              await sendEmail(order.customer_email, subject, html, attachments, orgName);
              console.log(`[webhook] Confirmation email sent for merch order ${order.id}`);
            } catch (emailErr) {
              console.warn(`[webhook] Failed to send confirmation email for order ${order.id}:`, emailErr.message);
            }
          }
          console.log(`[webhook] Merch order ${order.id} fulfilled via webhook`);
        } catch (printfulErr) {
          console.error(`[webhook] Printful order failed for paid order ${order.id}:`, printfulErr.message);
          await pool.query(
            `UPDATE merch_orders SET status = 'paid_fulfillment_pending', printful_status = $1 WHERE id = $2`,
            [printfulErr.message, order.id]
          );
        }
        break;
      }
      default:
        break;
    }
  }
};

// server/og-meta.ts
var import_url = require("url");
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
init_storage();
var import_meta = {};
var currentDir = typeof __dirname !== "undefined" ? __dirname : import_path2.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
var SITE_NAME = "Pawtrait Pros";
var BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "Slackbot",
  "TelegramBot",
  "Pinterest",
  "Discordbot",
  "Nextdoor",
  "Google-InspectionTool",
  "Googlebot",
  "bingbot",
  "Applebot",
  "Embedly",
  "outbrain",
  "vkShare",
  "W3C_Validator",
  "redditbot"
];
function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot.toLowerCase()));
}
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "pawtraitpros.com";
  return `${proto}://${host}`;
}
function buildOgHtml(template, meta) {
  const ogTags = [
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="${meta.imageUrl ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  ];
  if (meta.imageUrl) {
    ogTags.push(`<meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />`);
    ogTags.push(`<meta property="og:image:width" content="1200" />`);
    ogTags.push(`<meta property="og:image:height" content="630" />`);
    ogTags.push(`<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}" />`);
  }
  const titleTag = `<title>${escapeHtml(meta.title)}</title>`;
  const descTag = `<meta name="description" content="${escapeHtml(meta.description)}" />`;
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, titleTag);
  html = html.replace(/<meta name="description"[^>]*\/>/, descTag);
  html = html.replace(/<meta property="og:title"[^>]*\/>/, "");
  html = html.replace(/<meta property="og:description"[^>]*\/>/, "");
  html = html.replace("</head>", `    ${ogTags.join("\n    ")}
  </head>`);
  return html;
}
function getHtmlTemplate() {
  const isProd = process.env.NODE_ENV === "production";
  const templatePath = isProd ? import_path2.default.resolve(currentDir, "public", "index.html") : import_path2.default.resolve(currentDir, "..", "client", "index.html");
  return import_fs2.default.readFileSync(templatePath, "utf-8");
}
function setupOgMetaRoutes(app2) {
  app2.get("/business/:slug", async (req, res, next) => {
    const ua = req.headers["user-agent"];
    if (!isCrawler(ua)) return next();
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org || !org.isActive) return next();
      const orgDogs = await storage.getDogsByOrganization(org.id);
      const availableDogs = orgDogs.filter((d) => d.isAvailable);
      const baseUrl = getBaseUrl(req);
      const ogImageUrl = `${baseUrl}/api/business/${slug}/og-image`;
      const petCount = availableDogs.length;
      const speciesSet = new Set(availableDogs.map((d) => d.species));
      const species = availableDogs.length > 0 ? Array.from(speciesSet).join(" and ") : "pets";
      const description = org.description || `Meet ${petCount} adorable ${species} at ${org.name}! View their beautiful artistic portraits.`;
      const template = getHtmlTemplate();
      const html = buildOgHtml(template, {
        title: `${org.name} - Pet Portraits | ${SITE_NAME}`,
        description,
        imageUrl: ogImageUrl,
        url: `${baseUrl}/business/${slug}`
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("OG meta error for business:", error);
      next();
    }
  });
  app2.get("/pawfile/:id", async (req, res, next) => {
    const ua = req.headers["user-agent"];
    if (!isCrawler(ua)) return next();
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return next();
      const dog = await storage.getDog(id);
      if (!dog) return next();
      const org = dog.organizationId ? await storage.getOrganization(dog.organizationId) : null;
      const baseUrl = getBaseUrl(req);
      const ogImageUrl = `${baseUrl}/api/pawfile/${id}/og-image`;
      const breedStr = dog.breed ? `${dog.breed} ` : "";
      const ageStr = dog.age ? `, ${dog.age}` : "";
      const orgStr = org ? ` at ${org.name}` : "";
      const speciesLabel = dog.species === "cat" ? "Cat" : "Dog";
      const title = `${dog.name} - ${breedStr}${speciesLabel} Portrait${orgStr} | ${SITE_NAME}`;
      const description = dog.description || `Meet ${dog.name}, a beautiful ${breedStr}${speciesLabel.toLowerCase()}${ageStr}${orgStr}. View ${dog.name}'s stunning artistic portrait!`;
      const template = getHtmlTemplate();
      const html = buildOgHtml(template, {
        title,
        description,
        imageUrl: ogImageUrl,
        url: `${baseUrl}/pawfile/${id}`
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("OG meta error for pawfile:", error);
      next();
    }
  });
}

// server/index.ts
var app = (0, import_express2.default)();
app.use((0, import_helmet.default)({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://api.qrserver.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.disable("x-powered-by");
var httpServer = (0, import_http.createServer)(app);
app.post(
  "/api/webhooks/gelato",
  import_express2.default.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const gelatoSecret = process.env.GELATO_WEBHOOK_SECRET;
      if (gelatoSecret) {
        const signature = req.headers["x-gelato-hmac-sha256"];
        if (!signature) {
          console.warn("[gelato-webhook] Missing signature header \u2014 rejecting");
          return res.status(401).json({ error: "Missing webhook signature" });
        }
        const expected = import_crypto4.default.createHmac("sha256", gelatoSecret).update(req.body).digest("hex");
        if (!import_crypto4.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          console.warn("[gelato-webhook] Invalid signature \u2014 rejecting");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }
      const body = JSON.parse(req.body.toString());
      const { event, orderId, orderReferenceId, fulfillmentStatus, items } = body;
      console.log(`[gelato-webhook] Received: ${event} for order ${orderReferenceId || orderId}`);
      if (event !== "order_status_updated" && event !== "order_item_status_updated") {
        return res.status(200).json({ received: true });
      }
      if (!orderReferenceId) {
        return res.status(200).json({ received: true });
      }
      const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const merchOrderId = orderReferenceId.startsWith("gelato-") ? parseInt(orderReferenceId.replace("gelato-", "")) : null;
      if (!merchOrderId || isNaN(merchOrderId)) {
        return res.status(200).json({ received: true });
      }
      let appStatus = null;
      switch (fulfillmentStatus) {
        case "shipped":
        case "in_transit":
          appStatus = "shipped";
          break;
        case "delivered":
          appStatus = "delivered";
          break;
        case "failed":
        case "returned":
          appStatus = "failed";
          break;
        case "canceled":
          appStatus = "canceled";
          break;
        case "in_production":
        case "printed":
          appStatus = "fulfilled";
          break;
      }
      const updateFields = ["printful_status = $1"];
      const updateValues = [fulfillmentStatus];
      let paramIdx = 2;
      if (appStatus) {
        updateFields.push(`status = $${paramIdx}`);
        updateValues.push(appStatus);
        paramIdx++;
      }
      if (orderId) {
        updateFields.push(`printful_order_id = $${paramIdx}`);
        updateValues.push(orderId);
        paramIdx++;
      }
      updateValues.push(merchOrderId);
      await pool2.query(
        `UPDATE merch_orders SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`,
        updateValues
      );
      if (fulfillmentStatus === "shipped" && items?.[0]?.fulfillments?.[0]?.trackingUrl) {
        const tracking = items[0].fulfillments[0];
        console.log(`[gelato-webhook] Tracking for order ${merchOrderId}: ${tracking.trackingUrl}`);
      }
      console.log(`[gelato-webhook] Updated merch_order ${merchOrderId}: ${fulfillmentStatus} \u2192 ${appStatus || "unchanged"}`);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[gelato-webhook] Error:", error.message);
      res.status(200).json({ received: true });
    }
  }
);
app.post(
  "/api/webhooks/printful",
  import_express2.default.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const printfulSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
      if (printfulSecret) {
        const signature = req.headers["x-printful-signature"];
        if (!signature) {
          console.warn("[printful-webhook] Missing signature header \u2014 rejecting");
          return res.status(401).json({ error: "Missing webhook signature" });
        }
        const expected = import_crypto4.default.createHmac("sha256", printfulSecret).update(req.body).digest("hex");
        if (!import_crypto4.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          console.warn("[printful-webhook] Invalid signature \u2014 rejecting");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }
      const body = JSON.parse(req.body.toString());
      const { type, data } = body;
      console.log(`[printful-webhook] Received event: ${type}`);
      if (!data?.order?.external_id) {
        return res.status(200).json({ received: true });
      }
      const merchOrderId = parseInt(data.order.external_id);
      if (isNaN(merchOrderId)) {
        return res.status(200).json({ received: true });
      }
      const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const printfulStatus = data.order.status || type;
      let appStatus = null;
      switch (type) {
        case "package_shipped":
          appStatus = "shipped";
          break;
        case "order_failed":
          appStatus = "failed";
          break;
        case "order_canceled":
          appStatus = "canceled";
          break;
        case "order_created":
          appStatus = "submitted";
          break;
        case "order_updated":
          break;
      }
      const updateFields = ["printful_status = $1"];
      const updateValues = [printfulStatus];
      let paramIdx = 2;
      if (appStatus) {
        updateFields.push(`status = $${paramIdx}`);
        updateValues.push(appStatus);
        paramIdx++;
      }
      if (data.order.id) {
        updateFields.push(`printful_order_id = $${paramIdx}`);
        updateValues.push(String(data.order.id));
        paramIdx++;
      }
      updateValues.push(merchOrderId);
      await pool2.query(
        `UPDATE merch_orders SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`,
        updateValues
      );
      console.log(`[printful-webhook] Updated merch_order ${merchOrderId}: ${type} \u2192 ${appStatus || "status unchanged"}`);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[printful-webhook] Error:", error.message);
      res.status(200).json({ received: true });
    }
  }
);
app.post(
  "/api/stripe/webhook",
  import_express2.default.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }
      await WebhookHandlers.processWebhook(req.body, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);
app.use(import_express2.default.json({ limit: "20mb" }));
app.use(import_express2.default.urlencoded({ extended: false }));
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function sanitizeLogPayload(obj) {
  if (typeof obj === "string") {
    if (obj.length > 500 && obj.startsWith("data:image/")) {
      return `[base64 image, ${Math.round(obj.length / 1024)}kb]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeLogPayload);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeLogPayload(v);
    }
    return out;
  }
  return obj;
}
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(sanitizeLogPayload(capturedJsonResponse))}`;
      }
      log(logLine);
    }
  });
  next();
});
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
var port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);
  (async () => {
    try {
      await seedDatabase();
      log("Database seeded");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
    try {
      setupOgMetaRoutes(app);
      log("OG meta routes ready");
    } catch (error) {
      console.error("Error setting up OG routes:", error);
    }
    try {
      await registerRoutes(httpServer, app);
      log("API routes registered");
    } catch (error) {
      console.error("Error registering routes:", error);
    }
    try {
      const { startPortraitScheduler: startPortraitScheduler2 } = await Promise.resolve().then(() => (init_portrait_scheduler(), portrait_scheduler_exports));
      startPortraitScheduler2();
      log("Portrait scheduler started");
    } catch (error) {
      console.error("Error starting portrait scheduler:", error);
    }
    app.use((err, _req, res, next) => {
      const status = err.status || err.statusCode || 500;
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message: "Internal Server Error" });
    });
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite: setupVite2 } = await Promise.resolve().then(() => (init_vite(), vite_exports));
      await setupVite2(httpServer, app);
    }
    log("All routes and middleware initialized");
  })().catch((err) => {
    console.error("Fatal startup error:", err);
  });
});
httpServer.keepAliveTimeout = 12e4;
httpServer.headersTimeout = 125e3;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
