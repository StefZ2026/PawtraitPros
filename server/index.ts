import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { WebhookHandlers } from './webhookHandlers';
import { setupOgMetaRoutes } from "./og-meta";
import { setupWebSocket } from "./websocket";

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://api.qrserver.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.disable("x-powered-by");
const httpServer = createServer(app);

// Initialize WebSocket server (attaches to existing HTTP server)
setupWebSocket(httpServer);

// Webhook routes MUST be registered BEFORE express.json() — raw body needed for signature verification
app.post('/api/webhooks/gelato', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await WebhookHandlers.processGelatoWebhook(req.body, req.headers['x-gelato-hmac-sha256'] as string);
    res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[gelato-webhook] Error:', error.message);
    res.status(200).json({ received: true });
  }
});

app.post('/api/webhooks/printful', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await WebhookHandlers.processPrintfulWebhook(req.body, req.headers['x-printful-signature'] as string);
    res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[printful-webhook] Error:', error.message);
    res.status(200).json({ received: true });
  }
});

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

function sanitizeLogPayload(obj: any): any {
  if (typeof obj === "string") {
    if (obj.length > 500 && obj.startsWith("data:image/")) {
      return `[base64 image, ${Math.round(obj.length / 1024)}kb]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeLogPayload);
  if (obj && typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeLogPayload(v);
    }
    return out;
  }
  return obj;
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
        logLine += ` :: ${JSON.stringify(sanitizeLogPayload(capturedJsonResponse))}`;
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

    try {
      const { startPortraitScheduler } = await import('./portrait-scheduler');
      startPortraitScheduler();
      log("Portrait scheduler started");
    } catch (error) {
      console.error("Error starting portrait scheduler:", error);
    }

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      console.error("Internal Server Error:", err);
      if (res.headersSent) return next(err);
      return res.status(status).json({ message: "Internal Server Error" });
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
