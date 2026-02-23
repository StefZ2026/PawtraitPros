import type { Express } from "express";
import { type Server } from "http";
import { registerAuthRoutes } from "./auth";
import { apiRateLimiter } from "./routes/helpers";
import { runStartupHealthCheck } from "./routes/startup";
import { registerOrganizationRoutes } from "./routes/organizations";
import { registerPlansBillingRoutes } from "./routes/plans-billing";
import { registerPackRoutes } from "./routes/packs";
import { registerDogRoutes } from "./routes/dogs";
import { registerPortraitRoutes } from "./routes/portraits";
import { registerBatchRoutes } from "./routes/batch";
import { registerMerchRoutes } from "./routes/merch";
import { registerCustomerSessionRoutes } from "./routes/customer-sessions";
import { registerAdminRoutes } from "./routes/admin";
import { registerSmsRoutes } from "./routes/sms-routes";
import { registerInstagramRoutes } from "./routes/instagram";
import { registerGdprRoutes } from "./routes/gdpr";
import { registerJobRoutes } from "./routes/jobs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);

  // Non-blocking startup health check (Stripe sync, data integrity, credit recalculation)
  (async () => {
    try {
      await runStartupHealthCheck();
    } catch (err) {
      console.error("[startup] Health check failed:", err);
    }
  })();

  app.use("/api/", apiRateLimiter);

  registerOrganizationRoutes(app);
  registerPlansBillingRoutes(app);
  registerPackRoutes(app);
  registerDogRoutes(app);
  registerPortraitRoutes(app);
  registerBatchRoutes(app);
  registerMerchRoutes(app);
  registerCustomerSessionRoutes(app);
  registerAdminRoutes(app);
  registerSmsRoutes(app);
  registerInstagramRoutes(app);
  registerGdprRoutes(app);
  registerJobRoutes(app);

  return httpServer;
}
