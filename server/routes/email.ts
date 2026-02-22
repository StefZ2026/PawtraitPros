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
  attachments?: Array<{ filename: string; content: Buffer }>
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email service is not configured" };
  }

  try {
    const payload: any = {
      from: process.env.RESEND_FROM_EMAIL || "Pawtrait Pros <onboarding@resend.dev>",
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
  pawfileUrl: string
): { subject: string; html: string } {
  const subject = `${dogName}'s portrait from ${orgName} is ready!`;

  const logoHtml = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height:60px;margin-bottom:16px;" /><br/>`
    : "";

  const html = `
    <div style="font-family:'Libre Baskerville',Georgia,serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        ${logoHtml}
        <h2 style="color:#1a1a1a;margin:0;">${orgName}</h2>
      </div>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Hi there! We created a stunning portrait of <strong>${dogName}</strong> and it's ready for you.
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        View it, grab a free digital download, or order a framed print, mug, or canvas:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${pawfileUrl}" style="display:inline-block;padding:14px 32px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
          View ${dogName}'s Portrait
        </a>
      </div>
      <p style="font-size:13px;color:#999;text-align:center;">
        Powered by <a href="https://pawtraitpros.com" style="color:#8B5CF6;">Pawtrait Pros</a>
      </p>
    </div>
  `;

  return { subject, html };
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
