import sharp from "sharp";
import { uploadToStorage, fetchImageAsBuffer } from "../supabase-storage";

export interface SmsSendResult {
  success: boolean;
  error?: string;
  provider?: "twilio" | "telnyx";
  messageId?: string;
  delivered?: boolean;
  queued?: boolean;
  retrying?: boolean;
}

export function formatPhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  return cleaned.startsWith("+") ? cleaned :
         cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
}

function isTwilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
  const hasApiKey = !!(process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET);
  return !!(sid && msgSvc && (hasAuthToken || hasApiKey));
}

function isTelnyxConfigured(): boolean {
  return !!(process.env.TELNYX_API_KEY && process.env.TELNYX_PHONE_NUMBER);
}

export function isSmsConfigured(): boolean {
  return isTwilioConfigured() || isTelnyxConfigured();
}

// --- Per-recipient send tracking (spam filter prevention) ---
const recentSends = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SENDS_BEFORE_DELAY = 3;
const DELAY_MS = 10 * 60 * 1000; // 10 min delay

function recordSend(phone: string): void {
  const now = Date.now();
  const timestamps = recentSends.get(phone) || [];
  timestamps.push(now);
  // Keep only timestamps within the window
  recentSends.set(phone, timestamps.filter(t => now - t < RATE_WINDOW_MS));
}

function getRecentSendCount(phone: string): number {
  const now = Date.now();
  const timestamps = recentSends.get(phone) || [];
  const recent = timestamps.filter(t => now - t < RATE_WINDOW_MS);
  recentSends.set(phone, recent);
  return recent.length;
}

// --- Retry queue for carrier-rejected messages ---
interface RetryEntry {
  phone: string;
  body: string;
  mediaUrl?: string;
  attempts: number;
  status: "pending" | "delivered" | "failed";
  lastError?: string;
}

const retryQueue = new Map<string, RetryEntry>();
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15 * 60 * 1000; // 15 min

export function getRetryStatus(messageId: string): RetryEntry | undefined {
  return retryQueue.get(messageId);
}

function scheduleRetry(messageId: string, entry: RetryEntry): void {
  console.log(`[sms] Carrier rejected ${messageId} to ${entry.phone}, queuing retry ${entry.attempts + 1}/${MAX_RETRY_ATTEMPTS} in 15min`);
  entry.attempts++;
  retryQueue.set(messageId, entry);

  setTimeout(async () => {
    try {
      console.log(`[sms] Retrying ${messageId} to ${entry.phone} (attempt ${entry.attempts})`);
      const result = await sendViaTelnyx(entry.phone, entry.body, entry.mediaUrl);
      if (!result.success || !result.messageId) {
        console.warn(`[sms] Retry send failed for ${messageId}: ${result.error}`);
        if (entry.attempts < MAX_RETRY_ATTEMPTS) {
          scheduleRetry(messageId, entry);
        } else {
          entry.status = "failed";
          entry.lastError = result.error || "All retries exhausted";
          retryQueue.set(messageId, entry);
          console.error(`[sms] All retries exhausted for ${messageId} to ${entry.phone}`);
        }
        return;
      }

      // Poll for delivery status on the retry
      const deliveryStatus = await pollDeliveryStatus(result.messageId);
      if (deliveryStatus === "delivered") {
        entry.status = "delivered";
        retryQueue.set(messageId, entry);
        console.log(`[sms] Retry delivered! ${messageId} to ${entry.phone}`);
      } else if (deliveryStatus === "failed" && entry.attempts < MAX_RETRY_ATTEMPTS) {
        scheduleRetry(messageId, entry);
      } else {
        entry.status = "failed";
        entry.lastError = "Carrier rejected after retry";
        retryQueue.set(messageId, entry);
      }
    } catch (err: any) {
      console.error(`[sms] Retry error for ${messageId}: ${err.message}`);
      if (entry.attempts < MAX_RETRY_ATTEMPTS) {
        scheduleRetry(messageId, entry);
      } else {
        entry.status = "failed";
        entry.lastError = err.message;
        retryQueue.set(messageId, entry);
      }
    }
  }, RETRY_DELAY_MS);
}

