import { storage } from '../storage';
import { sendSms, isSmsConfigured } from './sms';
import { sendEmail, isEmailConfigured, buildDepartureEmail } from './email';
import { generatePetCode } from './helpers';
import type { Dog, Organization } from '@shared/schema';

export interface DeliveryResult {
  sent: boolean;
  method?: string;
  error?: string;
}

/**
 * Deliver a portrait to a pet's owner via SMS and/or email.
 * Shared between the deliver-batch endpoint and the portrait scheduler.
 */
export async function deliverPortraitToOwner(
  dog: Dog,
  org: Organization,
): Promise<DeliveryResult> {
  if (!dog.ownerPhone && !dog.ownerEmail) {
    return { sent: false, error: "No owner contact info" };
  }

  // Ensure pet has a code for the pawfile URL
  let petCode = dog.petCode;
  if (!petCode) {
    petCode = generatePetCode(dog.name);
    await storage.updateDog(dog.id, { petCode } as any);
  }

  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  const pawfileUrl = `${appUrl}/pawfile/code/${petCode}`;
  const notifMode = (org as any).notificationMode || "both";
  const methods: string[] = [];
  let sent = false;

  // Get the latest portrait for this dog
  const portraits = await storage.getPortraitsByDog(dog.id);
  const latestPortrait = portraits.length > 0 ? portraits[0] : null; // ordered desc by createdAt
  const portraitImageUrl = latestPortrait?.generatedImageUrl?.startsWith('https://')
    ? latestPortrait.generatedImageUrl
    : latestPortrait ? `${appUrl}/api/portraits/${latestPortrait.id}/image` : undefined;

  // Source photo for "Behind the Portrait" (only HTTPS URLs — base64 too large for email)
  const sourcePhotoUrl = dog.originalPhotoUrl?.startsWith('https://')
    ? dog.originalPhotoUrl
    : undefined;

  // SMS delivery
  if ((notifMode === "sms" || notifMode === "both") && dog.ownerPhone && isSmsConfigured()) {
    try {
      const smsBody = `Hi from ${org.name}! We created a stunning portrait of ${dog.name} and it's ready for you. View it and order a keepsake: ${pawfileUrl}`;
      const smsResult = await sendSms(dog.ownerPhone, smsBody);
      if (smsResult.success) {
        methods.push("sms");
        sent = true;
      } else {
        console.error(`[deliver] SMS failed for ${dog.name}:`, smsResult.error);
      }
    } catch (smsErr: any) {
      console.error(`[deliver] SMS error:`, smsErr.message);
    }
  }

  // Email delivery
  if ((notifMode === "email" || notifMode === "both") && dog.ownerEmail && isEmailConfigured()) {
    try {
      const { subject, html } = buildDepartureEmail(
        org.name, org.logoUrl, dog.name, pawfileUrl,
        portraitImageUrl, org.id, sourcePhotoUrl
      );
      const emailResult = await sendEmail(dog.ownerEmail, subject, html, undefined, org.name);
      if (emailResult.success) {
        methods.push("email");
        sent = true;
      } else {
        console.error(`[deliver] Email failed for ${dog.name}:`, emailResult.error);
      }
    } catch (emailErr: any) {
      console.error(`[deliver] Email error:`, emailErr.message);
    }
  }

  return sent
    ? { sent: true, method: methods.join("+") }
    : { sent: false, method: "link_only", error: "No notification channel available or all failed" };
}
