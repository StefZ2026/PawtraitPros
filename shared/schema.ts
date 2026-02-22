import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users and sessions tables)
export * from "./models/auth";

// Subscription plans for organizations
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull(), // in cents
  dogsLimit: integer("dogs_limit"), // max active pets allowed
  monthlyPortraitCredits: integer("monthly_portrait_credits").default(45), // portrait generations per month (edits are free)
  overagePriceCents: integer("overage_price_cents").default(400), // cost per additional portrait beyond credits
  trialDays: integer("trial_days").default(0), // trial period in days
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Organizations (pet businesses) - SaaS tenants
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  socialTwitter: text("social_twitter"),
  socialNextdoor: text("social_nextdoor"),
  billingStreet: text("billing_street"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country"),
  locationStreet: text("location_street"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationZip: text("location_zip"),
  locationCountry: text("location_country"),
  notes: text("notes"),
  industryType: text("industry_type"), // "groomer" | "boarding" | "daycare"
  captureMode: text("capture_mode"), // "hero" | "batch" — hero=single photo, batch=multi-upload
  deliveryMode: text("delivery_mode").default("receipt"), // "receipt" | "receipt_sms" | "receipt_sms_pod"
  notificationMode: text("notification_mode").default("both"), // "sms" | "email" | "both" — how customers are notified at departure
  speciesHandled: text("species_handled"), // dogs, cats, both — must be explicitly chosen during onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ownerId: varchar("owner_id"), // References users.id (the org owner) — nullable for admin-created or unowned orgs
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // stripeTestMode is managed via raw SQL (added by migration in seed.ts)
  // Read via storage.getOrganization which adds it, defaults to false (live mode)
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, past_due, canceled
  trialEndsAt: timestamp("trial_ends_at"),
  hasUsedFreeTrial: boolean("has_used_free_trial").default(false).notNull(),
  portraitsUsedThisMonth: integer("portraits_used_this_month").default(0).notNull(),
  additionalPetSlots: integer("additional_pet_slots").default(0).notNull(),
  pendingPlanId: integer("pending_plan_id"),
  billingCycleStart: timestamp("billing_cycle_start"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Pets managed by organizations
export const dogs = pgTable("dogs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").default("dog").notNull(), // dog or cat
  breed: text("breed"),
  age: text("age"),
  description: text("description"),
  originalPhotoUrl: text("original_photo_url"),
  adoptionUrl: text("adoption_url"), // Legacy field; Pros uses ownerEmail/ownerPhone instead
  ownerEmail: text("owner_email"), // pet owner's email (Pros only)
  ownerPhone: text("owner_phone"), // pet owner's phone (Pros only)
  petCode: varchar("pet_code", { length: 10 }), // short lookup code e.g. "BEL-2847"
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Portrait styles
export const portraitStyles = pgTable("portrait_styles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  previewImageUrl: text("preview_image_url"),
  category: text("category").notNull(),
});

// Generated portraits
export const portraits = pgTable("portraits", {
  id: serial("id").primaryKey(),
  dogId: integer("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  styleId: integer("style_id").notNull().references(() => portraitStyles.id),
  generatedImageUrl: text("generated_image_url"),
  previousImageUrl: text("previous_image_url"),
  isSelected: boolean("is_selected").default(false).notNull(),
  editCount: integer("edit_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Merch orders (Printful fulfillment)
export const merchOrders = pgTable("merch_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  dogId: integer("dog_id").references(() => dogs.id),
  portraitId: integer("portrait_id").references(() => portraits.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  shippingStreet: text("shipping_street").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").default("US").notNull(),
  printfulOrderId: text("printful_order_id"),
  printfulStatus: text("printful_status"), // synced from Printful webhooks
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  totalCents: integer("total_cents").notNull(),
  shippingCents: integer("shipping_cents").default(0).notNull(),
  status: text("status").default("pending").notNull(), // pending, paid, submitted, fulfilled, shipped, failed
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Individual items within a merch order
export const merchOrderItems = pgTable("merch_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => merchOrders.id, { onDelete: "cascade" }),
  productKey: text("product_key").notNull(), // maps to PRINTFUL_PRODUCTS key
  variantId: integer("variant_id").notNull(), // Printful variant ID
  quantity: integer("quantity").default(1).notNull(),
  priceCents: integer("price_cents").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Customer sessions (QR/short link for ordering)
export const customerSessions = pgTable("customer_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 8 }).notNull().unique(), // short code for URL
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  dogId: integer("dog_id").notNull().references(() => dogs.id),
  portraitId: integer("portrait_id").notNull().references(() => portraits.id),
  packType: text("pack_type"), // "seasonal" | "fun" | "artistic"
  customerPhone: text("customer_phone"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Batch upload sessions (for candid batch capture mode)
export const batchSessions = pgTable("batch_sessions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  staffUserId: varchar("staff_user_id"),
  status: text("status").default("uploading").notNull(), // uploading, assigning, generating, complete
  photoCount: integer("photo_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Individual photos within a batch session
export const batchPhotos = pgTable("batch_photos", {
  id: serial("id").primaryKey(),
  batchSessionId: integer("batch_session_id").notNull().references(() => batchSessions.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(), // base64 data URI
  dogId: integer("dog_id").references(() => dogs.id), // null until assigned
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Daily pack selections — which pack the org chose for each day
export const dailyPackSelections = pgTable("daily_pack_selections", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format (text to avoid timezone issues)
  packType: text("pack_type").notNull(), // "seasonal" | "fun" | "artistic"
  selectedBy: varchar("selected_by"), // staff userId who selected
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Insert schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertDogSchema = createInsertSchema(dogs).omit({
  id: true,
  createdAt: true,
});

export const insertPortraitStyleSchema = createInsertSchema(portraitStyles).omit({
  id: true,
});

export const insertPortraitSchema = createInsertSchema(portraits).omit({
  id: true,
  createdAt: true,
});

export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({
  id: true,
  createdAt: true,
});

export const insertMerchOrderItemSchema = createInsertSchema(merchOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSessionSchema = createInsertSchema(customerSessions).omit({
  id: true,
  createdAt: true,
});

export const insertBatchSessionSchema = createInsertSchema(batchSessions).omit({
  id: true,
  createdAt: true,
});

export const insertBatchPhotoSchema = createInsertSchema(batchPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertDailyPackSelectionSchema = createInsertSchema(dailyPackSelections).omit({
  id: true,
  createdAt: true,
});

// Types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Dog = typeof dogs.$inferSelect;
export type InsertDog = z.infer<typeof insertDogSchema>;

export type PortraitStyle = typeof portraitStyles.$inferSelect;
export type InsertPortraitStyle = z.infer<typeof insertPortraitStyleSchema>;

export type Portrait = typeof portraits.$inferSelect;
export type InsertPortrait = z.infer<typeof insertPortraitSchema>;

export type MerchOrder = typeof merchOrders.$inferSelect;
export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;

export type MerchOrderItem = typeof merchOrderItems.$inferSelect;
export type InsertMerchOrderItem = z.infer<typeof insertMerchOrderItemSchema>;

export type CustomerSession = typeof customerSessions.$inferSelect;
export type InsertCustomerSession = z.infer<typeof insertCustomerSessionSchema>;

export type BatchSession = typeof batchSessions.$inferSelect;
export type InsertBatchSession = z.infer<typeof insertBatchSessionSchema>;

export type BatchPhoto = typeof batchPhotos.$inferSelect;
export type InsertBatchPhoto = z.infer<typeof insertBatchPhotoSchema>;

export type DailyPackSelection = typeof dailyPackSelections.$inferSelect;
export type InsertDailyPackSelection = z.infer<typeof insertDailyPackSelectionSchema>;
