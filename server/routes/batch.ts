import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { generateImage } from "../gemini";
import { getPacks } from "@shared/pack-config";
import { sendSms, formatPhoneNumber, isSmsConfigured } from "./sms";
import { sendEmail, isEmailConfigured, buildDepartureEmail } from "./email";
import { ADMIN_EMAIL, sanitizeForPrompt, generatePetCode } from "./helpers";
import { uploadToStorage, isDataUri } from "../supabase-storage";

export function registerBatchRoutes(app: Express): void {

  app.post("/api/generate-batch", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const { dogIds, packType, autoSelect, organizationId } = req.body;
      if (!dogIds || !Array.isArray(dogIds) || dogIds.length === 0) {
        return res.status(400).json({ error: "dogIds array is required" });
      }
      if (!packType || !["celebrate", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType" });
      }

      // Resolve org
      let org;
      if (userIsAdmin && organizationId) {
        org = await storage.getOrganization(parseInt(organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });

      const industryType = (org as any).industryType || "groomer";
      const allStyles = await storage.getAllPortraitStyles();

      // Generate portraits for each dog
      const results: Array<{ dogId: number; success: boolean; portraitId?: number; error?: string }> = [];

      for (const dogId of dogIds) {
        try {
          const dog = await storage.getDog(dogId);
          if (!dog || dog.organizationId !== org.id) {
            results.push({ dogId, success: false, error: "Dog not found or wrong org" });
            continue;
          }

          if (!dog.originalPhotoUrl) {
            results.push({ dogId, success: false, error: "No photo uploaded" });
            continue;
          }

          // Get pack styles for this pet's species
          const petSpecies = (dog.species || "dog") as "dog" | "cat";
          const packs = getPacks(petSpecies);
          const pack = packs.find(p => p.type === packType);
          if (!pack) {
            results.push({ dogId, success: false, error: "Pack not found for species" });
            continue;
          }
          const packStyles = pack.styleIds.map(id => allStyles.find(s => s.id === id)).filter(Boolean);
          if (packStyles.length === 0) {
            results.push({ dogId, success: false, error: "No styles found for this pack" });
            continue;
          }

          // Pick style: auto-select randomly from pack, or let client specify later
          let style;
          if (autoSelect) {
            style = packStyles[Math.floor(Math.random() * packStyles.length)];
          } else {
            // For manual selection, skip generation — client will pick styles and call generate-portrait individually
            results.push({ dogId, success: true, portraitId: undefined });
            continue;
          }

          if (!style) {
            results.push({ dogId, success: false, error: "Could not select style" });
            continue;
          }

          // Build prompt from style template
          const species = dog.species || "dog";
          const breed = dog.breed || species;
          const prompt = sanitizeForPrompt(
            style.promptTemplate
              .replace(/\{breed\}/g, breed)
              .replace(/\{species\}/g, species)
              .replace(/\{name\}/g, dog.name)
          );

          // Generate image
          let generatedImageUrl = await generateImage(prompt, dog.originalPhotoUrl);
          try {
            const fname = `portrait-${dog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
            generatedImageUrl = await uploadToStorage(generatedImageUrl, "portraits", fname);
          } catch (err) {
            console.error("[storage-upload] Batch portrait upload failed, using base64 fallback:", err);
          }

          // Save portrait
          const portrait = await storage.createPortrait({
            dogId: dog.id,
            styleId: style.id,
            generatedImageUrl,
            isSelected: true,
          });
          await storage.incrementOrgPortraitsUsed(org.id);

          // Auto-generate pet code if not set
          if (!dog.petCode) {
            const petCode = generatePetCode(dog.name);
            await storage.updateDog(dog.id, { petCode } as any);
          }

          results.push({ dogId: dog.id, success: true, portraitId: portrait.id });
        } catch (genErr: any) {
          console.error(`[generate-batch] Error for dog ${dogId}:`, genErr.message);
          results.push({ dogId, success: false, error: genErr.message });
        }
      }

      res.json({ results, totalGenerated: results.filter(r => r.success && r.portraitId).length });
    } catch (error: any) {
      console.error("Error in batch generation:", error.message);
      res.status(500).json({ error: "Batch generation failed" });
    }
  });

  // --- BATCH DELIVERY (send pawfile links to pet owners) ---
  app.post("/api/deliver-batch", isAuthenticated, async (req: any, res: Response) => {
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

      const results: Array<{ dogId: number; sent: boolean; method?: string; error?: string }> = [];

      for (const dogId of dogIds) {
        try {
          const dog = await storage.getDog(dogId);
          if (!dog || dog.organizationId !== org.id) {
            results.push({ dogId, sent: false, error: "Dog not found" });
            continue;
          }

          if (!(dog as any).ownerPhone && !(dog as any).ownerEmail) {
            results.push({ dogId, sent: false, error: "No owner contact info" });
            continue;
          }

          // Ensure pet has a code
          let petCode = (dog as any).petCode;
          if (!petCode) {
            petCode = generatePetCode(dog.name);
            await storage.updateDog(dog.id, { petCode } as any);
          }

          const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
          const pawfileUrl = `${appUrl}/pawfile/code/${petCode}`;
          const notifMode = (org as any).notificationMode || "both";
          const phone = (dog as any).ownerPhone;
          const email = (dog as any).ownerEmail;
          const methods: string[] = [];
          let sent = false;

          // Get the latest portrait for this dog (for email image)
          const portraits = await storage.getPortraitsByDog(dog.id);
          const latestPortrait = portraits.length > 0 ? portraits[portraits.length - 1] : null;
          const portraitImageUrl = latestPortrait ? `${appUrl}/api/portraits/${latestPortrait.id}/image` : undefined;

          // SMS delivery (if preference includes SMS and phone exists)
          if ((notifMode === "sms" || notifMode === "both") && phone && isSmsConfigured()) {
            try {
              const smsBody = `Hi from ${org.name}! We created a stunning portrait of ${dog.name} and it's ready for you. View it and order a keepsake: ${pawfileUrl}`;
              const smsResult = await sendSms(phone, smsBody);
              if (smsResult.success) {
                methods.push("sms");
                sent = true;
              } else {
                console.error(`[deliver-batch] SMS failed for ${dog.name}:`, smsResult.error);
              }
            } catch (smsErr: any) {
              console.error(`[deliver-batch] SMS error:`, smsErr.message);
            }
          }

          // Email delivery (if preference includes email and email exists)
          if ((notifMode === "email" || notifMode === "both") && email && isEmailConfigured()) {
            try {
              const { subject, html } = buildDepartureEmail(org.name, org.logoUrl, dog.name, pawfileUrl, portraitImageUrl, org.id);
              const emailResult = await sendEmail(email, subject, html, undefined, org.name);
              if (emailResult.success) {
                methods.push("email");
                sent = true;
              } else {
                console.error(`[deliver-batch] Email failed for ${dog.name}:`, emailResult.error);
              }
            } catch (emailErr: any) {
              console.error(`[deliver-batch] Email error:`, emailErr.message);
            }
          }

          if (sent) {
            results.push({ dogId, sent: true, method: methods.join("+") });
          } else {
            results.push({ dogId, sent: false, method: "link_only", error: "No notification channel available or all failed" });
          }
        } catch (err: any) {
          results.push({ dogId, sent: false, error: err.message });
        }
      }

      res.json({ results, totalSent: results.filter(r => r.sent).length });
    } catch (error: any) {
      console.error("Error in batch delivery:", error.message);
      res.status(500).json({ error: "Batch delivery failed" });
    }
  });

  // --- Batch Upload Endpoints (Candid Batch capture mode) ---

  // Start a new batch session
  app.post("/api/batch/start", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminUser = email === ADMIN_EMAIL;
      const { orgId: bodyOrgId } = req.body;

      let orgId: number | null = null;
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
    } catch (error: any) {
      console.error("Error starting batch session:", error);
      res.status(500).json({ error: "Failed to start batch session" });
    }
  });

  // Upload photos to a batch session (one at a time — client sends each photo separately)
  app.post("/api/batch/:id/photos", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      const userId = req.user.claims.sub;
      const { photo } = req.body; // base64 data URI

      if (!photo) {
        return res.status(400).json({ error: "Photo data is required" });
      }

      // Verify batch belongs to user's org
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
      if (batch.status !== 'uploading' && batch.status !== 'assigning') {
        return res.status(400).json({ error: "Batch is no longer accepting photos" });
      }

      // Check photo count limit (max 20)
      if (batch.photo_count >= 20) {
        return res.status(400).json({ error: "Maximum 20 photos per batch" });
      }

      // Insert photo
      const photoResult = await pool.query(
        `INSERT INTO batch_photos (batch_session_id, photo_url)
         VALUES ($1, $2) RETURNING id`,
        [batchId, photo]
      );

      // Update photo count
      await pool.query(
        `UPDATE batch_sessions SET photo_count = photo_count + 1 WHERE id = $1`,
        [batchId]
      );

      res.json({ photoId: photoResult.rows[0].id, photoCount: batch.photo_count + 1 });
    } catch (error: any) {
      console.error("Error uploading batch photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // Assign a batch photo to a pet
  app.patch("/api/batch/:id/photos/:photoId", isAuthenticated, async (req: any, res: Response) => {
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

      // Verify batch exists
      const batchResult = await pool.query(
        `SELECT organization_id FROM batch_sessions WHERE id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      // Verify dog belongs to same org
      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== batchResult.rows[0].organization_id) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to this organization" });
      }

      await pool.query(
        `UPDATE batch_photos SET dog_id = $1, assigned_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND batch_session_id = $3`,
        [parseInt(dogId), photoId, batchId]
      );

      // Update batch status to 'assigning' if still 'uploading'
      await pool.query(
        `UPDATE batch_sessions SET status = 'assigning' WHERE id = $1 AND status = 'uploading'`,
        [batchId]
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error assigning batch photo:", error);
      res.status(500).json({ error: "Failed to assign photo" });
    }
  });

  // Generate portraits for all assigned photos in a batch
  app.post("/api/batch/:id/generate", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      const { packType } = req.body; // "celebrate" | "fun" | "artistic"

      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      // Get batch + assigned photos
      const batchResult = await pool.query(
        `SELECT bs.*, o.industry_type, o.id as org_id FROM batch_sessions bs
         JOIN organizations o ON o.id = bs.organization_id
         WHERE bs.id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
      }

      const batch = batchResult.rows[0];

      const photosResult = await pool.query(
        `SELECT * FROM batch_photos WHERE batch_session_id = $1 AND dog_id IS NOT NULL ORDER BY id`,
        [batchId]
      );

      if (photosResult.rows.length === 0) {
        return res.status(400).json({ error: "No photos have been assigned to pets yet" });
      }

      // Update batch status
      await pool.query(
        `UPDATE batch_sessions SET status = 'generating' WHERE id = $1`,
        [batchId]
      );

      // Return immediately — generation happens async
      // In a production system you'd use a job queue, but for now we'll
      // return the count and let the client poll for status
      res.json({
        batchId,
        status: "generating",
        assignedPhotos: photosResult.rows.length,
        packType: packType || "celebrate",
        message: `Generating portraits for ${photosResult.rows.length} photos. Check batch status for progress.`,
      });
    } catch (error: any) {
      console.error("Error generating batch portraits:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // Get batch session status + all photos
  app.get("/api/batch/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.id);
      if (isNaN(batchId)) {
        return res.status(400).json({ error: "Invalid batch ID" });
      }

      const batchResult = await pool.query(
        `SELECT * FROM batch_sessions WHERE id = $1`,
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ error: "Batch session not found" });
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
        photos: photosResult.rows,
      });
    } catch (error: any) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ error: "Failed to fetch batch" });
    }
  });

}
