import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { getPacks } from "@shared/pack-config";
import { deliverPortraitToOwner } from "./delivery";
import { ADMIN_EMAIL, sanitizeForPrompt } from "./helpers";
import { enqueue } from "../job-queue";

export function registerBatchRoutes(app: Express): void {

  // POST /api/generate-batch — ASYNC: enqueues one job per dog, returns jobIds immediately
  app.post("/api/generate-batch", isAuthenticated, async (req: any, res: Response) => {
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

      // Resolve org
      let org;
      if (userIsAdmin && organizationId) {
        org = await storage.getOrganization(parseInt(organizationId));
      } else {
        org = await storage.getOrganizationByOwner(userId);
      }
      if (!org) return res.status(404).json({ error: "No organization found" });

      const allStyles = await storage.getAllPortraitStyles();

      // Validate each dog and enqueue jobs for valid ones
      const jobIds: Array<{ dogId: number; jobId: string }> = [];
      const errors: Array<{ dogId: number; error: string }> = [];

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

        // Get pack styles for this pet's species
        const petSpecies = (dog.species || "dog") as "dog" | "cat";
        const packs = getPacks(petSpecies);
        const pack = packs.find(p => p.type === packType);
        if (!pack) {
          errors.push({ dogId, error: "Pack not found for species" });
          continue;
        }
        const packStyles = pack.styleIds.map(id => allStyles.find(s => s.id === id)).filter(Boolean);
        if (packStyles.length === 0) {
          errors.push({ dogId, error: "No styles found for this pack" });
          continue;
        }

        // Pick style: use provided styleId, or auto-select with deduplication
        let style;
        if (styleId) {
          // Staff picked a specific style — use it for all pets
          style = packStyles.find((s: any) => s.id === parseInt(styleId));
          if (!style) {
            errors.push({ dogId, error: "Selected style not in this pack" });
            continue;
          }
        } else {
          // Auto-select: prefer styles this dog hasn't used before
          const usedStyleIds = await storage.getUsedStyleIdsForDog(dogId);
          const availableStyles = packStyles.filter((s: any) => !usedStyleIds.includes(s!.id));
          if (availableStyles.length > 0) {
            style = availableStyles[Math.floor(Math.random() * availableStyles.length)];
          } else {
            // All pack styles used — allow repeat (full cycle complete)
            style = packStyles[Math.floor(Math.random() * packStyles.length)];
          }
        }

        if (!style) {
          errors.push({ dogId, error: "Could not select style" });
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

        // Enqueue batch job — returns instantly
        const jobId = enqueue("batch", {
          dogId: dog.id,
          dogName: dog.name,
          prompt,
          originalPhotoUrl: dog.originalPhotoUrl,
          styleId: style.id,
          orgId: org.id,
          needsPetCode: !dog.petCode,
        });

        jobIds.push({ dogId: dog.id, jobId });
      }

      res.status(202).json({
        jobIds,
        errors,
        status: "generating",
        totalQueued: jobIds.filter(j => j.jobId).length,
      });
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

          const result = await deliverPortraitToOwner(dog, org);
          results.push({ dogId, ...result });
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

      // Return immediately with status — client polls for completion
      res.status(202).json({
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
