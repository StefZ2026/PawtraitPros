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

// Organizations (rescue groups) - SaaS tenants
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

// Pets available for rescue (dogs and cats)
export const dogs = pgTable("dogs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").default("dog").notNull(), // dog or cat
  breed: text("breed"),
  age: text("age"),
  description: text("description"),
  originalPhotoUrl: text("original_photo_url"),
  adoptionUrl: text("adoption_url"),
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
