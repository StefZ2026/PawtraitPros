import type { Express, Response } from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../auth";
import { sendSms, formatPhoneNumber, isSmsConfigured } from "./sms";

export function registerSmsRoutes(app: Express): void {
  // --- SMS sharing via Twilio ---
  const smsRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many texts sent. Please wait a minute." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.claims?.sub || "anonymous",
  });

  app.post("/api/send-sms", isAuthenticated, smsRateLimiter, async (req: any, res: Response) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }

      // Basic phone number validation: digits, spaces, dashes, parens, optional leading +
      const cleaned = to.replace(/[\s\-().]/g, "");
      if (!/^\+?1?\d{10,15}$/.test(cleaned)) {
        return res.status(400).json({ error: "Please enter a valid phone number" });
      }

      if (!isSmsConfigured()) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }

      const phone = formatPhoneNumber(cleaned);
      const result = await sendSms(phone, message);

      if (!result.success) {
        throw new Error(result.error || "Failed to send text message");
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("SMS send error:", error);
      res.status(500).json({ error: "Failed to send text message" });
    }
  });
}