// Cleanup stale retry entries every 30 min
setInterval(() => {
  // Clean up completed/failed retry entries
  const retryIds = Array.from(retryQueue.keys());
  for (const id of retryIds) {
    const entry = retryQueue.get(id)!;
    if (entry.status !== "pending") {
      retryQueue.delete(id);
    }
  }
  // Clean up recentSends
  const now = Date.now();
  const phones = Array.from(recentSends.keys());
  for (const phone of phones) {
    const timestamps = recentSends.get(phone)!;
    const recent = timestamps.filter((t: number) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) recentSends.delete(phone);
    else recentSends.set(phone, recent);
  }
}, 30 * 60 * 1000);

// --- Poll Telnyx for actual delivery status ---
async function pollDeliveryStatus(messageId: string): Promise<"delivered" | "failed" | "unknown"> {
  const apiKey = process.env.TELNYX_API_KEY!;
  const MAX_POLLS = 6;
  const POLL_INTERVAL_MS = 3000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const res = await fetch(`https://api.telnyx.com/v2/messages/${messageId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        console.warn(`[sms] Poll ${i + 1}/${MAX_POLLS} failed: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json() as any;
      const status = data.data?.to?.[0]?.status;

      if (status === "delivered") {
        console.log(`[sms] Delivery confirmed for ${messageId} (poll ${i + 1})`);
        return "delivered";
      }
      if (status === "delivery_failed" || status === "sending_failed") {
        const errors = data.data?.errors || [];
        console.warn(`[sms] Delivery failed for ${messageId}: status=${status}, errors=${JSON.stringify(errors)}`);
        return "failed";
      }
      // Still in progress (queued, sending, sent) — keep polling
      console.log(`[sms] Poll ${i + 1}/${MAX_POLLS} for ${messageId}: status=${status}`);
    } catch (err: any) {
      console.warn(`[sms] Poll error for ${messageId}: ${err.message}`);
    }
  }

  console.warn(`[sms] Polling timed out for ${messageId} after ${MAX_POLLS} attempts`);
  return "unknown";
}

// --- Telnyx send (returns message ID) ---
async function sendViaTelnyx(phone: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const apiKey = process.env.TELNYX_API_KEY!;
  const from = process.env.TELNYX_PHONE_NUMBER!;

  const payload: Record<string, any> = { from, to: phone, text: body };
  if (mediaUrl) {
    payload.media_urls = [mediaUrl];
    payload.type = "MMS";
  }

  const res = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    const detail = err.errors?.[0]?.detail || err.errors?.[0]?.title || "Failed";
    return { success: false, error: `Telnyx: ${detail}`, provider: "telnyx" };
  }

  const data = await res.json() as any;
  const messageId = data.data?.id;
  const status = data.data?.to?.[0]?.status;
  if (status === "delivery_failed") {
    const errDetail = data.data?.errors?.[0]?.detail || "Delivery failed";
    return { success: false, error: `Telnyx: ${errDetail}`, provider: "telnyx", messageId };
  }

  return { success: true, provider: "telnyx", messageId };
}

