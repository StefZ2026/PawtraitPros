import type { Express, Response } from "express";
import { storage } from "../storage";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { ADMIN_EMAIL } from "./helpers";

export function registerGdprRoutes(app: Express): void {
  // --- GDPR: Data Export (Right to Access) ---
  app.get("/api/my-data/export", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      // Gather all user data
      const user = await storage.getUser(userId);
      const org = await storage.getOrganizationByOwner(userId);
      let dogs: any[] = [];
      let portraits: any[] = [];

      if (org) {
        dogs = await storage.getDogsByOrganization(org.id);
        for (const dog of dogs) {
          const dogPortraits = await storage.getPortraitsByDog(dog.id);
          portraits.push(...dogPortraits.map(p => ({
            dogName: dog.name,
            style: p.styleId,
            createdAt: p.createdAt,
          })));
        }
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          createdAt: user?.createdAt,
        },
        organization: org ? {
          name: org.name,
          slug: org.slug,
          description: org.description,
          websiteUrl: org.websiteUrl,
          phone: org.phone,
          address: org.address,
          createdAt: org.createdAt,
        } : null,
        pets: dogs.map(d => ({
          name: d.name,
          breed: d.breed,
          species: d.species,
          age: d.age,
          gender: d.gender,
          description: d.description,
          ownerName: d.ownerName,
          ownerEmail: d.ownerEmail,
          ownerPhone: d.ownerPhone,
          createdAt: d.createdAt,
        })),
        portraits: portraits,
      };

      res.set('Content-Disposition', 'attachment; filename="my-data-export.json"');
      res.set('Content-Type', 'application/json');
      res.json(exportData);
    } catch (error: any) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // --- GDPR: Account Deletion (Right to Erasure) ---
  app.delete("/api/my-account", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      // Prevent admin from deleting their own account
      if (userEmail === ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin account cannot be self-deleted" });
      }

      const org = await storage.getOrganizationByOwner(userId);

      if (org) {
        // Delete all dogs (cascades to portraits)
        const dogs = await storage.getDogsByOrganization(org.id);
        for (const dog of dogs) {
          await storage.deleteDog(dog.id);
        }
        // Delete org
        await storage.deleteOrganization(org.id);
      }

      // Delete user record from our DB
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // Delete from Supabase Auth
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
        });
      }

      console.log(`[gdpr] Account deleted: ${userEmail} (${userId})`);
      res.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
    } catch (error: any) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
}
