// Server-only email helpers via Resend HTTP API.
// Production path: RESEND_API_KEY + EMAIL_FROM / SUPPORT_EMAIL.
// Lovable email queue is not required for these transactional sends.

import { planPurchasedEmail, welcomeEmail } from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

const RESEND_URL = "https://api.resend.com/emails";

export async function sendPaymentErrorReport(args: {
  userId: string;
  transactionId: string;
  paymentMethod: string;
  error: string;
  amount: number | string;
  currency: string;
}): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@motio2edit.com";
  if (!RESEND_API_KEY) {
    console.error("[payments] payment error (email not configured):", args);
    return;
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#c0392b;color:#fff;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">Payment Error</h2>
    </div>
    <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
      <p><b>User ID:</b> ${args.userId}</p>
      <p><b>Transaction ID:</b> ${args.transactionId}</p>
      <p><b>Method:</b> ${args.paymentMethod}</p>
      <p><b>Amount:</b> ${args.amount} ${args.currency}</p>
      <p><b>Error:</b> <span style="color:#c0392b">${args.error}</span></p>
      <p><b>Time:</b> ${new Date().toUTCString()}</p>
    </div>
  </div>`;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Motio2edit Alerts <${supportEmail}>`,
        to: [supportEmail],
        reply_to: supportEmail,
        subject: `[PAYMENT ERROR] ${args.paymentMethod} — ${args.transactionId}`,
        html,
      }),
    });
    if (!res.ok) console.error("[payments] alert email failed:", res.status, await res.text());
  } catch (err) {
    console.error("[payments] alert email error:", err);
  }
}

/** Generic branded transactional email used by the subscription/refund flows. */
export async function sendBrandedEmail(args: {
  to: string;
  subject: string;
  heading: string;
  bodyHtml: string;
}): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@motio2edit.com";
  if (!RESEND_API_KEY || !args.to) {
    console.error("[email] not configured, skipping:", args.subject);
    return;
  }
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#F97316;color:#fff;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">Motio2edit</h2>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
      <h3 style="margin-top:0">${args.heading}</h3>
      ${args.bodyHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#777">Need help? Contact us at ${supportEmail}</p>
    </div>
  </div>`;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `Motio2edit <${supportEmail}>`,
        to: [args.to],
        reply_to: supportEmail,
        subject: args.subject,
        html,
      }),
    });
    if (!res.ok) console.error("[email] send failed:", res.status, await res.text());
  } catch (err) {
    console.error("[email] send error:", err);
  }
}

/**
 * Transactional: plan purchase confirmation.
 * Always send — not gated on marketing opt-in.
 */
export async function sendPlanPurchasedEmail(args: {
  to: string;
  name?: string;
  planName: string;
  amount: string;
  creditsAdded: number | string;
  expiry?: string;
  orderId: string;
}): Promise<void> {
  if (!args.to) return;
  const result = planPurchasedEmail({
    name: args.name || "there",
    plan_name: args.planName,
    amount: args.amount,
    credits_added: String(args.creditsAdded),
    expiry: args.expiry || "—",
    order_id: args.orderId,
  });
  const send = await sendTemplateEmail(args.to, result, {
    idempotencyKey: `plan-purchased-${args.orderId}`,
  });
  if (!send.ok) console.error("[email] plan purchased failed:", send.error);
}

/** Transactional welcome after signup/confirm — not marketing-gated. */
export async function sendWelcomeEmail(args: {
  to: string;
  name?: string;
  freeCredits?: number;
}): Promise<void> {
  if (!args.to) return;
  const result = welcomeEmail({
    name: args.name || "there",
    free_credits: String(args.freeCredits ?? 40),
  });
  const send = await sendTemplateEmail(args.to, result);
  if (!send.ok) console.error("[email] welcome failed:", send.error);
}