// --- Twilio send ---
async function sendViaTwilio(phone: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID!;
  const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID!;

  let authHeader: string;
  if (process.env.TWILIO_AUTH_TOKEN) {
    authHeader = `Basic ${Buffer.from(`${twilioSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`;
  } else {
    authHeader = `Basic ${Buffer.from(`${process.env.TWILIO_API_KEY_SID}:${process.env.TWILIO_API_KEY_SECRET}`).toString("base64")}`;
  }

  const params: Record<string, string> = { To: phone, MessagingServiceSid: twilioMsgSvc, Body: body };
  if (mediaUrl) params.MediaUrl = mediaUrl;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": authHeader,
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    return { success: false, error: `Twilio: ${err.message || err.code || "Failed"}`, provider: "twilio" };
  }

  return { success: true, provider: "twilio" };
}

// --- Main send function ---
export async function sendSms(to: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const phone = formatPhoneNumber(to);
  const errors: string[] = [];

  // Compress portrait to MMS-friendly JPEG and upload to Supabase Storage
  // Full-quality PNGs (1.5MB+) exceed carrier MMS limits (~600KB-1.2MB)
  if (mediaUrl) {
    try {
      const imgBuffer = await fetchImageAsBuffer(mediaUrl);
      const compressed = await sharp(imgBuffer).jpeg({ quality: 75 }).toBuffer();
      const fname = `mms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const dataUri = `data:image/jpeg;base64,${compressed.toString("base64")}`;
      mediaUrl = await uploadToStorage(dataUri, "portraits", fname);
      console.log(`[sms] Compressed ${imgBuffer.length}B -> ${compressed.length}B, uploaded: ${mediaUrl}`);
    } catch (err: any) {
      console.error(`[sms] Failed to prepare MMS image: ${err.message}`);
      return { success: false, error: `Failed to process portrait image: ${err.message}` };
    }
  }

  // Check per-recipient rate — delay if we've sent too many recently
  const recentCount = getRecentSendCount(phone);
  if (recentCount >= MAX_SENDS_BEFORE_DELAY) {
    console.log(`[sms] ${recentCount} recent sends to ${phone}, queueing with ${DELAY_MS / 60000}min delay`);
    const queueId = `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: RetryEntry = { phone, body, mediaUrl, attempts: 0, status: "pending" };
    retryQueue.set(queueId, entry);

    setTimeout(async () => {
      try {
        console.log(`[sms] Sending delayed message ${queueId} to ${phone}`);
        recordSend(phone);
        const result = await sendViaTelnyx(phone, body, mediaUrl);
        if (result.success && result.messageId) {
          const deliveryStatus = await pollDeliveryStatus(result.messageId);
          entry.status = deliveryStatus === "failed" ? "failed" : "delivered";
          if (deliveryStatus === "failed" && entry.attempts < MAX_RETRY_ATTEMPTS) {
            scheduleRetry(queueId, entry);
          }
        } else {
          entry.status = "failed";
          entry.lastError = result.error;
        }
        retryQueue.set(queueId, entry);
      } catch (err: any) {
        entry.status = "failed";
        entry.lastError = err.message;
        retryQueue.set(queueId, entry);
      }
    }, DELAY_MS);

    return { success: true, queued: true, messageId: queueId };
  }

  // Record this send for rate tracking
  recordSend(phone);

  // Telnyx first — 10DLC campaign is ACTIVE and delivering
  if (isTelnyxConfigured()) {
    try {
      const result = await sendViaTelnyx(phone, body, mediaUrl);
      if (result.success && result.messageId) {
        console.log(`[sms] Accepted by Telnyx: ${result.messageId} to ${phone}${mediaUrl ? ' (MMS)' : ''}`);

        // Poll for actual delivery confirmation
        const deliveryStatus = await pollDeliveryStatus(result.messageId);

        if (deliveryStatus === "delivered") {
          return { success: true, delivered: true, provider: "telnyx", messageId: result.messageId };
        }

        if (deliveryStatus === "failed") {
          // Carrier rejected — schedule auto-retry
          const entry: RetryEntry = { phone, body, mediaUrl, attempts: 0, status: "pending" };
          scheduleRetry(result.messageId, entry);
          return { success: false, error: "Carrier rejected the message", retrying: true, messageId: result.messageId, provider: "telnyx" };
        }

        // Unknown (polling timed out) — carrier hasn't responded yet
        // Still return success since Telnyx accepted it, but not confirmed
        return { success: true, delivered: false, provider: "telnyx", messageId: result.messageId };
      }
      if (result.error) {
        console.warn(`[sms] Telnyx failed: ${result.error}`);
        errors.push(result.error);
      }
    } catch (err: any) {
      console.warn(`[sms] Telnyx error: ${err.message}`);
      errors.push(`Telnyx: ${err.message}`);
    }
  }

  // Fall back to Twilio
  if (isTwilioConfigured()) {
    try {
      const result = await sendViaTwilio(phone, body, mediaUrl);
      if (result.success) {
        console.log(`[sms] Sent via Twilio to ${phone}${mediaUrl ? ' (MMS)' : ''}`);
        return result;
      }
      console.warn(`[sms] Twilio failed: ${result.error}`);
      errors.push(result.error || "Twilio failed");
    } catch (err: any) {
      console.warn(`[sms] Twilio error: ${err.message}`);
      errors.push(`Twilio: ${err.message}`);
    }
  }

  if (errors.length === 0) {
    return { success: false, error: "No SMS provider configured" };
  }

  return { success: false, error: errors.join("; ") };
}
