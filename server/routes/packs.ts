import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { getPacks } from "@shared/pack-config";

export function registerPackRoutes(app: Express): void {
  app.get("/api/portrait-styles", async (req: Request, res: Response) => {
    try {
      const styles = await storage.getAllPortraitStyles();
      res.json(styles);
    } catch (error) {
      console.error("Error fetching portrait styles:", error);
      res.status(500).json({ error: "Failed to fetch portrait styles" });
    }
  });

  // --- PACKS ---
  // Returns the 3 packs for a given species, with resolved style details
  app.get("/api/packs", async (req: Request, res: Response) => {
    try {
      const species = (req.query.species as string) || "dog";

      if (!["dog", "cat"].includes(species)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }

      const packs = getPacks(species as "dog" | "cat");

      // Resolve style IDs to full style objects from DB
      const allStyles = await storage.getAllPortraitStyles();
      const styleMap = new Map(allStyles.map(s => [s.id, s]));

      const resolved = packs.map(pack => ({
        ...pack,
        styles: pack.styleIds
          .map(id => styleMap.get(id))
          .filter(Boolean),
      }));

      res.json(resolved);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ error: "Failed to fetch packs" });
    }
  });

  // --- DAILY PACK SELECTION ---

  // Get today's pack selection for the org (per species)
  // Supports ?orgId= for admin/edit context, falls back to owner lookup
  app.get("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const userEmail = req.user!.claims.email as string;
      const isAdmin = userEmail === process.env.ADMIN_EMAIL;
      const orgIdParam = req.query.orgId as string | undefined;

      let orgId: number | null = null;

      if (orgIdParam) {
        orgId = parseInt(orgIdParam);
      } else {
        const org = await storage.getOrganizationByOwner(userId);
        if (org) orgId = org.id;
      }

      if (!orgId) return res.json(null);

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const species = (req.query.species as string) || "dog";

      const result = await pool.query(
        "SELECT * FROM daily_pack_selections WHERE organization_id = $1 AND date = $2 AND species = $3",
        [orgId, date, species]
      );
      if (result.rows.length === 0) {
        return res.json(null);
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching daily pack:", error);
      res.status(500).json({ error: "Failed to fetch daily pack" });
    }
  });

  // Set today's pack selection (per species)
  app.post("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      const { packType, date, species } = req.body;
      if (!packType || !["celebrate", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType. Must be celebrate, fun, or artistic." });
      }
      const targetSpecies = species || "dog";
      if (!["dog", "cat"].includes(targetSpecies)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }
      const targetDate = date || new Date().toISOString().split("T")[0];

      const result = await pool.query(
        `INSERT INTO daily_pack_selections (organization_id, date, species, pack_type, selected_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (organization_id, date, species) DO UPDATE SET pack_type = EXCLUDED.pack_type, selected_by = EXCLUDED.selected_by
         RETURNING *`,
        [org.id, targetDate, targetSpecies, packType, userId]
      );
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Error setting daily pack:", error);
      res.status(500).json({ error: "Failed to set daily pack", detail: error?.message || String(error) });
    }
  });
}
