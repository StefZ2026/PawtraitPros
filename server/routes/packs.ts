import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { getCurrentPacks, type IndustryType } from "@shared/pack-config";
import { ADMIN_EMAIL } from "./helpers";

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
  // Returns the 3 packs for a given industry type + species, with resolved style details
  app.get("/api/packs", async (req: Request, res: Response) => {
    try {
      const industryType = (req.query.industryType as string) || "groomer";
      const species = (req.query.species as string) || "dog";

      if (!["groomer", "boarding", "daycare"].includes(industryType)) {
        return res.status(400).json({ error: "Invalid industryType. Must be groomer, boarding, or daycare." });
      }
      if (!["dog", "cat"].includes(species)) {
        return res.status(400).json({ error: "Invalid species. Must be dog or cat." });
      }

      const packs = getCurrentPacks(industryType as IndustryType, species as "dog" | "cat");

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

  // Get today's pack selection for the org
  app.get("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const result = await pool.query(
        "SELECT * FROM daily_pack_selections WHERE organization_id = $1 AND date = $2",
        [org.id, date]
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

  // Set today's pack selection
  app.post("/api/daily-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.claims.sub as string;
      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      const { packType, date } = req.body;
      if (!packType || !["seasonal", "fun", "artistic"].includes(packType)) {
        return res.status(400).json({ error: "Invalid packType" });
      }
      const targetDate = date || new Date().toISOString().split("T")[0];

      const result = await pool.query(
        `INSERT INTO daily_pack_selections (organization_id, date, pack_type, selected_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, date) DO UPDATE SET pack_type = EXCLUDED.pack_type, selected_by = EXCLUDED.selected_by
         RETURNING *`,
        [org.id, targetDate, packType, userId]
      );
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("Error setting daily pack:", error);
      res.status(500).json({ error: "Failed to set daily pack", detail: error?.message || String(error) });
    }
  });
}
