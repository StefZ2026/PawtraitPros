/**
 * Merch Earnings & Payouts — Helper Functions
 *
 * Records revenue split when orders are paid:
 *   - Pawtrait Pros keeps 70% of margin
 *   - Business gets 30% of margin
 *   - Margin = retail - wholesale cost
 *   - Shipping is pass-through (excluded from margin)
 */

import { pool } from "./db";

const BUSINESS_SHARE_RATE = 0.30; // 30% of margin goes to business

/**
 * Record merch earnings for a paid order.
 * Called after an order is marked "paid" — calculates margin and splits.
 */
export async function recordMerchEarnings(orderId: number, orgId: number): Promise<void> {
  try {
    // Check if earnings already recorded for this order
    const existing = await pool.query(
      `SELECT id FROM merch_earnings WHERE merch_order_id = $1`,
      [orderId]
    );
    if (existing.rows.length > 0) {
      console.log(`[earnings] Already recorded for order ${orderId}, skipping`);
      return;
    }

    // Get all items for this order
    const itemsResult = await pool.query(
      `SELECT quantity, price_cents, wholesale_cost_cents FROM merch_order_items WHERE order_id = $1`,
      [orderId]
    );

    if (itemsResult.rows.length === 0) {
      console.warn(`[earnings] No items found for order ${orderId}`);
      return;
    }

    let totalRetailCents = 0;
    let totalWholesaleCents = 0;

    for (const item of itemsResult.rows) {
      const qty = item.quantity || 1;
      totalRetailCents += item.price_cents * qty;
      totalWholesaleCents += (item.wholesale_cost_cents || 0) * qty;
    }

    const marginCents = totalRetailCents - totalWholesaleCents;
    const businessShareCents = Math.round(marginCents * BUSINESS_SHARE_RATE);
    const platformShareCents = marginCents - businessShareCents;

    await pool.query(
      `INSERT INTO merch_earnings (organization_id, merch_order_id, retail_cents, wholesale_cents, margin_cents, business_share_cents, platform_share_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orgId, orderId, totalRetailCents, totalWholesaleCents, marginCents, businessShareCents, platformShareCents]
    );

    console.log(`[earnings] Recorded for order ${orderId}: retail=$${(totalRetailCents/100).toFixed(2)}, margin=$${(marginCents/100).toFixed(2)}, business=$${(businessShareCents/100).toFixed(2)}, platform=$${(platformShareCents/100).toFixed(2)}`);
  } catch (err: any) {
    console.error(`[earnings] Failed to record for order ${orderId}:`, err.message);
  }
}
