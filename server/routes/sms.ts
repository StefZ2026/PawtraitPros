export interface SmsSendResult {
  success: boolean;
  error?: string;
  provider?: "twilio" | "telnyx";
}

export function formatPhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  return cleaned.startsWith("+") ? cleaned :
         cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
}

function isTwilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  // Support either Auth Token or API Key auth
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

async function sendViaTwilio(phone: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID!;
  const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID!;

  // Prefer Auth Token over API Key (more reliable)
  let authHeader: string;
  if (process.env.TWILIO_AUTH_TOKEN) {
    authHeader = `Basic ${Buffer.from(`${twilioSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`;
  } else {
    authHeader = `Basic ${Buffer.from(`${process.env.TWILIO_API_KEY_SID}:${process.env.TWILIO_API_KEY_SECRET}`).toString("base64")}`;
  }

  const params: Record<string, string> = { To: phone, MessagingServiceSid: twilioMsgSvc, Body: body };
  if (mediaUrl && mediaUrl.startsWith('https://')) params.MediaUrl = mediaUrl;

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

async function sendViaTelnyx(phone: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const apiKey = process.env.TELNYX_API_KEY!;
  const from = process.env.TELNYX_PHONE_NUMBER!;

  const payload: Record<string, any> = { from, to: phone, text: body };
  if (mediaUrl && mediaUrl.startsWith('https://')) {
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

  // Check if message was accepted (queued)
  const data = await res.json() as any;
  const status = data.data?.to?.[0]?.status;
  if (status === "delivery_failed") {
    const errDetail = data.data?.errors?.[0]?.detail || "Delivery failed";
    return { success: false, error: `Telnyx: ${errDetail}`, provider: "telnyx" };
  }

  return { success: true, provider: "telnyx" };
}

export async function sendSms(to: string, body: string, mediaUrl?: string): Promise<SmsSendResult> {
  const phone = formatPhoneNumber(to);
  const errors: string[] = [];

  // Telnyx first — 10DLC campaign is ACTIVE and delivering
  // Twilio campaigns are still in review and silently drop messages
  if (isTelnyxConfigured()) {
    try {
      const result = await sendViaTelnyx(phone, body, mediaUrl);
      if (result.success) {
        console.log(`[sms] Sent via Telnyx to ${phone}${mediaUrl ? ' (MMS)' : ''}`);
        return result;
      }
      console.warn(`[sms] Telnyx failed: ${result.error}`);
      errors.push(result.error || "Telnyx failed");
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
