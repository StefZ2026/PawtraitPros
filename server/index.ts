import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { WebhookHandlers } from './webhookHandlers';
import { setupOgMetaRoutes } from "./og-meta";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.disable("x-powered-by");
const httpServer = createServer(app);

// Register Gelato webhook route BEFORE express.json() - raw body for order status updates
app.post(
  '/api/webhooks/gelato',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.toString());
      const { event, orderId, orderReferenceId, fulfillmentStatus, items } = body;
      console.log(`[gelato-webhook] Received: ${event} for order ${orderReferenceId || orderId}`);

      if (event !== 'order_status_updated' && event !== 'order_item_status_updated') {
        return res.status(200).json({ received: true });
      }

      if (!orderReferenceId) {
        return res.status(200).json({ received: true });
      }

      const { pool } = await import('./db');

      // orderReferenceId maps to our merch_orders.id (prefixed with "gelato-")
      const merchOrderId = orderReferenceId.startsWith('gelato-')
        ? parseInt(orderReferenceId.replace('gelato-', ''))
        : null;

      if (!merchOrderId || isNaN(merchOrderId)) {
        return res.status(200).json({ received: true });
      }

      // Map Gelato fulfillment status to our app status
      let appStatus: string | null = null;
      switch (fulfillmentStatus) {
        case 'shipped':
        case 'in_transit':
          appStatus = 'shipped';
          break;
        case 'delivered':
          appStatus = 'delivered';
          break;
        case 'failed':
        case 'returned':
          appStatus = 'failed';
          break;
        case 'canceled':
          appStatus = 'canceled';
          break;
        case 'in_production':
        case 'printed':
          appStatus = 'fulfilled';
          break;
      }

      const updateFields = ['printful_status = $1']; // reuse printful_status column for Gelato status
      const updateValues: any[] = [fulfillmentStatus];
      let paramIdx = 2;

      if (appStatus) {
        updateFields.push(`status = $${paramIdx}`);
        updateValues.push(appStatus);
        paramIdx++;
      }

      if (orderId) {
        updateFields.push(`printful_order_id = $${paramIdx}`);
        updateValues.push(orderId); // Gelato UUID
        paramIdx++;
      }

      updateValues.push(merchOrderId);
      await pool.query(
        `UPDATE merch_orders SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        updateValues
      );

      // Extract tracking info if shipped
      if (fulfillmentStatus === 'shipped' && items?.[0]?.fulfillments?.[0]?.trackingUrl) {
        const tracking = items[0].fulfillments[0];
        console.log(`[gelato-webhook] Tracking for order ${merchOrderId}: ${tracking.trackingUrl}`);
      }

      console.log(`[gelato-webhook] Updated merch_order ${merchOrderId}: ${fulfillmentStatus} → ${appStatus || 'unchanged'}`);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[gelato-webhook] Error:', error.message);
      res.status(200).json({ received: true }); // Always ack
    }
  }
);

// Register Printful webhook route BEFORE express.json() - raw body needed for signature verification
app.post(
  '/api/webhooks/printful',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.toString());
      const { type, data } = body;
      console.log(`[printful-webhook] Received event: ${type}`);

      if (!data?.order?.external_id) {
        return res.status(200).json({ received: true }); // ack but ignore
      }

      const merchOrderId = parseInt(data.order.external_id);
      if (isNaN(merchOrderId)) {
        return res.status(200).json({ received: true });
      }

      // Import pool inline to avoid circular deps
      const { pool } = await import('./db');

      const printfulStatus = data.order.status || type;
      let appStatus: string | null = null;

      switch (type) {
        case 'package_shipped':
          appStatus = 'shipped';
          break;
        case 'order_failed':
          appStatus = 'failed';
          break;
        case 'order_canceled':
          appStatus = 'canceled';
          break;
        case 'order_created':
          appStatus = 'submitted';
          break;
        case 'order_updated':
          // Only update printful_status, not app status
          break;
      }

      const updateFields = ['printful_status = $1'];
      const updateValues: any[] = [printfulStatus];
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
      await pool.query(
        `UPDATE merch_orders SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        updateValues
      );

      console.log(`[printful-webhook] Updated merch_order ${merchOrderId}: ${type} → ${appStatus || 'status unchanged'}`);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[printful-webhook] Error:', error.message);
      res.status(200).json({ received: true }); // Always ack to prevent retries
    }
  }
);

// Register Stripe webhook route BEFORE express.json() - critical for raw body
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for all other routes
// Increased limit to 20MB for image uploads
app.use(express.json({ limit: '20mb' }));

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint - responds immediately
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

const port = parseInt(process.env.PORT || "5000", 10);

// Bind to port FIRST so Render sees the server is alive
httpServer.listen({ port, host: "0.0.0.0" }, () => {
  log(`serving on port ${port}`);

  // Initialize everything AFTER the server is listening
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

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    log("All routes and middleware initialized");
  })().catch(err => {
    console.error("Fatal startup error:", err);
  });
});

httpServer.keepAliveTimeout = 120000;
httpServer.headersTimeout = 125000;
