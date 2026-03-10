// Shared helper for sending SMS via Telnyx and logging to sms_queue
import { pool } from "../db";
import { storage } from "../storage";
import { generatePetCode } from "./helpers";
import { getIo } from "../websocket";
import { sendSms, isSmsConfigured } from "./sms";

export async function enqueueNativeSms(
  org: any,
  dogIds: number[],
  messageTemplate?: string,
): Promise<{ queued: Array<{ dogId: number; queueId: number }>; errors: Array<{ dogId: number; error: string }>; totalQueued: number }> {
  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  const defaultTemplate = "Check out {dogName}'s beautiful portrait from {orgName}! {link}";
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

    // Send via Telnyx DIRECTLY
    let smsStatus = "pending";
    let smsError: string | null = null;
    if (isSmsConfigured()) {
      try {
        const smsResult = await sendSms(dog.ownerPhone, messageBody, imageUrl || undefined);
        if (smsResult.success) {
          smsStatus = "sent";
        } else {
          smsStatus = "failed";
          smsError = smsResult.error || "Send failed";
        }
      } catch (smsErr: any) {
        smsStatus = "failed";
        smsError = smsErr.message;
      }
    } else {
      smsStatus = "failed";
      smsError = "SMS not configured";
    }

    // Log to sms_queue for record-keeping
    const result = await pool.query(
      `INSERT INTO sms_queue (organization_id, dog_id, recipient_phone, message_body, image_url, pawfile_url, status, ${smsStatus === "sent" ? "sent_at" : "error"})
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${smsStatus === "sent" ? "CURRENT_TIMESTAMP" : "$8"}) RETURNING id`,
      smsStatus === "sent"
        ? [org.id, dog.id, dog.ownerPhone, messageBody, imageUrl, pawfileUrl, smsStatus]
        : [org.id, dog.id, dog.ownerPhone, messageBody, imageUrl, pawfileUrl, smsStatus, smsError]
    );

    queued.push({ dogId: dog.id, queueId: result.rows[0].id });

    if (smsStatus === "failed") {
      errors.push({ dogId: dog.id, error: smsError || "Send failed" });
    }
  }

  // Notify dashboard via WebSocket
  if (queued.length > 0) {
    const io = getIo();
    if (io) {
      io.to(`org:${org.id}`).emit("delivery:update", {
        count: queued.length,
        orgId: org.id,
      });
    }
  }

  return { queued, errors, totalQueued: queued.length };
}
