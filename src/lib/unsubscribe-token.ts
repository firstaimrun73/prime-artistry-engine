/** HMAC token for marketing unsubscribe links (CRON_SECRET). */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function signUnsubToken(email: string): string {
  const e = email.trim().toLowerCase();
  return createHmac("sha256", secret()).update(`unsub:${e}`).digest("hex").slice(0, 32);
}

export function validUnsubToken(email: string, token: string): boolean {
  if (!secret() || !token || !email) return false;
  const expected = signUnsubToken(email);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(token).slice(0, 32));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function marketingUnsubscribeUrl(email: string): string {
  const e = email.trim().toLowerCase();
  return `https://motio2edit.com/api/public/unsubscribe?email=${encodeURIComponent(e)}&token=${signUnsubToken(e)}`;
}
