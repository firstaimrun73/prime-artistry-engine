/**
 * Resend sender for Motio2edit transactional + marketing emails.
 * From: verified motio2edit.com domain. Reply-To: support@motio2edit.com
 */
import type { EmailResult } from "./templates";

const RESEND_URL = "https://api.resend.com/emails";

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  /** When true, includes List-Unsubscribe headers for marketing. */
  marketing?: boolean;
  unsubscribeUrl?: string;
  /** Optional idempotency key for Resend. */
  idempotencyKey?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

function fromAddress(): string {
  const from = process.env.EMAIL_FROM || process.env.SUPPORT_EMAIL || "noreply@motio2edit.com";
  if (from.includes("<")) return from;
  return `Motio2edit <${from}>`;
}

export async function sendResendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[email] RESEND_API_KEY missing — skip send:", args.subject);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  if (!args.to) return { ok: false, error: "missing recipient" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (args.idempotencyKey) {
    headers["Idempotency-Key"] = args.idempotencyKey;
  }

  const body: Record<string, unknown> = {
    from: fromAddress(),
    to: [args.to],
    reply_to: process.env.SUPPORT_EMAIL || "support@motio2edit.com",
    subject: args.subject,
    html: args.html,
  };

  if (args.marketing && args.unsubscribeUrl) {
    body.headers = {
      "List-Unsubscribe": `<${args.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[email] Resend failed:", res.status, text);
      return { ok: false, error: text.slice(0, 500) };
    }
    let id: string | undefined;
    try {
      id = JSON.parse(text)?.id;
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Resend error:", msg);
    return { ok: false, error: msg };
  }
}

export async function sendTemplateEmail(
  to: string,
  result: EmailResult,
  opts?: { marketing?: boolean; unsubscribeUrl?: string; idempotencyKey?: string },
): Promise<SendEmailResult> {
  return sendResendEmail({
    to,
    subject: result.subject,
    html: result.html,
    marketing: opts?.marketing,
    unsubscribeUrl: opts?.unsubscribeUrl,
    idempotencyKey: opts?.idempotencyKey,
  });
}
