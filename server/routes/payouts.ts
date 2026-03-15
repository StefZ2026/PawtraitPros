/**
 * Payout Routes — Business earnings & admin payout management
 *
 * Business endpoints:
 *   POST /api/connect/onboard — start Stripe Connect onboarding
 *   GET  /api/connect/status — check onboarding status
 *   GET  /api/my-earnings — earnings summary for logged-in business
 *
 * Admin endpoints:
 *   GET  /api/admin/payout-summary — all orgs with pending balances
 *   POST /api/admin/payout/:orgId — trigger payout to business
 *   GET  /api/admin/payouts — payout history
 */

import type { Express, Response } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../auth";
import { storage } from "../storage";
import { ADMIN_EMAIL } from "./helpers";
import { createConnectAccount, createOnboardingLink, checkAccountStatus, createTransfer } from "../stripe-connect";

export function registerPayoutRoutes(app: Express): void {

  // --- BUSINESS ENDPOINTS ---

  // Start Stripe Connect onboarding
  app.post("/api/connect/onboard", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      // If already has a Connect account, just create a new onboarding link
      let accountId = org.stripeConnectAccountId;
      if (!accountId) {
        accountId = await createConnectAccount(org.name, org.contactEmail || "");
        await pool.query(
          `UPDATE organizations SET stripe_connect_account_id = $1 WHERE id = $2`,
          [accountId, org.id]
        );
      }

      const baseUrl = process.env.NODE_ENV === "production"
        ? "https://pawtraitpros.com"
        : "http://localhost:5000";

      const onboardingUrl = await createOnboardingLink(
        accountId,
        `${baseUrl}/dashboard?connect=complete`,
        `${baseUrl}/dashboard?connect=refresh`,
      );

      res.json({ url: onboardingUrl, accountId });
    } catch (error: any) {
      console.error("[connect] Onboarding error:", error.message);
      res.status(500).json({ error: "Failed to start onboarding" });
    }
  });

  // Check Connect onboarding status
  app.get("/api/connect/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      if (!org.stripeConnectAccountId) {
        return res.json({ connected: false, payoutsEnabled: false });
      }

      const status = await checkAccountStatus(org.stripeConnectAccountId);

      // Update onboarding status in DB if changed
      if (status.payoutsEnabled && !org.stripeConnectOnboardingComplete) {
        await pool.query(
          `UPDATE organizations SET stripe_connect_onboarding_complete = true WHERE id = $1`,
          [org.id]
        );
      }

      res.json({
        connected: true,
        accountId: org.stripeConnectAccountId,
        ...status,
      });
    } catch (error: any) {
      console.error("[connect] Status check error:", error.message);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Business earnings summary
  app.get("/api/my-earnings", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) return res.status(404).json({ error: "No organization found" });

      // Total earnings
      const totalsResult = await pool.query(
        `SELECT
          COALESCE(SUM(business_share_cents), 0) as total_earned,
          COALESCE(SUM(CASE WHEN payout_id IS NOT NULL THEN business_share_cents ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN payout_id IS NULL THEN business_share_cents ELSE 0 END), 0) as pending_balance
         FROM merch_earnings WHERE organization_id = $1`,
        [org.id]
      );

      // Recent earnings entries
      const recentResult = await pool.query(
        `SELECT me.*, mo.customer_name, mo.created_at as order_date
         FROM merch_earnings me
         JOIN merch_orders mo ON me.merch_order_id = mo.id
         WHERE me.organization_id = $1
         ORDER BY me.created_at DESC LIMIT 20`,
        [org.id]
      );

      // Recent payouts
      const payoutsResult = await pool.query(
        `SELECT * FROM merch_payouts WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [org.id]
      );

      const totals = totalsResult.rows[0];
      res.json({
        totalEarnedCents: parseInt(totals.total_earned),
        totalPaidCents: parseInt(totals.total_paid),
        pendingBalanceCents: parseInt(totals.pending_balance),
        recentEarnings: recentResult.rows,
        recentPayouts: payoutsResult.rows,
        connectStatus: {
          connected: !!org.stripeConnectAccountId,
          onboardingComplete: org.stripeConnectOnboardingComplete || false,
        },
      });
    } catch (error: any) {
      console.error("[earnings] Error:", error.message);
      res.status(500).json({ error: "Failed to fetch earnings" });
    }
  });

  // --- ADMIN ENDPOINTS ---

  // Admin: payout summary — all orgs with pending balances
  app.get("/api/admin/payout-summary", isAuthenticated, async (req: any, res: Response) => {
    try {
      const email = req.user?.claims?.email;
      if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Forbidden" });

      const result = await pool.query(`
        SELECT
          o.id as org_id,
          o.name as org_name,
          o.stripe_connect_account_id,
          o.stripe_connect_onboarding_complete,
          COALESCE(SUM(me.business_share_cents), 0) as total_earned,
          COALESCE(SUM(CASE WHEN me.payout_id IS NOT NULL THEN me.business_share_cents ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN me.payout_id IS NULL THEN me.business_share_cents ELSE 0 END), 0) as pending_balance,
          COUNT(me.id) as total_orders
        FROM organizations o
        LEFT JOIN merch_earnings me ON o.id = me.organization_id
        GROUP BY o.id, o.name, o.stripe_connect_account_id, o.stripe_connect_onboarding_complete
        HAVING COALESCE(SUM(me.business_share_cents), 0) > 0
        ORDER BY pending_balance DESC
      `);

      res.json({
        organizations: result.rows.map(r => ({
          orgId: r.org_id,
          orgName: r.org_name,
          connectAccountId: r.stripe_connect_account_id,
          connectOnboarded: r.stripe_connect_onboarding_complete || false,
          totalEarnedCents: parseInt(r.total_earned),
          totalPaidCents: parseInt(r.total_paid),
          pendingBalanceCents: parseInt(r.pending_balance),
          totalOrders: parseInt(r.total_orders),
        })),
      });
    } catch (error: any) {
      console.error("[admin-payouts] Summary error:", error.message);
      res.status(500).json({ error: "Failed to fetch payout summary" });
    }
  });

  // Admin: trigger payout to a business
  app.post("/api/admin/payout/:orgId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const email = req.user?.claims?.email;
      if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Forbidden" });

      const orgId = parseInt(req.params.orgId);
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: "Organization not found" });

      if (!org.stripeConnectAccountId) {
        return res.status(400).json({ error: "Organization has not set up Stripe Connect" });
      }

      // Check Connect account status
      const connectStatus = await checkAccountStatus(org.stripeConnectAccountId);
      if (!connectStatus.payoutsEnabled) {
        return res.status(400).json({ error: "Connect account is not ready for payouts" });
      }

      // Get unpaid earnings
      const unpaidResult = await pool.query(
        `SELECT id, business_share_cents FROM merch_earnings WHERE organization_id = $1 AND payout_id IS NULL`,
        [orgId]
      );

      if (unpaidResult.rows.length === 0) {
        return res.status(400).json({ error: "No pending earnings to pay out" });
      }

      const totalCents = unpaidResult.rows.reduce((sum: number, r: any) => sum + r.business_share_cents, 0);
      const earningIds = unpaidResult.rows.map((r: any) => r.id);

      // Create payout record
      const payoutResult = await pool.query(
        `INSERT INTO merch_payouts (organization_id, amount_cents, period_start, period_end, status, initiated_by)
         VALUES ($1, $2, (SELECT MIN(created_at) FROM merch_earnings WHERE id = ANY($3)), CURRENT_TIMESTAMP, 'pending', $4)
         RETURNING id`,
        [orgId, totalCents, earningIds, email]
      );
      const payoutId = payoutResult.rows[0].id;

      // Create Stripe transfer
      try {
        const transferId = await createTransfer(
          org.stripeConnectAccountId,
          totalCents,
          { payoutId: String(payoutId), orgId: String(orgId), orgName: org.name },
        );

        // Mark payout as completed
        await pool.query(
          `UPDATE merch_payouts SET status = 'completed', stripe_transfer_id = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [transferId, payoutId]
        );

        // Link earnings to this payout
        await pool.query(
          `UPDATE merch_earnings SET payout_id = $1 WHERE id = ANY($2)`,
          [payoutId, earningIds]
        );

        console.log(`[admin-payout] Paid $${(totalCents/100).toFixed(2)} to ${org.name} (transfer ${transferId})`);
        res.json({
          payoutId,
          transferId,
          amountCents: totalCents,
          earningsCount: earningIds.length,
          orgName: org.name,
        });
      } catch (stripeErr: any) {
        // Mark payout as failed
        await pool.query(
          `UPDATE merch_payouts SET status = 'failed' WHERE id = $1`,
          [payoutId]
        );
        console.error(`[admin-payout] Transfer failed for ${org.name}:`, stripeErr.message);
        res.status(500).json({ error: `Stripe transfer failed: ${stripeErr.message}` });
      }
    } catch (error: any) {
      console.error("[admin-payout] Error:", error.message);
      res.status(500).json({ error: "Failed to process payout" });
    }
  });

  // Admin: payout history
  app.get("/api/admin/payouts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const email = req.user?.claims?.email;
      if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Forbidden" });

      const result = await pool.query(`
        SELECT mp.*, o.name as org_name
        FROM merch_payouts mp
        JOIN organizations o ON mp.organization_id = o.id
        ORDER BY mp.created_at DESC
        LIMIT 50
      `);

      res.json({ payouts: result.rows });
    } catch (error: any) {
      console.error("[admin-payouts] History error:", error.message);
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  });
}
