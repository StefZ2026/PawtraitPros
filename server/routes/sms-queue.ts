// SMS Queue — stores messages for native sending from BGD's phone
import type { Express, Response } from "express";
import { pool } from "../db";
import { storage } from "../storage";
import { isAuthenticated, isDeviceAuthenticated } from "../auth";
import { resolveOrg, ADMIN_EMAIL, generatePetCode } from "./helpers";
import { getIo } from "../websocket";

export function registerSmsQueueRoutes(app: Express): void {

  // Enqueue messages for a list of dogs (called by deliver-batch or directly)
  app.post("/api/sms-queue/enqueue", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { dogIds, organizationId, messageTemplate } = req.body;

      if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
        return res.status(400).json({ error: "dogIds array is required" });
      }

      const { org, error, status } = await resolveOrg(userId, userEmail, { orgId: organizationId });
      if (!org) return res.status(status || 404).json({ error });

      const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
      const defaultTemplate = "Hi from {orgName}! We created a portrait of {dogName} and it's ready for you. View it and order a keepsake: {link}";
      const template = messageTemplate?.trim() || defaultTemplate;

      const queued: Array<{ dogId: number; queueId: number }> = [];
      const errors: Array<{ dogId: number; error: string }> = [];

      for (const dogId of dogIds) {
        const dog = await storage.getDog(dogId);
        if (!dog || dog.organizationId !== org.id) {
          errors.push({ dogId, error: "Dog not found or wrong org" });
          continue;
        }
        if (!dog.ownerPhone) {
          errors.push({ dogId, error: "No owner phone number" });
          continue;
        }

        // Ensure pet has a code for the pawfile URL
        let petCode = dog.petCode;
        if (!petCode) {
          petCode = generatePetCode(dog.name);
          await storage.updateDog(dog.id, { petCode } as any);
        }

        const pawfileUrl = `${appUrl}/pawfile/code/${petCode}`;

        // Get portrait image URL
        const selectedPortrait = await storage.getSelectedPortraitByDog(dog.id);
        const imageUrl = selectedPortrait?.generatedImageUrl?.startsWith("https://")
          ? selectedPortrait.generatedImageUrl
          : selectedPortrait ? `${appUrl}/api/portraits/${selectedPortrait.id}/image` : null;

        // Build personalized message
        const messageBody = template
          .replace(/\{dogName\}/g, dog.name)
          .replace(/\{orgName\}/g, org.name)
          .replace(/\{link\}/g, pawfileUrl);

        const result = await pool.query(
          `INSERT INTO sms_queue (organization_id, dog_id, recipient_phone, message_body, image_url, pawfile_url, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
          [org.id, dog.id, dog.ownerPhone, messageBody, imageUrl, pawfileUrl]
        );

        queued.push({ dogId: dog.id, queueId: result.rows[0].id });
      }

      // Notify connected devices via WebSocket
      if (queued.length > 0) {
        const io = getIo();
        if (io) {
          io.to(`org:${org.id}`).emit("queue:ready", {
            count: queued.length,
            orgId: org.id,
          });
        }
      }

      res.json({ queued, errors, totalQueued: queued.length });
    } catch (error: any) {
      console.error("Error enqueuing SMS:", error.message);
      res.status(500).json({ error: "Failed to enqueue messages" });
    }
  });

  // Fetch pending messages for the authenticated user's org (companion app calls this)
  app.get("/api/sms-queue/mine", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";

      const { org, error, status } = await resolveOrg(userId, userEmail);
      if (!org) return res.status(status || 404).json({ error });

      // Get pending items and mark them as claimed
      const result = await pool.query(
        `UPDATE sms_queue
         SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1 AND status = 'pending'
         RETURNING id, dog_id, recipient_phone, message_body, image_url, pawfile_url`,
        [org.id]
      );

      res.json({ messages: result.rows, count: result.rows.length });
    } catch (error: any) {
      console.error("Error fetching SMS queue:", error.message);
      res.status(500).json({ error: "Failed to fetch queue" });
    }
  });

  // Peek at queue without claiming (dashboard uses this for status display)
  app.get("/api/sms-queue/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";

      const { org, error, status } = await resolveOrg(userId, userEmail);
      if (!org) return res.status(status || 404).json({ error });

      const result = await pool.query(
        `SELECT sq.id, sq.dog_id, sq.recipient_phone, sq.message_body, sq.image_url,
                sq.pawfile_url, sq.status, sq.sent_at, sq.error, d.name as dog_name
         FROM sms_queue sq
         JOIN dogs d ON d.id = sq.dog_id
         WHERE sq.organization_id = $1
           AND sq.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY sq.created_at DESC`,
        [org.id]
      );

      res.json({ items: result.rows });
    } catch (error: any) {
      console.error("Error fetching queue status:", error.message);
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });

  // Update message status (companion app reports back: sent or failed)
  app.patch("/api/sms-queue/:id/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const queueId = parseInt(req.params.id);
      if (isNaN(queueId)) return res.status(400).json({ error: "Invalid queue ID" });

      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { status: newStatus, error: errorMsg } = req.body;

      if (!["sent", "failed"].includes(newStatus)) {
        return res.status(400).json({ error: "Status must be 'sent' or 'failed'" });
      }

      // Verify ownership
      const queueItem = await pool.query(
        `SELECT sq.organization_id, o.owner_id FROM sms_queue sq
         JOIN organizations o ON o.id = sq.organization_id
         WHERE sq.id = $1`,
        [queueId]
      );
      if (queueItem.rows.length === 0) {
        return res.status(404).json({ error: "Queue item not found" });
      }
      if (queueItem.rows[0].owner_id !== userId && userEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const orgId = queueItem.rows[0].organization_id;

      if (newStatus === "sent") {
        await pool.query(
          `UPDATE sms_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [queueId]
        );
      } else {
        await pool.query(
          `UPDATE sms_queue SET status = 'failed', error = $2 WHERE id = $1`,
          [queueId, errorMsg || "Unknown error"]
        );
      }

      // Notify dashboard via WebSocket
      const io = getIo();
      if (io) {
        io.to(`org:${orgId}`).emit("delivery:update", {
          queueId,
          status: newStatus,
          error: errorMsg,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating queue status:", error.message);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // ── Device endpoints (token auth — for iOS Shortcut / Android companion app) ──

  // Fetch pending messages and claim them atomically
  app.get("/api/sms-queue/fetch", isDeviceAuthenticated, async (req: any, res: Response) => {
    try {
      const org = req.deviceOrg;

      // Recover stale claims: anything claimed >10 min ago without a final status
      await pool.query(
        `UPDATE sms_queue SET status = 'pending', claimed_at = NULL
         WHERE organization_id = $1 AND status = 'claimed'
           AND claimed_at < NOW() - INTERVAL '10 minutes'`,
        [org.id]
      );

      // Claim all pending messages
      const result = await pool.query(
        `UPDATE sms_queue
         SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1 AND status = 'pending'
         RETURNING id, dog_id, recipient_phone, message_body, image_url, pawfile_url`,
        [org.id]
      );

      res.json({ messages: result.rows, count: result.rows.length });
    } catch (error: any) {
      console.error("Error fetching SMS queue (device):", error.message);
      res.status(500).json({ error: "Failed to fetch queue" });
    }
  });

  // Report send results for one or more messages
  app.post("/api/sms-queue/report", isDeviceAuthenticated, async (req: any, res: Response) => {
    try {
      const org = req.deviceOrg;
      const { results } = req.body;

      if (!results || !Array.isArray(results) || results.length === 0) {
        return res.status(400).json({ error: "results array is required" });
      }

      const io = getIo();

      for (const r of results) {
        if (!r.id || !["sent", "failed"].includes(r.status)) continue;

        if (r.status === "sent") {
          await pool.query(
            `UPDATE sms_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND organization_id = $2`,
            [r.id, org.id]
          );
        } else {
          await pool.query(
            `UPDATE sms_queue SET status = 'failed', error = $3
             WHERE id = $1 AND organization_id = $2`,
            [r.id, org.id, r.error || "Unknown error"]
          );
        }

        // Notify dashboard in real time
        if (io) {
          io.to(`org:${org.id}`).emit("delivery:update", {
            queueId: r.id,
            status: r.status,
            error: r.error,
          });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error reporting SMS results:", error.message);
      res.status(500).json({ error: "Failed to report results" });
    }
  });

  // Connect by phone number (companion app first-launch flow)
  const connectAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post("/api/sms-queue/connect-by-phone", async (req: any, res: Response) => {
    try {
      // Rate limit: 5 attempts per IP per hour
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const now = Date.now();
      const limit = connectAttempts.get(clientIp);
      if (limit && limit.resetAt > now && limit.count >= 5) {
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      }
      if (!limit || limit.resetAt <= now) {
        connectAttempts.set(clientIp, { count: 1, resetAt: now + 3600000 });
      } else {
        limit.count++;
      }

      const { phone } = req.body;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Normalize: strip everything except digits, ensure 10 or 11 digits with +1 prefix
      const digits = phone.replace(/\D/g, "");
      let normalized: string;
      if (digits.length === 10) {
        normalized = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        normalized = `+${digits}`;
      } else {
        return res.status(400).json({ error: "Please enter a valid 10-digit US phone number." });
      }

      // Also try common stored formats
      const formats = [
        normalized,                                    // +14045551234
        digits.length === 11 ? digits : `1${digits}`, // 14045551234
        digits.length === 10 ? digits : digits.slice(1), // 4045551234
      ];

      // Strip non-digits from stored phone too, so "516-749-8302" matches "5167498302"
      const digits10 = digits.length === 10 ? digits : digits.slice(1);
      const result = await pool.query(
        `SELECT send_token, name, id FROM organizations
         WHERE send_token IS NOT NULL
           AND regexp_replace(contact_phone, '[^0-9]', '', 'g') LIKE '%' || $1
         LIMIT 1`,
        [digits10]
      );

      if (result.rows.length === 0) {
        return res.json({ token: null, error: "We couldn't find a business with that number. Double-check and try again." });
      }

      const org = result.rows[0];
      res.json({ token: org.send_token, orgName: org.name });
    } catch (error: any) {
      console.error("Error in connect-by-phone:", error.message);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Cleanup: expire stale queue items older than 24 hours
  app.delete("/api/sms-queue/cleanup", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userEmail = req.user.claims.email || "";
      if (userEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin only" });
      }

      const result = await pool.query(
        `DELETE FROM sms_queue WHERE created_at < NOW() - INTERVAL '24 hours' RETURNING id`
      );

      res.json({ deleted: result.rows.length });
    } catch (error: any) {
      console.error("Error cleaning up SMS queue:", error.message);
      res.status(500).json({ error: "Cleanup failed" });
    }
  });
}
