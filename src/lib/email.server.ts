// Server-only email helpers via Resend HTTP API.
// Prefer EMAIL_FROM when set; otherwise SUPPORT_EMAIL (explicit, not silent swap mid-send).

import { planPurchasedEmail, welcomeEmail } from "@/emails/templates";
import { sendTemplateEmail } from "@/emails/send";

const RESEND_URL = "https://api.resend.com/emails";
const PRICING_URL = "https://motio2edit.com/pricing";

export type EmailSendResult = { ok: boolean; error?: string; id?: string };

function resolveFromAddress(): { from: string; replyTo: string } | null {
  const support = (process.env.SUPPORT_EMAIL || "").trim();
  const emailFrom = (process.env.EMAIL_FROM || "").trim();
  const address = emailFrom || support || "support@motio2edit.com";
  const replyTo = support || address;
  const from = address.includes("<") ? address : `Motio2edit <${address}>`;
  return { from, replyTo };
}

export async function sendPaymentErrorReport(args: {
  userId: string;
  transactionId: string;
  paymentMethod: string;
  error: string;
  amount: number | string;
  currency: string;
}): Promise<EmailSendResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const addresses = resolveFromAddress();
  if (!RESEND_API_KEY || !addresses) {
    console.error("[payments] payment error (email not configured):", args.transactionId);
    return { ok: false, error: "not_configured" };
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
        from: `Motio2edit Alerts <${addresses.replyTo}>`,
        to: [addresses.replyTo],
        reply_to: addresses.replyTo,
        subject: `[PAYMENT ERROR] ${args.paymentMethod} — ${args.transactionId}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[payments] alert email failed:", res.status);
      return { ok: false, error: text.slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    console.error("[payments] alert email error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Generic branded transactional email. Returns success/failure (never silent). */
export async function sendBrandedEmail(args: {
  to: string;
  subject: string;
  heading: string;
  bodyHtml: string;
  idempotencyKey?: string;
}): Promise<EmailSendResult> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const addresses = resolveFromAddress();
  if (!RESEND_API_KEY || !args.to || !addresses) {
    console.error("[email] not configured, skipping:", args.subject);
    return { ok: false, error: "not_configured" };
  }
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#F97316;color:#fff;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">Motio2edit</h2>
    </div>
    <div style="background:#ffffff;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
      <h3 style="margin-top:0">${args.heading}</h3>
      ${args.bodyHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#777">Need help? Contact us at ${addresses.replyTo}</p>
    </div>
  </div>`;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    };
    if (args.idempotencyKey) {
      headers["Idempotency-Key"] = args.idempotencyKey.slice(0, 256);
    }
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: addresses.from,
        to: [args.to],
        reply_to: addresses.replyTo,
        subject: args.subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] send failed:", res.status);
      return { ok: false, error: text.slice(0, 200) };
    }
    let id: string | undefined;
    try {
      const json = await res.json();
      id = json?.id;
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  } catch (err) {
    console.error("[email] send error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendPlanPurchasedEmail(args: {
  to: string;
  name?: string;
  planName: string;
  amount: string;
  creditsAdded: number | string;
  expiry?: string;
  orderId: string;
}): Promise<EmailSendResult> {
  if (!args.to) return { ok: false, error: "no_recipient" };
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
  if (!send.ok) {
    console.error("[email] plan purchased failed:", send.error);
    return { ok: false, error: send.error || "send_failed" };
  }
  return { ok: true };
}

export async function sendWelcomeEmail(args: {
  to: string;
  name?: string;
  freeCredits?: number;
}): Promise<EmailSendResult> {
  if (!args.to) return { ok: false, error: "no_recipient" };
  const result = welcomeEmail({
    name: args.name || "there",
    free_credits: String(args.freeCredits ?? 40),
  });
  const send = await sendTemplateEmail(args.to, result);
  if (!send.ok) {
    console.error("[email] welcome failed:", send.error);
    return { ok: false, error: send.error || "send_failed" };
  }
  return { ok: true };
}

/**
 * Plan expiration — manual renewal only.
 * Callers must only set expiration_email_sent_at when result.ok === true.
 */
export async function sendPlanExpiredEmail(args: {
  to: string;
  name?: string;
  planName: string;
  idempotencyKey?: string;
}): Promise<EmailSendResult> {
  if (!args.to) return { ok: false, error: "no_recipient" };
  const subject = "Your Motio2edit plan has expired — Renew anytime!";
  const bodyHtml = `
    <p>Hi ${args.name || "there"},</p>
    <p>Your Motio2edit <strong>${args.planName}</strong> plan has expired.</p>
    <p>We hope you enjoyed creating with Motio2edit!</p>
    <p>There is <strong>no automatic renewal</strong>. We never charge you again without your approval.</p>
    <p>You can renew anytime with a new one-time payment:</p>
    <p style="margin:28px 0">
      <a href="${PRICING_URL}" style="background:#F97316;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Renew My Plan</a>
    </p>
    <p>Thank you for choosing Motio2edit!</p>
  `;
  return sendBrandedEmail({
    to: args.to,
    subject,
    heading: "Your plan has expired",
    bodyHtml,
    idempotencyKey: args.idempotencyKey,
  });
}

/**
 * Pre-expiry renewal reminder — NO automatic charge.
 * Customer must open Pricing and complete a new one-time payment.
 */
export async function sendPlanRenewalReminderEmail(args: {
  to: string;
  name?: string;
  planName: string;
  expiresAt: string;
  daysLeft: 7 | 3 | 1;
  idempotencyKey?: string;
}): Promise<EmailSendResult> {
  if (!args.to) return { ok: false, error: "no_recipient" };
  const when = args.daysLeft === 1 ? "tomorrow" : `in ${args.daysLeft} days`;
  const expiryLabel = (() => {
    try {
      return new Date(args.expiresAt).toUTCString();
    } catch {
      return args.expiresAt;
    }
  })();
  const subject =
    args.daysLeft === 1
      ? `Your Motio2edit ${args.planName} plan expires tomorrow`
      : `Your Motio2edit ${args.planName} plan expires ${when}`;
  const bodyHtml = `
    <p>Hi ${args.name || "there"},</p>
    <p>Your Motio2edit <strong>${args.planName}</strong> plan is about to expire <strong>${when}</strong>.</p>
    <p><strong>Expiration date:</strong> ${expiryLabel}</p>
    <p>There is <strong>no automatic renewal</strong> and we will <strong>never charge you again</strong> without your approval.</p>
    <p>To keep your plan and credits, renew with a new one-time payment on the pricing page:</p>
    <p style="margin:28px 0">
      <a href="${PRICING_URL}" style="background:#F97316;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Renew my plan</a>
    </p>
    <p style="font-size:13px;color:#555">Steps: open <a href="${PRICING_URL}">https://motio2edit.com/pricing</a> → choose the same plan (monthly or yearly) → complete PayPal or Razorpay checkout once. No AutoPay.</p>
  `;
  return sendBrandedEmail({
    to: args.to,
    subject,
    heading: "Plan renewal reminder",
    bodyHtml,
    idempotencyKey: args.idempotencyKey,
  });
}
