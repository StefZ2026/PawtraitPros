import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { containsInappropriateLanguage } from "@shared/content-filter";
import { isValidBreed } from "../breeds";
import { ADMIN_EMAIL, checkDogLimit, generatePetCode, createDogWithPortrait } from "./helpers";

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

      const selectedPortrait = portraits.rows.find((p: any) => p.is_selected) || portraits.rows[0] || null;
      res.json({
        ...dog,
        portrait: selectedPortrait,
        portraits: portraits.rows,
      });
    } catch (error) {
      console.error("Error looking up pet code:", error);
      res.status(500).json({ error: "Failed to look up pet" });
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
        return res.status(400).json({ error: "Breed is required" });
      }

      if (!isValidBreed(dogData.breed, dogData.species)) {
        return res.status(400).json({ error: "Please select a valid breed from the list" });
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
}
