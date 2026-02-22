import type { Express, Request, Response } from "express";
import sharp from "sharp";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { generateImage, editImage } from "../gemini";
import { generateShowcaseMockup, generatePawfileMockup } from "../generate-mockups";
import { isTrialExpired } from "../subscription";
import { ADMIN_EMAIL, MAX_EDITS_PER_IMAGE, aiRateLimiter, sanitizeForPrompt, resolveOrgForUser, checkDogLimit } from "./helpers";

const MAX_STYLES_PER_PET = 5;

export function registerPortraitRoutes(app: Express): void {

  app.get("/api/portraits/:id/image", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const portrait = await storage.getPortrait(id);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).send("Image not found");
      }

      const dataUri = portrait.generatedImageUrl;
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
      console.error("Error serving portrait image:", error);
      res.status(500).send("Error loading image");
    }
  });

  // Digital download with business logo watermark in bottom-right corner
  app.get("/api/portraits/:id/download", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const portrait = await storage.getPortrait(id);
      if (!portrait || !portrait.generatedImageUrl) {
        return res.status(404).send("Image not found");
      }

      const dataUri = portrait.generatedImageUrl;
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send("Invalid image data");
      }
      const portraitBuffer = Buffer.from(matches[2], "base64");

      // Get the dog to find the org
      const dog = await storage.getDog(portrait.dogId);
      if (!dog) {
        // No dog found — serve without watermark
        res.set({ "Content-Type": matches[1], "Content-Disposition": "attachment; filename=portrait.png" });
        return res.send(portraitBuffer);
      }

      const org = await storage.getOrganization(dog.organizationId);
      if (!org || !org.logoUrl) {
        // No org or no logo — serve without watermark
        res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename=${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png` });
        return res.send(portraitBuffer);
      }

      // Parse the org logo
      const logoMatches = org.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!logoMatches) {
        res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename=${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png` });
        return res.send(portraitBuffer);
      }
      const logoBuffer = Buffer.from(logoMatches[2], "base64");

      // Get portrait dimensions
      const portraitMeta = await sharp(portraitBuffer).metadata();
      const pw = portraitMeta.width || 1024;
      const ph = portraitMeta.height || 1024;

      // Size the logo: 8% of the shorter dimension, minimum 48px
      const logoSize = Math.max(48, Math.round(Math.min(pw, ph) * 0.08));
      const margin = Math.round(logoSize * 0.4);

      // Resize logo to target size with slight transparency
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .ensureAlpha()
        .png()
        .toBuffer();

      // Add a subtle semi-transparent circle behind the logo for visibility
      const circleSize = logoSize + 8;
      const circleSvg = Buffer.from(
        `<svg width="${circleSize}" height="${circleSize}"><circle cx="${circleSize/2}" cy="${circleSize/2}" r="${circleSize/2}" fill="rgba(255,255,255,0.6)"/></svg>`
      );
      const logoBadge = await sharp(circleSvg)
        .composite([{ input: resizedLogo, gravity: "center" }])
        .png()
        .toBuffer();

      // Composite logo onto portrait (bottom-right corner)
      const result = await sharp(portraitBuffer)
        .composite([{
          input: logoBadge,
          top: ph - circleSize - margin,
          left: pw - circleSize - margin,
        }])
        .png()
        .toBuffer();

      const filename = `${dog.name.replace(/[^a-zA-Z0-9]/g, "-")}-portrait.png`;
      res.set({
        "Content-Type": "image/png",
        "Content-Length": result.length.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      });
      res.send(result);
    } catch (error) {
      console.error("Error serving watermarked portrait:", error);
      res.status(500).send("Error loading image");
    }
  });

  app.get("/api/business/:slug/og-image", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug as string;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) { res.status(404).send("Organization not found"); return; }
      const imageBuffer = await generateShowcaseMockup(org.id);
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating business OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });

  app.get("/api/pawfile/:id/og-image", async (req: Request, res: Response) => {
    try {
      const dogId = parseInt(req.params.id as string);
      if (isNaN(dogId)) { res.status(400).send("Invalid ID"); return; }
      const imageBuffer = await generatePawfileMockup(dogId);
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error generating pawfile OG image:", error);
      res.status(500).send("Error generating preview");
    }
  });

  // Portraits
  app.get("/api/dogs/:dogId/portraits", isAuthenticated, async (req: any, res: Response) => {
    try {
      const dogId = parseInt(req.params.dogId as string);
      if (isNaN(dogId)) {
        return res.status(400).json({ error: "Invalid pet ID" });
      }

      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userIsAdmin = userEmail === ADMIN_EMAIL;

      const dog = await storage.getDog(dogId);
      if (!dog || !dog.organizationId) {
        return res.status(404).json({ error: "Pet not found" });
      }

      // Verify the requesting user owns this dog's org (or is admin)
      if (!userIsAdmin) {
        const userOrg = await storage.getOrganizationByOwner(userId);
        if (!userOrg || userOrg.id !== dog.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const dogPortraits = await storage.getPortraitsByDog(dogId);
      res.json(dogPortraits);
    } catch (error) {
      console.error("Error fetching portraits:", error);
      res.status(500).json({ error: "Failed to fetch portraits" });
    }
  });

  app.post("/api/generate-portrait", isAuthenticated, aiRateLimiter, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { prompt, dogName, originalImage, dogId, styleId, organizationId } = req.body;

      if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Prompt is required" });
      if (prompt.length > 2000) {
        return res.status(400).json({ error: "Invalid prompt. Maximum 2000 characters." });
      }
      if (dogName && (typeof dogName !== "string" || dogName.length > 100)) {
        return res.status(400).json({ error: "Invalid dog name." });
      }
      if (originalImage && typeof originalImage === "string" && !originalImage.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image format." });
      }

      const sanitizedPrompt = sanitizeForPrompt(prompt);
      if (!sanitizedPrompt) return res.status(400).json({ error: "Prompt contains invalid characters." });

      let org;
      const userIsAdmin = userEmail === ADMIN_EMAIL;
      if (userIsAdmin && organizationId && !dogId) {
        const targetOrg = await storage.getOrganization(parseInt(organizationId));
        if (!targetOrg) return res.status(404).json({ error: "Organization not found" });
        org = targetOrg;
      } else {
        const resolved = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : undefined);
        if (resolved.error) return res.status(resolved.status || 400).json({ error: resolved.error });
        org = resolved.org;
      }

      if (org.subscriptionStatus === "canceled") {
        return res.status(403).json({ error: "Your subscription has been canceled. Please choose a new plan to generate portraits." });
      }

      if (isTrialExpired(org)) {
        return res.status(403).json({ error: "Your 30-day free trial has expired. Please upgrade to a paid plan to continue." });
      }

      if (!org.planId) {
        return res.status(403).json({ error: "No plan selected. Please choose a plan before generating portraits." });
      }

      if (!dogId) {
        const limitError = await checkDogLimit(org.id);
        if (limitError) {
          return res.status(403).json({ error: limitError });
        }
      }

      let existingPortrait = null;
      let isNewPortrait = false;

      if (dogId && styleId) {
        const parsedDogId = parseInt(dogId);
        const parsedStyleId = parseInt(styleId);
        existingPortrait = await storage.getPortraitByDogAndStyle(parsedDogId, parsedStyleId);

        if (existingPortrait) {
          if (existingPortrait.editCount >= MAX_EDITS_PER_IMAGE) {
            return res.status(403).json({
              error: `You've used all ${MAX_EDITS_PER_IMAGE} edits for this style. Try a different style!`,
              editCount: existingPortrait.editCount,
              maxEdits: MAX_EDITS_PER_IMAGE,
            });
          }
        } else {
          isNewPortrait = true;
          const existingPortraits = await storage.getPortraitsByDog(parsedDogId);
          const uniqueStyles = new Set(existingPortraits.map(p => p.styleId));
          if (uniqueStyles.size >= MAX_STYLES_PER_PET) {
            return res.status(403).json({
              error: `This pet already has ${MAX_STYLES_PER_PET} styles. Edit an existing style or remove one first.`,
              stylesUsed: uniqueStyles.size,
              maxStyles: MAX_STYLES_PER_PET,
            });
          }

          const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
          if (plan && plan.monthlyPortraitCredits) {
            const { creditsUsed } = await storage.getAccurateCreditsUsed(org.id);
            await storage.syncOrgCredits(org.id);
            if (creditsUsed >= plan.monthlyPortraitCredits) {
              if (org.subscriptionStatus === "trial" || !plan.overagePriceCents) {
                return res.status(403).json({
                  error: `You've used all ${plan.monthlyPortraitCredits} monthly portrait credits. ${org.subscriptionStatus === "trial" ? "Upgrade to a paid plan for more credits." : "Credits reset at the start of your next billing cycle."}`,
                  creditsUsed,
                  creditsLimit: plan.monthlyPortraitCredits,
                });
              }
            }
          }
        }
      }

      const generatedImage = await generateImage(sanitizedPrompt, originalImage || undefined);

      let portraitRecord = existingPortrait;
      if (dogId && styleId) {
        const parsedDogId = parseInt(dogId);
        const parsedStyleId = parseInt(styleId);
        if (existingPortrait) {
          await storage.updatePortrait(existingPortrait.id, {
            previousImageUrl: existingPortrait.generatedImageUrl || null,
            generatedImageUrl: generatedImage,
          });
          await storage.incrementPortraitEditCount(existingPortrait.id);
          await storage.selectPortraitForGallery(parsedDogId, existingPortrait.id);
          portraitRecord = { ...existingPortrait, editCount: existingPortrait.editCount + 1, generatedImageUrl: generatedImage, previousImageUrl: existingPortrait.generatedImageUrl || null };
        } else {
          portraitRecord = await storage.createPortrait({
            dogId: parsedDogId,
            styleId: parsedStyleId,
            generatedImageUrl: generatedImage,
          });
          await storage.selectPortraitForGallery(parsedDogId, portraitRecord.id);
          await storage.incrementOrgPortraitsUsed(org.id);
        }
      }

      res.json({
        generatedImage,
        dogName: dogName ? sanitizeForPrompt(dogName) : dogName,
        portraitId: portraitRecord?.id,
        editCount: portraitRecord ? portraitRecord.editCount : null,
        maxEdits: MAX_EDITS_PER_IMAGE,
        isNewPortrait,
        hasPreviousImage: !!(portraitRecord as any)?.previousImageUrl,
      });
    } catch (error) {
      console.error("[generate-portrait]", error);
      res.status(500).json({ error: "Failed to generate portrait. Please try again." });
    }
  });

  app.post("/api/edit-portrait", isAuthenticated, aiRateLimiter, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { currentImage, editPrompt, dogId, portraitId } = req.body;

      if (!currentImage) return res.status(400).json({ error: "Current image is required" });
      if (!editPrompt || typeof editPrompt !== "string") return res.status(400).json({ error: "Edit instructions are required" });
      if (editPrompt.length > 500) return res.status(400).json({ error: "Edit instructions too long (max 500 characters)." });

      const sanitizedEditPrompt = sanitizeForPrompt(editPrompt);
      if (!sanitizedEditPrompt) return res.status(400).json({ error: "Edit instructions contain invalid characters." });

      const { org, error, status } = await resolveOrgForUser(userId, userEmail, dogId ? parseInt(dogId) : undefined);
      if (error) return res.status(status || 400).json({ error });
      if (org.subscriptionStatus === "canceled") {
        return res.status(403).json({ error: "Your subscription has been canceled. Please choose a new plan." });
      }

      if (isTrialExpired(org)) {
        return res.status(403).json({ error: "Your 30-day free trial has expired. Please upgrade to a paid plan to continue." });
      }



      if (portraitId) {
        const portrait = await storage.getPortrait(parseInt(portraitId));
        if (!portrait) return res.status(404).json({ error: "Portrait not found" });

        // Verify portrait belongs to the user's org
        const dog = await storage.getDog(portrait.dogId);
        if (!dog || dog.organizationId !== org.id) {
          return res.status(403).json({ error: "Not authorized to edit this portrait" });
        }

        if (portrait.editCount >= MAX_EDITS_PER_IMAGE) {
          return res.status(403).json({
            error: `You've used all ${MAX_EDITS_PER_IMAGE} edits for this portrait. Try a different style!`,
            editCount: portrait.editCount,
            maxEdits: MAX_EDITS_PER_IMAGE,
          });
        }
      }

      const editedImage = await editImage(currentImage, sanitizedEditPrompt);

      let editCount: number | null = null;
      if (portraitId) {
        const existing = await storage.getPortrait(parseInt(portraitId));
        await storage.updatePortrait(parseInt(portraitId), {
          previousImageUrl: existing?.generatedImageUrl || null,
          generatedImageUrl: editedImage,
        });
        await storage.incrementPortraitEditCount(parseInt(portraitId));
        const updated = await storage.getPortrait(parseInt(portraitId));
        editCount = updated?.editCount ?? null;
      }

      res.json({ editedImage, editCount, maxEdits: MAX_EDITS_PER_IMAGE, hasPreviousImage: true });
    } catch (error) {
      console.error("[edit-portrait]", error);
      res.status(500).json({ error: "Failed to edit portrait. Please try again." });
    }
  });

  app.post("/api/revert-portrait", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const { portraitId } = req.body;

      if (!portraitId) return res.status(400).json({ error: "Portrait ID is required" });

      const portrait = await storage.getPortrait(parseInt(portraitId));
      if (!portrait) return res.status(404).json({ error: "Portrait not found" });
      if (!portrait.previousImageUrl) return res.status(400).json({ error: "No previous image to revert to" });

      const { org, error, status } = await resolveOrgForUser(userId, userEmail, portrait.dogId);
      if (error) return res.status(status || 400).json({ error });

      await storage.updatePortrait(portrait.id, {
        generatedImageUrl: portrait.previousImageUrl,
        previousImageUrl: null,
      });

      res.json({
        revertedImage: portrait.previousImageUrl,
        portraitId: portrait.id,
        editCount: portrait.editCount,
        hasPreviousImage: false,
      });
    } catch (error) {
      console.error("[revert-portrait]", error);
      res.status(500).json({ error: "Failed to revert portrait. Please try again." });
    }
  });

}
