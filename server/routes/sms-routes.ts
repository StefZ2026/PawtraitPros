// SMS API routes — send portrait links to pet owners via Telnyx/Twilio
import type { Express, Response } from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../auth";
import { sendSms, formatPhoneNumber, isSmsConfigured, getRetryStatus } from "./sms";

export function registerSmsRoutes(app: Express): void {
  // --- SMS sharing via Telnyx/Twilio ---
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
      const result = await sendSms(phone, message, mediaUrl || undefined);

      if (result.queued) {
        // Message was delayed due to per-recipient rate limiting
        return res.json({ success: true, queued: true, messageId: result.messageId });
      }

      if (result.retrying) {
        // Carrier rejected but auto-retry is scheduled
        return res.json({ success: false, retrying: true, messageId: result.messageId, error: result.error });
      }

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send text message" });
      }

      // Success — include delivery confirmation status
      res.json({ success: true, delivered: result.delivered, messageId: result.messageId });
    } catch (error: any) {
      console.error("SMS send error:", error);
      res.status(500).json({ error: "Failed to send text message" });
    }
  });

  // --- Check delivery status for retrying/queued messages ---
  app.get("/api/sms-status/:messageId", isAuthenticated, (req: any, res: Response) => {
    const { messageId } = req.params;
    const entry = getRetryStatus(messageId);

    if (!entry) {
      return res.json({ status: "unknown" });
    }

    res.json({
      status: entry.status,
      error: entry.lastError,
    });
  });
}
