// Customer session tokens — short-lived links for pet owners to view/share portraits
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { sendSms, formatPhoneNumber, isSmsConfigured } from "./sms";
import { resolveOrg, publicExpensiveRateLimiter } from "./helpers";

export function registerCustomerSessionRoutes(app: Express): void {

  app.post("/api/customer-session", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const { dogId, portraitId, packType, customerPhone, orgId: bodyOrgId } = req.body;

      if (!dogId || !portraitId) {
        return res.status(400).json({ error: "dogId and portraitId are required" });
      }

      // Resolve org: explicit orgId > dog's org > user's own org
      const { org, error, status } = await resolveOrg(userId, userEmail, { orgId: bodyOrgId, dogId });
      if (!org) return res.status(status || 404).json({ error });
      const orgId = org.id;

      const dog = await storage.getDog(parseInt(dogId));
      if (!dog || dog.organizationId !== orgId) {
        return res.status(400).json({ error: "Dog not found or doesn't belong to this organization" });
      }

      // Generate unique 8-char token
      let token = '';
      let attempts = 0;
      while (attempts < 10) {
        token = crypto.randomBytes(4).toString('hex'); // 8 hex chars
        const existing = await pool.query('SELECT id FROM customer_sessions WHERE token = $1', [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }

      // Set expiry to 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, pack_type, customer_phone, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [token, orgId, parseInt(dogId), parseInt(portraitId), packType || null, customerPhone || null, expiresAt.toISOString()]
      );

      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      console.log(`[customer-session] Created session ${token} for org ${orgId}, dog ${dogId}`);

      res.json({
        token,
        orderUrl,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Error creating customer session:", error);
      res.status(500).json({ error: "Failed to create customer session" });
    }
  });

  // Create customer session from pet code (public — rate-limited)
  app.post("/api/customer-session/from-code", publicExpensiveRateLimiter, async (req: Request, res: Response) => {
    try {
      const { petCode } = req.body;
      if (!petCode) {
        return res.status(400).json({ error: "petCode is required" });
      }

      // Look up the dog by pet code
      const dogResult = await pool.query(
        `SELECT d.*, p.id as portrait_id, p.generated_image_url
         FROM dogs d
         LEFT JOIN portraits p ON p.dog_id = d.id AND p.is_selected = true
         WHERE d.pet_code = $1`,
        [petCode.toUpperCase()]
      );

      if (dogResult.rows.length === 0) {
        return res.status(404).json({ error: "Pet not found" });
      }

      const dog = dogResult.rows[0];
      if (!dog.portrait_id) {
        return res.status(400).json({ error: "No portrait available for this pet" });
      }

      // Generate unique 8-char token
      let token = '';
      let attempts = 0;
      while (attempts < 10) {
        token = crypto.randomBytes(4).toString('hex');
        const existing = await pool.query('SELECT id FROM customer_sessions WHERE token = $1', [token]);
        if (existing.rows.length === 0) break;
        attempts++;
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        `INSERT INTO customer_sessions (token, organization_id, dog_id, portrait_id, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [token, dog.organization_id, dog.id, dog.portrait_id, expiresAt.toISOString()]
      );

      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      res.json({
        token,
        orderUrl: `${host}/order/${token}`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Error creating customer session from code:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get customer session by token (public — this is the customer-facing endpoint)
  app.get("/api/customer-session/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 8) {
        return res.status(400).json({ error: "Invalid session token" });
      }

      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, o.logo_url as org_logo,
                d.name as dog_name, d.breed as dog_breed, d.species as dog_species,
                p.generated_image_url as portrait_image, p.style_id as portrait_style_id
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         JOIN portraits p ON p.id = cs.portrait_id
         WHERE cs.token = $1`,
        [token]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];

      // Check expiry
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        return res.status(410).json({ error: "This order link has expired" });
      }

      // Get alternate portraits from same pack/dog for "change image" feature
      const alternatesResult = await pool.query(
        `SELECT id, generated_image_url, style_id FROM portraits
         WHERE dog_id = $1 AND generated_image_url IS NOT NULL AND id != $2
         ORDER BY created_at DESC LIMIT 5`,
        [session.dog_id, session.portrait_id]
      );

      res.json({
        token: session.token,
        orgId: session.organization_id,
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogId: session.dog_id,
        dogName: session.dog_name,
        dogBreed: session.dog_breed,
        dogSpecies: session.dog_species,
        portraitImage: session.portrait_image,
        portraitId: session.portrait_id,
        packType: session.pack_type,
        expiresAt: session.expires_at,
        alternatePortraits: alternatesResult.rows.map((p: any) => ({
          id: p.id,
          imageUrl: p.generated_image_url,
          styleId: p.style_id,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching customer session:", error);
      res.status(500).json({ error: "Failed to load order page" });
    }
  });

  // Generate a printable receipt with QR code for a customer session
  app.get("/api/customer-session/:token/receipt", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, o.logo_url as org_logo,
                d.name as dog_name
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         WHERE cs.token = $1`,
        [token]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];
      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      // Return receipt data (client renders the receipt/QR)
      res.json({
        orgName: session.org_name,
        orgLogo: session.org_logo,
        dogName: session.dog_name,
        orderUrl,
        token,
        expiresAt: session.expires_at,
      });
    } catch (error: any) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ error: "Failed to generate receipt" });
    }
  });

  // Send SMS with order link (uses shared SMS utility)
  app.post("/api/customer-session/:token/send-sms", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { token } = req.params;
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Verify session exists
      const sessionResult = await pool.query(
        `SELECT cs.*, o.name as org_name, d.name as dog_name
         FROM customer_sessions cs
         JOIN organizations o ON o.id = cs.organization_id
         JOIN dogs d ON d.id = cs.dog_id
         WHERE cs.token = $1`,
        [token]
      );
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      const session = sessionResult.rows[0];
      const host = process.env.NODE_ENV === 'production' ? 'https://pawtraitpros.com' : 'http://localhost:5000';
      const orderUrl = `${host}/order/${token}`;

      const message = `Hi from ${session.org_name}! ${session.dog_name}'s portrait is ready. View it & order prints here: ${orderUrl}`;

      if (!isSmsConfigured()) {
        return res.status(503).json({ error: "SMS service is not configured" });
      }

      const formattedPhone = formatPhoneNumber(phone);
      const result = await sendSms(formattedPhone, message);

      if (!result.success) {
        throw new Error(result.error || "Failed to send SMS");
      }

      // Store phone on session
      await pool.query(
        `UPDATE customer_sessions SET customer_phone = $1 WHERE token = $2`,
        [formattedPhone, token]
      );

      res.json({ success: true, message: "SMS sent" });
    } catch (error: any) {
      console.error("Error sending customer session SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

}
