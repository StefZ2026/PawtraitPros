export interface EmailSendResult {
  success: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer }>,
  fromName?: string
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured" };
  }

  try {
    const emailAddr = process.env.RESEND_FROM_ADDRESS || "noreply@pawtraitpros.com";
    const displayName = fromName || "Pawtrait Pros";
    const payload: any = {
      from: `${displayName} <${emailAddr}>`,
      to: [to],
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json() as any;
      const message = err?.message || err?.statusCode || "Failed to send email";
      console.error(`[email] Send failed to ${to}:`, message);
      return { success: false, error: String(message) };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[email] Error sending to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export function buildDepartureEmail(
  orgName: string,
  orgLogoUrl: string | null,
  dogName: string,
  pawfileUrl: string,
  portraitImageUrl?: string,
  orgId?: number,
  sourcePhotoUrl?: string
): { subject: string; html: string } {
  const subject = `${dogName}'s portrait from ${orgName} is ready!`;
  const appUrl = process.env.APP_URL || "https://pawtraitpros.com";
  // Use direct URL for email (email clients don't follow redirects)
  // Fall back to API proxy only for base64 data URIs
  const logoSrc = orgLogoUrl?.startsWith('https://') ? orgLogoUrl
    : orgId ? `${appUrl}/api/organizations/${orgId}/logo` : null;

  // Build compact HTML — no extra whitespace (Gmail clips emails >102KB and trims threaded content)
  const parts: string[] = [];
  parts.push(`<div style="font-family:'Libre Baskerville',Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;">`);
  parts.push(`<div style="text-align:center;margin-bottom:20px;">`);
  if (logoSrc) {
    parts.push(`<img src="${logoSrc}" alt="${orgName}" style="max-height:60px;margin-bottom:12px;" /><br/>`);
  }
  parts.push(`<h2 style="color:#1a1a1a;margin:0;">${orgName}</h2></div>`);
  parts.push(`<p style="font-size:16px;color:#333;line-height:1.5;">We created a stunning portrait of <strong>${dogName}</strong> and it's ready for you!</p>`);
  if (portraitImageUrl) {
    parts.push(`<div style="text-align:center;margin:20px 0;"><a href="${pawfileUrl}"><img src="${portraitImageUrl}" alt="${dogName}'s Portrait" style="max-width:380px;width:100%;border-radius:12px;" /></a></div>`);
  }
  if (sourcePhotoUrl) {
    parts.push(`<div style="text-align:center;margin:16px 0 8px;"><p style="font-size:13px;color:#888;font-style:italic;margin:0 0 8px;">Behind the Portrait — ${dogName} in action</p><img src="${sourcePhotoUrl}" alt="${dogName}" style="max-width:240px;width:60%;border-radius:8px;opacity:0.9;" /></div>`);
  }
  parts.push(`<div style="text-align:center;margin:24px 0;"><a href="${pawfileUrl}" style="display:inline-block;padding:14px 32px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">View & Order a Keepsake</a></div>`);
  parts.push(`<p style="font-size:14px;color:#666;text-align:center;line-height:1.5;">Love it? Order a framed print, mug, tote, or other keepsake featuring ${dogName}.</p>`);
  parts.push(`<p style="font-size:12px;color:#999;text-align:center;margin-top:24px;">Powered by <a href="https://pawtraitpros.com" style="color:#8B5CF6;">Pawtrait Pros</a></p>`);
  parts.push(`</div>`);

  return { subject, html: parts.join("") };
}

export function buildOrderConfirmationEmail(
  orgName: string,
  dogName: string,
  orderId: number,
  totalCents: number,
  itemDescriptions: string[]
): { subject: string; html: string } {
  const subject = `Order #${orderId} confirmed — ${dogName}'s portrait keepsake`;
  const total = (totalCents / 100).toFixed(2);

  const itemsHtml = itemDescriptions
    .map(desc => `<li style="margin-bottom:4px;">${desc}</li>`)
    .join("");

  const html = `
    <div style="font-family:'Libre Baskerville',Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;">
      <h2 style="color:#1a1a1a;text-align:center;">Order Confirmed!</h2>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Thank you for your order from <strong>${orgName}</strong>!
        Your keepsake${itemDescriptions.length > 1 ? "s" : ""} featuring <strong>${dogName}</strong> will be on the way soon.
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#333;">Order #${orderId}</p>
        <ul style="margin:0;padding-left:20px;color:#555;">
          ${itemsHtml}
        </ul>
        <p style="margin:12px 0 0;font-weight:600;color:#333;">Total: $${total}</p>
      </div>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Your hi-res digital download with ${orgName}'s logo is attached to this email — it's yours to keep!
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        We'll email you tracking information once your order ships.
      </p>
      <p style="font-size:13px;color:#999;text-align:center;margin-top:32px;">
        Powered by <a href="https://pawtraitpros.com" style="color:#8B5CF6;">Pawtrait Pros</a>
      </p>
    </div>
  `;

  return { subject, html };
}
