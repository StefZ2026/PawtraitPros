/**
 * Portrait Auto-Rotation Scheduler
 *
 * Runs every 30 minutes. Finds dogs whose nextPortraitDate <= today,
 * generates a portrait using that day's pack, delivers to the owner,
 * and advances the next portrait date.
 *
 * Used by: daycare (weekly/biweekly rotation) and boarding (stay-based schedule).
 * Groomers use manual batch generation — not handled here.
 */

import { storage } from './storage';
import { generateImage } from './gemini';
import { uploadToStorage } from './supabase-storage';
import { getPackByType } from '@shared/pack-config';
import { pool } from './db';
import { sanitizeForPrompt } from './routes/helpers';
import { deliverPortraitToOwner } from './routes/delivery';

let isRunning = false;

async function processPortraitRotation() {
  if (isRunning) {
    console.log('[scheduler] Previous run still in progress, skipping');
    return;
  }
  isRunning = true;

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dogsDue = await storage.getDogsDueForPortrait(today);

    if (dogsDue.length === 0) return;

    console.log(`[scheduler] ${dogsDue.length} dog(s) due for portraits on ${today}`);

    // Group by organization
    const byOrg = new Map<number, typeof dogsDue>();
    for (const dog of dogsDue) {
      const list = byOrg.get(dog.organizationId) || [];
      list.push(dog);
      byOrg.set(dog.organizationId, list);
    }

    for (const [orgId, orgDogs] of byOrg) {
      const org = await storage.getOrganization(orgId);
      if (!org || !org.isActive) continue;

      const allStyles = await storage.getAllPortraitStyles();

      for (const dog of orgDogs) {
        try {
          const species = (dog.species || 'dog') as 'dog' | 'cat';

          // Get today's pack selection for this org + species
          const packResult = await pool.query(
            `SELECT pack_type FROM daily_pack_selections WHERE organization_id = $1 AND date = $2 AND species = $3 LIMIT 1`,
            [orgId, today, species]
          );

          if (packResult.rows.length === 0) {
            // No pack selected for today — advance date so dog doesn't get stuck
            const nextDate = calculateNextPortraitDate(dog, today);
            await storage.advanceNextPortraitDate(dog.id, nextDate);
            console.log(`[scheduler] ${dog.name}: no daily pack selected for org ${orgId}, bumped to ${nextDate}`);
            continue;
          }

          const packType = packResult.rows[0].pack_type;
          const pack = getPackByType(species, packType);
          if (!pack) continue;

          // Get styles this dog has already used (prefer unused, allow repeats if exhausted)
          const usedStyleIds = await storage.getUsedStyleIdsForDog(dog.id);
          const availableStyleIds = pack.styleIds.filter(id => !usedStyleIds.includes(id));

          // If all styles used, allow repeats (full cycle complete — same as batch.ts)
          const stylePool = availableStyleIds.length > 0 ? availableStyleIds : pack.styleIds;

          if (stylePool.length === 0) {
            const nextDate = calculateNextPortraitDate(dog, today);
            await storage.advanceNextPortraitDate(dog.id, nextDate);
            console.log(`[scheduler] ${dog.name}: no styles available, bumped to ${nextDate}`);
            continue;
          }

          // Check org credits before generating
          const plan = org.planId ? await storage.getSubscriptionPlan(org.planId) : null;
          if (plan?.monthlyPortraitCredits) {
            const { creditsUsed } = await storage.getAccurateCreditsUsed(orgId);
            if (creditsUsed >= plan.monthlyPortraitCredits) {
              console.log(`[scheduler] Org ${orgId} out of credits, skipping ${dog.name}`);
              continue;
            }
          }

          // Pick random style from available pool
          const styleId = stylePool[Math.floor(Math.random() * stylePool.length)];
          const style = allStyles.find(s => s.id === styleId);
          if (!style) continue;

          // Build prompt from style template
          const breed = dog.breed || dog.species || 'dog';
          const prompt = sanitizeForPrompt(
            style.promptTemplate
              .replace(/\{breed\}/g, breed)
              .replace(/\{species\}/g, species)
              .replace(/\{name\}/g, dog.name)
          );

          // Generate portrait
          const generatedImageRaw = await generateImage(prompt, dog.originalPhotoUrl || undefined);

          let generatedImageUrl = generatedImageRaw;
          try {
            const fname = `portrait-${dog.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
            generatedImageUrl = await uploadToStorage(generatedImageRaw, 'portraits', fname);
          } catch (err) {
            console.error('[scheduler] Upload failed, using base64:', err);
          }

          // Create portrait record
          await storage.createPortrait({
            dogId: dog.id,
            styleId: style.id,
            generatedImageUrl,
            isSelected: true,
          });
          await storage.incrementOrgPortraitsUsed(orgId);

          // Advance next portrait date
          const nextDate = calculateNextPortraitDate(dog, today);
          await storage.advanceNextPortraitDate(dog.id, nextDate);

          // Deliver to owner (delivery.ts handles petCode generation if needed)
          try {
            await deliverPortraitToOwner(dog, org);
          } catch (err: any) {
            console.error(`[scheduler] Delivery failed for ${dog.name}:`, err.message);
          }

          console.log(`[scheduler] Generated + delivered portrait for ${dog.name} (style ${style.name}, org ${orgId}, next: ${nextDate || 'done'})`);
        } catch (err: any) {
          console.error(`[scheduler] Error processing ${dog.name} (${dog.id}):`, err.message);
        }
      }
    }
  } finally {
    isRunning = false;
  }
}

/**
 * Calculate the next portrait date for a dog based on its vertical settings.
 * Returns null when all scheduled portraits are done (e.g. boarding stay complete).
 */
function calculateNextPortraitDate(dog: any, currentDate: string): string | null {
  // Boarding: calculate from stay schedule
  if (dog.stayNights) {
    // Use checkedInAt first, then createdAt, then fall back to estimating from current date
    let checkInDate: string;
    if (dog.checkedInAt) {
      checkInDate = typeof dog.checkedInAt === 'string'
        ? dog.checkedInAt.slice(0, 10)
        : dog.checkedInAt.toISOString().slice(0, 10);
    } else if (dog.createdAt) {
      checkInDate = typeof dog.createdAt === 'string'
        ? dog.createdAt.slice(0, 10)
        : dog.createdAt.toISOString().slice(0, 10);
    } else {
      // Last resort: can't determine check-in, treat as daycare fallback
      console.warn(`[scheduler] Boarding dog ${dog.name} (${dog.id}) has no checkedInAt or createdAt — using daycare fallback`);
      const preference = dog.updatePreference || 'weekly';
      const daysToAdd = preference === 'biweekly' ? 14 : 7;
      const next = new Date(currentDate);
      next.setDate(next.getDate() + daysToAdd);
      return next.toISOString().slice(0, 10);
    }

    const portraitDates = calculateBoardingPortraitDates(checkInDate, dog.stayNights);

    // Find next date after current
    const nextDate = portraitDates.find(d => d > currentDate);
    return nextDate || null; // null = all boarding portraits done
  }

  // Daycare: based on updatePreference (weekly or biweekly)
  const preference = dog.updatePreference || 'weekly';
  const daysToAdd = preference === 'biweekly' ? 14 : 7;
  const next = new Date(currentDate);
  next.setDate(next.getDate() + daysToAdd);
  return next.toISOString().slice(0, 10);
}

/**
 * Calculate evenly-spaced portrait dates for a boarding stay.
 * Last portrait always lands on checkout day.
 *
 * 1-3 nights: 1 portrait (checkout day)
 * 4-7 nights: 2 portraits (mid + checkout)
 * 8-14 nights: 3 portraits (evenly spaced + checkout)
 * 15+ nights: resets every ~5 days, max 7
 */
function calculateBoardingPortraitDates(checkInDate: string, nights: number): string[] {
  let count: number;
  if (nights <= 3) count = 1;
  else if (nights <= 7) count = 2;
  else if (nights <= 14) count = 3;
  else count = Math.min(Math.ceil(nights / 5), 7);

  const dates: string[] = [];
  const start = new Date(checkInDate);

  if (count === 1) {
    const checkout = new Date(start);
    checkout.setDate(checkout.getDate() + nights);
    dates.push(checkout.toISOString().slice(0, 10));
  } else {
    const interval = Math.floor(nights / count);
    for (let i = 1; i <= count; i++) {
      const day = i === count ? nights : i * interval;
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      dates.push(date.toISOString().slice(0, 10));
    }
  }

  return dates;
}

export function startPortraitScheduler() {
  // Run once on startup (after a short delay to let DB seed complete)
  setTimeout(() => {
    processPortraitRotation().catch(err => {
      console.error('[scheduler] Initial run error:', err.message);
    });
  }, 10000); // 10s delay after boot

  // Then every 30 minutes
  setInterval(() => {
    processPortraitRotation().catch(err => {
      console.error('[scheduler] Periodic run error:', err.message);
    });
  }, 30 * 60 * 1000);

  console.log('[scheduler] Portrait auto-rotation started (every 30 min)');
}
