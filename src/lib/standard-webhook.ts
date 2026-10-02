/**
 * Standard Webhooks verification (Supabase Auth Hooks).
 * Secret format: v1,whsec_<base64> — strip prefix, base64-decode key.
 * Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`
 */
import { createHmac, timingSafeEqual } from "crypto";

export function normalizeHookSecret(secret: string): Buffer {
  const raw = secret.trim();
  const b64 = raw.startsWith("v1,whsec_")
    ? raw.slice("v1,whsec_".length)
    : raw.startsWith("whsec_")
      ? raw.slice("whsec_".length)
      : raw;
  return Buffer.from(b64, "base64");
}

/**
 * Verify Standard Webhooks signature headers.
 * Throws Error on failure.
 */
export function verifyStandardWebhook(
  rawBody: string,
  headers: Headers | Record<string, string | null | undefined>,
  secret: string,
): unknown {
  const get = (name: string): string => {
    if (headers instanceof Headers) {
      return headers.get(name) || headers.get(name.toLowerCase()) || "";
    }
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower && v) return v;
    }
    return "";
  };

  const msgId = get("webhook-id");
  const msgTs = get("webhook-timestamp");
  const msgSig = get("webhook-signature");
  if (!msgId || !msgTs || !msgSig) {
    throw new Error("Missing webhook signature headers");
  }

  const ts = Number(msgTs);
  if (!Number.isFinite(ts)) throw new Error("Invalid webhook timestamp");
  const now = Math.floor(Date.now() / 1000);
  // ±5 minutes tolerance
  if (Math.abs(now - ts) > 300) {
    throw new Error("Webhook timestamp outside tolerance");
  }

  const key = normalizeHookSecret(secret);
  const toSign = `${msgId}.${msgTs}.${rawBody}`;
  const expected = createHmac("sha256", key).update(toSign).digest("base64");

  // signature header: space-separated list of "v1,<base64>"
  const candidates = msgSig.split(" ").map((s) => s.trim()).filter(Boolean);
  let ok = false;
  for (const c of candidates) {
    const sig = c.startsWith("v1,") ? c.slice(3) : c;
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        ok = true;
        break;
      }
    } catch {
      /* continue */
    }
  }
  if (!ok) throw new Error("Invalid webhook signature");

  return JSON.parse(rawBody);
}
