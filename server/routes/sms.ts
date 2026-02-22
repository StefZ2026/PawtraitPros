export interface SmsSendResult {
  success: boolean;
  error?: string;
}

export function formatPhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  return cleaned.startsWith("+") ? cleaned :
         cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
}

export function isSmsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_API_KEY_SID &&
    process.env.TWILIO_API_KEY_SECRET &&
    process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioKeySid = process.env.TWILIO_API_KEY_SID;
  const twilioKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twilioMsgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!twilioSid || !twilioKeySid || !twilioKeySecret || !twilioMsgSvc) {
    return { success: false, error: "SMS service is not configured" };
  }

  const phone = formatPhoneNumber(to);
  const twilioAuth = Buffer.from(`${twilioKeySid}:${twilioKeySecret}`).toString("base64");

  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${twilioAuth}`,
    },
    body: new URLSearchParams({ To: phone, MessagingServiceSid: twilioMsgSvc, Body: body }).toString(),
  });

  if (!twilioRes.ok) {
    const err = await twilioRes.json() as any;
    return { success: false, error: err.message || "Failed to send text message" };
  }

  return { success: true };
}
