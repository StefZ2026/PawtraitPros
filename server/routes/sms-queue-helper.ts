// Shared helper for enqueuing native SMS — used by both batch.ts and sms-queue.ts routes
import { pool } from "../db";
import { storage } from "../storage";
import { generatePetCode } from "./helpers";
import { getIo } from "../websocket";

export async function enqueueNativeSms(
  org: any,
  dogIds: number[],
  messageTemplate?: string,
): Promise<{ queued: Array<{ dogId: number; queueId: number }>; errors: Array<{ dogId: number; error: string }>; totalQueued: number }> {
  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  const defaultTemplate = "Hi from {orgName}! We created a portrait of {dogName} and it's ready for you. View it and order a keepsake: {link}";
  const template = messageTemplate?.trim() || defaultTemplate;

  const queued: Array<{ dogId: number; queueId: number }> = [];
  const errors: Array<{ dogId: number; error: string }> = [];

  for (const dogId of dogIds) {
    const dog = await storage.getDog(dogId);
    if (!dog || dog.organizationId !== org.id) {
      errors.push({ dogId, error: "Dog not found or wrong org" });
      continue;
    }
    if (!dog.ownerPhone) {
      errors.push({ dogId, error: "No owner phone number" });
      continue;
    }

    let petCode = dog.petCode;
    if (!petCode) {
      petCode = generatePetCode(dog.name);
      await storage.updateDog(dog.id, { petCode } as any);
    }

    const pawfileUrl = `${appUrl}/pawfile/code/${petCode}`;

    const selectedPortrait = await storage.getSelectedPortraitByDog(dog.id);
    const imageUrl = selectedPortrait?.generatedImageUrl?.startsWith("https://")
      ? selectedPortrait.generatedImageUrl
      : selectedPortrait ? `${appUrl}/api/portraits/${selectedPortrait.id}/image` : null;

    const messageBody = template
      .replace(/\{dogName\}/g, dog.name)
      .replace(/\{orgName\}/g, org.name)
      .replace(/\{link\}/g, pawfileUrl);

    const result = await pool.query(
      `INSERT INTO sms_queue (organization_id, dog_id, recipient_phone, message_body, image_url, pawfile_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
      [org.id, dog.id, dog.ownerPhone, messageBody, imageUrl, pawfileUrl]
    );

    queued.push({ dogId: dog.id, queueId: result.rows[0].id });
  }

  // Notify connected devices
  if (queued.length > 0) {
    const io = getIo();
    if (io) {
      io.to(`org:${org.id}`).emit("queue:ready", {
        count: queued.length,
        orgId: org.id,
      });
    }
  }

  return { queued, errors, totalQueued: queued.length };
}
