import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { containsInappropriateLanguage } from "@shared/content-filter";
import { isValidBreed } from "../breeds";
import { ADMIN_EMAIL, checkDogLimit, generatePetCode, createDogWithPortrait, sanitizeForPrompt } from "./helpers";
import { getPacks } from "@shared/pack-config";
import { generateImage } from "../gemini";
import { uploadToStorage, isDataUri } from "../supabase-storage";

export function registerDogRoutes(app: Express): void {
  // --- PET CODE LOOKUP (public) ---
  // IMPORTANT: Register before /api/dogs/:id to avoid route parameter conflicts
  app.get("/api/dogs/code/:petCode", async (req: Request, res: Response) => {
    try {
      const { petCode } = req.params;
      const result = await pool.query(
        `SELECT d.*, o.name as organization_name, o.logo_url as organization_logo_url, o.slug as organization_slug
         FROM dogs d
         JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = result.rows[0];

      // Get portraits for this dog
      const portraits = await pool.query(
        `SELECT p.*, ps.name as style_name, ps.category as style_category
         FROM portraits p
         LEFT JOIN portrait_styles ps ON p.style_id = ps.id
         WHERE p.dog_id = $1
         ORDER BY p.is_selected DESC, p.created_at DESC`,
        [dog.id]
      );

      // Map snake_case DB columns to camelCase for frontend
      const mapPortrait = (p: any) => ({
        id: p.id,
        dogId: p.dog_id,
        styleId: p.style_id,
        generatedImageUrl: p.generated_image_url,
        previousImageUrl: p.previous_image_url,
        isSelected: p.is_selected,
        editCount: p.edit_count,
        createdAt: p.created_at,
        styleName: p.style_name,
        styleCategory: p.style_category,
      });

      const mappedPortraits = portraits.rows.map(mapPortrait);
      const selectedPortrait = mappedPortraits.find((p: any) => p.isSelected) || mappedPortraits[0] || null;

      res.json({
        id: dog.id,
        organizationId: dog.organization_id,
        name: dog.name,
        species: dog.species,
        breed: dog.breed,
        age: dog.age,
        description: dog.description,
        originalPhotoUrl: dog.original_photo_url,
        ownerEmail: dog.owner_email,
        ownerPhone: dog.owner_phone,
        petCode: dog.pet_code,
        isAvailable: dog.is_available,
        createdAt: dog.created_at,
        organizationName: dog.organization_name,
        organizationLogoUrl: dog.organization_logo_url,
        organizationSlug: dog.organization_slug,
        portrait: selectedPortrait,
        portraits: mappedPortraits,
      });
    } catch (error) {
      console.error("Error looking up pet code:", error);
      res.status(500).json({ error: "Failed to look up pet" });
    }
  });

  // Get available pack styles for a pet (public — for customer style switching)
  // Returns ONLY the styles from the same pack that was used for the current portrait
  app.get("/api/dogs/code/:petCode/styles", async (req: Request, res: Response) => {
    try {
      const { petCode } = req.params;
      const dogResult = await pool.query(
        `SELECT d.id, d.species, d.organization_id, o.industry_type
         FROM dogs d JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = dogResult.rows[0];
      const species = (dog.species || "dog") as "dog" | "cat";
      const packs = getPacks(species);

      // Determine which pack was used for the current portrait
      let targetPackType: string | null = null;

      // 1. Check the selected portrait's creation date against daily_pack_selections
      const portraitResult = await pool.query(
        `SELECT style_id, created_at FROM portraits
         WHERE dog_id = $1 AND is_selected = true
         ORDER BY created_at DESC LIMIT 1`,
        [dog.id]
      );

      if (portraitResult.rows.length > 0) {
        const portrait = portraitResult.rows[0];
        const portraitDate = new Date(portrait.created_at).toISOString().split("T")[0];

        // Check daily_pack_selections for this org on the portrait's date + species
        const packSelResult = await pool.query(
          `SELECT pack_type FROM daily_pack_selections
           WHERE organization_id = $1 AND date = $2 AND species = $3`,
          [dog.organization_id, portraitDate, species]
        );

        if (packSelResult.rows.length > 0) {
          targetPackType = packSelResult.rows[0].pack_type;
        } else {
          // Fallback: find which pack contains this styleId
          const matchingPack = packs.find(p => p.styleIds.includes(portrait.style_id));
          if (matchingPack) {
            targetPackType = matchingPack.type;
          }
        }
      }

      // Filter to just the matching pack (or all packs if we couldn't determine)
      const filteredPacks = targetPackType
        ? packs.filter(p => p.type === targetPackType)
        : packs;

      // Get existing portraits for this dog to mark which styles are already generated
      const existing = await pool.query(
        `SELECT style_id FROM portraits WHERE dog_id = $1`, [dog.id]
      );
      const generatedStyleIds = new Set(existing.rows.map((r: any) => r.style_id));

      // Get all style details for pack styles
      const allStyles = await storage.getAllPortraitStyles();
      const result = filteredPacks.map(pack => ({
        type: pack.type,
        name: pack.name,
        styles: pack.styleIds.map(sid => {
          const style = allStyles.find(s => s.id === sid);
          return style ? {
            id: style.id,
            name: style.name,
            category: style.category,
            generated: generatedStyleIds.has(style.id),
          } : null;
        }).filter(Boolean),
      }));

      res.json({ packs: result });
    } catch (error) {
      console.error("Error fetching pack styles:", error);
      res.status(500).json({ error: "Failed to fetch styles" });
    }
  });

  // Generate a portrait with a specific style (public — validated by pet code)
  app.post("/api/dogs/code/:petCode/generate", async (req: Request, res: Response) => {
    try {
      const { petCode } = req.params;
      const { styleId } = req.body;
      if (!styleId) {
        return res.status(400).json({ error: "styleId is required" });
      }

      const dogResult = await pool.query(
        `SELECT d.*, o.industry_type, o.id as org_id
         FROM dogs d JOIN organizations o ON d.organization_id = o.id
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );
      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }
      const dog = dogResult.rows[0];

      // Determine the correct pack for this pet and verify style is in it
      const species = (dog.species || "dog") as "dog" | "cat";
      const packs = getPacks(species);

      // Find the current portrait's pack (same logic as styles endpoint)
      let allowedStyleIds: number[] = [];
      const curPortrait = await pool.query(
        `SELECT style_id, created_at FROM portraits
         WHERE dog_id = $1 AND is_selected = true
         ORDER BY created_at DESC LIMIT 1`,
        [dog.id]
      );
      if (curPortrait.rows.length > 0) {
        const portrait = curPortrait.rows[0];
        const portraitDate = new Date(portrait.created_at).toISOString().split("T")[0];
        const packSelResult = await pool.query(
          `SELECT pack_type FROM daily_pack_selections
           WHERE organization_id = $1 AND date = $2 AND species = $3`,
          [dog.organization_id, portraitDate, species]
        );
        let targetPack;
        if (packSelResult.rows.length > 0) {
          targetPack = packs.find(p => p.type === packSelResult.rows[0].pack_type);
        } else {
          targetPack = packs.find(p => p.styleIds.includes(portrait.style_id));
        }
        if (targetPack) {
          allowedStyleIds = targetPack.styleIds;
        }
      }

      // Fallback: if we couldn't determine a pack, allow all pack styles
      if (allowedStyleIds.length === 0) {
        allowedStyleIds = packs.flatMap(p => p.styleIds);
      }

      if (!allowedStyleIds.includes(parseInt(styleId))) {
        return res.status(400).json({ error: "Style not available for this pet" });
      }

      // Check if portrait with this style already exists
      const existing = await pool.query(
        `SELECT id, generated_image_url FROM portraits WHERE dog_id = $1 AND style_id = $2`,
        [dog.id, parseInt(styleId)]
      );
      if (existing.rows.length > 0) {
        return res.json({
          portraitId: existing.rows[0].id,
          generatedImageUrl: existing.rows[0].generated_image_url,
          alreadyExists: true,
        });
      }

      // Check org has portrait credits remaining
      const org = await storage.getOrganization(dog.org_id);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      // Get style details
      const style = await storage.getPortraitStyle(parseInt(styleId));
      if (!style) return res.status(404).json({ error: "Style not found" });

      if (!dog.original_photo_url) {
        return res.status(400).json({ error: "No photo available for this pet" });
      }

      // Build prompt and generate
      const breed = dog.breed || dog.species || "dog";
      const prompt = sanitizeForPrompt(
        style.promptTemplate
          .replace(/\{breed\}/g, breed)
          .replace(/\{species\}/g, dog.species || "dog")
          .replace(/\{name\}/g, dog.name)
      );

      let generatedImageUrl = await generateImage(prompt, dog.original_photo_url);
      try {
        const fname = `portrait-${dog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        generatedImageUrl = await uploadToStorage(generatedImageUrl, "portraits", fname);
      } catch (err) {
        console.error("[storage-upload] Portrait upload failed, using base64 fallback:", err);
      }

      // Save portrait (mark previous as not selected)
      await pool.query(
        `UPDATE portraits SET is_selected = false WHERE dog_id = $1`, [dog.id]
      );
      const portrait = await storage.createPortrait({
        dogId: dog.id,
        styleId: parseInt(styleId),
        generatedImageUrl,
        isSelected: true,
      });
      await storage.incrementOrgPortraitsUsed(dog.org_id);

      res.json({
        portraitId: portrait.id,
        generatedImageUrl,
        alreadyExists: false,
      });
    } catch (error: any) {
      console.error("Error generating portrait via pet code:", error);
      res.status(500).json({ error: error.message || "Failed to generate portrait" });
    }
  });

  // Dogs - Public gallery (all dogs)
  app.get("/api/dogs", async (req: Request, res: Response) => {
    try {
      const allDogs = await storage.getAllDogs();

      const activeOrgs = await storage.getAllOrganizations();
      const activeOrgIds = new Set(activeOrgs.filter(o => o.isActive).map(o => o.id));

      const dogsWithPortraits = await Promise.all(
        allDogs
          .filter(dog => dog.organizationId && activeOrgIds.has(dog.organizationId))
          .map(async (dog) => {
            const portrait = await storage.getSelectedPortraitByDog(dog.id);
            if (portrait) {
              const style = await storage.getPortraitStyle(portrait.styleId);
              return {
                ...dog,
                portrait: { ...portrait, style },
              };
            }
            return dog;
          })
      );

      const isRealImage = (url: string | null | undefined) => {
        if (!url) return false;
        if (url.includes('placehold.co') || url.includes('placeholder') || url.includes('via.placeholder')) return false;
        return true;
      };

      const visibleDogs = dogsWithPortraits.filter((dog: any) =>
        dog.isAvailable && (isRealImage(dog.portrait?.generatedImageUrl) || isRealImage(dog.originalPhotoUrl))
      );

      res.json(visibleDogs);
    } catch (error) {
      console.error("Error fetching dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });

  // Get dogs for current user's organization
  app.get("/api/my-dogs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const org = await storage.getOrganizationByOwner(userId);

      if (!org) {
        return res.json([]);
      }

      const orgDogs = await storage.getDogsByOrganization(org.id);

      // Get portraits and styles for each dog
      const dogsWithPortraits = await Promise.all(
        orgDogs.map(async (dog) => {
          const portrait = await storage.getSelectedPortraitByDog(dog.id);
          if (portrait) {
            const style = await storage.getPortraitStyle(portrait.styleId);
            return {
              ...dog,
              portrait: { ...portrait, style },
            };
          }
          return dog;
        })
      );

      res.json(dogsWithPortraits);
    } catch (error) {
      console.error("Error fetching user dogs:", error);
      res.status(500).json({ error: "Failed to fetch dogs" });
    }
  });

  app.get("/api/dogs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid pet ID" });
      }
      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }

      // Only expose dogs that belong to an active org and are available
      const org = dog.organizationId ? await storage.getOrganization(dog.organizationId) : null;
      if (!org || !org.isActive || !dog.isAvailable) {
        return res.status(404).json({ error: "Pet not found" });
      }

      const allPortraits = await storage.getPortraitsByDog(dog.id);

      const portraitsWithStyles = await Promise.all(
        allPortraits.map(async (p) => {
          const style = await storage.getPortraitStyle(p.styleId);
          return { ...p, style: style || null };
        })
      );

      const portrait = portraitsWithStyles.find(p => p.isSelected) || (portraitsWithStyles.length > 0 ? portraitsWithStyles[0] : undefined);

      res.json({
        ...dog,
        organizationName: org?.name || null,
        organizationLogoUrl: org?.logoUrl || null,
        organizationWebsiteUrl: org?.websiteUrl || null,
        portrait: portrait || undefined,
        portraits: portraitsWithStyles,
      });
    } catch (error) {
      console.error("Error fetching dog:", error);
      res.status(500).json({ error: "Failed to fetch pet" });
    }
  });

  app.post("/api/dogs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      let orgId: number;

      let org;
      if (userIsAdmin && req.body.organizationId) {
        orgId = req.body.organizationId;
        org = await storage.getOrganization(orgId);
        if (!org) {
          return res.status(400).json({ error: "Organization not found" });
        }
      } else {
        org = await storage.getOrganizationByOwner(userId);
        if (!org) {
          return res.status(400).json({ error: "You need to create an organization first" });
        }
        orgId = org.id;
      }

      if (!org.planId || org.subscriptionStatus === "inactive") {
        return res.status(403).json({ error: "Please select a plan before adding pets" });
      }

      const limitError = await checkDogLimit(orgId);
      if (limitError) {
        return res.status(403).json({ error: limitError });
      }

      const { originalPhotoUrl, generatedPortraitUrl, styleId, organizationId: _orgId, ...dogData } = req.body;

      if (dogData.species && !["dog", "cat"].includes(dogData.species)) {
        return res.status(400).json({ error: "species must be 'dog' or 'cat'" });
      }

      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }

      if (!dogData.breed || !dogData.breed.trim()) {
        dogData.breed = "Mixed";
      }

      if (dogData.breed && !isValidBreed(dogData.breed, dogData.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }

      // Owner contact info is optional at creation — can be added later before delivery
      // (daycares/boarders may not have it at check-in time)

      // Auto-set checkedInAt to today on creation
      if (!dogData.checkedInAt) {
        dogData.checkedInAt = new Date().toISOString().split("T")[0];
      }

      const dog = await createDogWithPortrait(dogData, orgId, originalPhotoUrl, generatedPortraitUrl, styleId);
      res.status(201).json(dog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating pet:", errMsg, error);
      res.status(500).json({ error: `Failed to save pet: ${errMsg}` });
    }
  });

  app.patch("/api/dogs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to edit this dog" });
        }
      }

      const { selectedPortraitId, ...dogData } = req.body;

      if (dogData.name && containsInappropriateLanguage(dogData.name)) {
        return res.status(400).json({ error: "Please choose a family-friendly name" });
      }

      if (dogData.breed !== undefined && !isValidBreed(dogData.breed, dogData.species || dog.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
      }

      if (selectedPortraitId) {
        const portrait = await storage.getPortrait(selectedPortraitId);
        if (!portrait || portrait.dogId !== id) {
          return res.status(400).json({ error: "Invalid portrait selection" });
        }
      }

      const updatedDog = await storage.updateDog(id, dogData);

      if (selectedPortraitId) {
        await storage.selectPortraitForGallery(id, selectedPortraitId);
      }

      res.json(updatedDog);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating pet:", errMsg, error);
      res.status(500).json({ error: `Failed to update pet: ${errMsg}` });
    }
  });

  // Check in a pet for today (or a specific date)
  app.post("/api/dogs/:id/check-in", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(id);
      if (!dog) return res.status(404).json({ error: "Pet not found" });

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      const date = req.body.date || new Date().toISOString().split("T")[0];
      await storage.updateDog(id, { checkedInAt: date } as any);
      res.json({ success: true, checkedInAt: date });
    } catch (error) {
      console.error("Error checking in pet:", error);
      res.status(500).json({ error: "Failed to check in pet" });
    }
  });

  app.delete("/api/dogs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(id);
      if (!dog) {
        return res.status(404).json({ error: "Pet not found" });
      }

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to delete this dog" });
        }
      }

      await storage.deleteDog(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dog:", error);
      res.status(500).json({ error: "Failed to delete pet" });
    }
  });

  app.get("/api/dogs/:id/photo", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const dog = await storage.getDog(id);
      if (!dog || !dog.originalPhotoUrl) {
        return res.status(404).send("Photo not found");
      }

      const dataUri = dog.originalPhotoUrl;
      if (!dataUri.startsWith('data:')) {
        return res.redirect(dataUri);
      }

      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }

      const contentType = matches[1];
      const imageBuffer = Buffer.from(matches[2], 'base64');

      res.set({
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving pet photo:", error);
      res.status(500).send("Error loading photo");
    }
  });

  // --- VISIT PHOTOS ---

  // GET /api/dogs/:id/visit-photos — list visit photos for a pet
  app.get("/api/dogs/:id/visit-photos", isAuthenticated, async (req: any, res: Response) => {
    try {
      const dogId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(dogId);
      if (!dog) return res.status(404).json({ error: "Pet not found" });

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      const visitDate = req.query.date as string | undefined;
      const photos = await storage.getVisitPhotos(dogId, visitDate);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching visit photos:", error);
      res.status(500).json({ error: "Failed to fetch visit photos" });
    }
  });

  // POST /api/dogs/:id/visit-photos — upload a visit photo
  app.post("/api/dogs/:id/visit-photos", isAuthenticated, async (req: any, res: Response) => {
    try {
      const dogId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(dogId);
      if (!dog) return res.status(404).json({ error: "Pet not found" });

      let org;
      if (userIsAdmin) {
        org = await storage.getOrganization(dog.organizationId);
      } else {
        org = await storage.getOrganizationByOwner(userId);
        if (!org || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      if (!org) return res.status(404).json({ error: "Organization not found" });

      const { photo, caption } = req.body;
      if (!photo) return res.status(400).json({ error: "Photo data is required" });

      // Photo limit by industry type
      const industryType = (org as any).industryType || "groomer";
      const photoLimits: Record<string, number> = { groomer: 3, boarding: 5, daycare: 4 };
      const limit = photoLimits[industryType] || 3;

      const visitDate = new Date().toISOString().split("T")[0];
      const currentCount = await storage.countVisitPhotosForDate(dogId, visitDate);
      if (currentCount >= limit) {
        return res.status(400).json({
          error: `Photo limit reached (${limit} per ${industryType === "groomer" ? "visit" : "day"})`,
        });
      }

      // Always upload to Supabase Storage — no base64 in visit_photos
      let photoUrl: string;
      if (isDataUri(photo)) {
        const fname = `visit-${dogId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        photoUrl = await uploadToStorage(photo, "originals", fname);
      } else {
        photoUrl = photo;
      }

      const visitPhoto = await storage.createVisitPhoto({
        dogId,
        organizationId: org.id,
        photoUrl,
        visitDate,
        caption: caption || null,
        sortOrder: currentCount,
      });

      res.status(201).json(visitPhoto);
    } catch (error: any) {
      console.error("Error uploading visit photo:", error);
      res.status(500).json({ error: "Failed to upload visit photo" });
    }
  });

  // DELETE /api/dogs/:id/visit-photos/:photoId — remove a visit photo
  app.delete("/api/dogs/:id/visit-photos/:photoId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const dogId = parseInt(req.params.id);
      const photoId = parseInt(req.params.photoId);
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      // Verify the photo exists and belongs to this dog
      const photos = await storage.getVisitPhotos(dogId);
      const photo = photos.find(p => p.id === photoId);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      if (!userIsAdmin) {
        const org = await storage.getOrganizationByOwner(userId);
        if (!org || photo.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      await storage.deleteVisitPhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting visit photo:", error);
      res.status(500).json({ error: "Failed to delete visit photo" });
    }
  });
}
