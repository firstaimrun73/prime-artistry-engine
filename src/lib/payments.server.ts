// Server-only payment helpers. Never imported by client/route files directly.
import { createHmac, timingSafeEqual } from "crypto";

export const RAZORPAY_PACKAGES = {
  starter: { credits: 100, amountINR: 99 },
  basic: { credits: 300, amountINR: 249 },
  pro: { credits: 1000, amountINR: 699 },
  enterprise: { credits: 5000, amountINR: 2999 },
} as const;

export const CRYPTO_PACKAGES = {
  starter: { credits: 100, amountUSD: 2 },
  basic: { credits: 300, amountUSD: 5 },
  pro: { credits: 1000, amountUSD: 12 },
  enterprise: { credits: 5000, amountUSD: 49 },
} as const;

export type PackageId = keyof typeof RAZORPAY_PACKAGES;

// ── Plan-based purchases (matches src/lib/plans.ts pricing) ──
export const PLAN_PURCHASE = {
  plus: { credits: 900, amountINR: 799, amountUSD: 9.99 },
  pro: { credits: 3000, amountINR: 2400, amountUSD: 29.99 },
  studio: { credits: 9000, amountINR: 8200, amountUSD: 99 },
} as const;

export type PurchasablePlan = keyof typeof PLAN_PURCHASE;

// Reverse-map a recorded credit amount back to its plan id (each plan has a unique credit count).
export function planFromCredits(credits: number): PurchasablePlan | null {
  const entry = Object.entries(PLAN_PURCHASE).find(([, p]) => p.credits === credits);
  return (entry?.[0] as PurchasablePlan) ?? null;
}

export const ACCEPTED_COINS = ["usdtbsc", "btc", "eth"] as const;
export type AcceptedCoin = (typeof ACCEPTED_COINS)[number];

export const NP_API = process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";

// ── Razorpay REST helpers (no SDK — Workers-compatible) ──
function razorpayAuthHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay keys are not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function createRazorpayOrder(args: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string | number>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: razorpayAuthHeader() },
    body: JSON.stringify({
      amount: args.amountPaise,
      currency: "INR",
      receipt: args.receipt,
      notes: args.notes,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

// ── NOWPayments helpers ──
function npHeaders() {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPayments API key is not configured");
  return { "x-api-key": key };
}

export async function createNowPaymentsInvoice(body: Record<string, unknown>) {
  const res = await fetch(`${NP_API}/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...npHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments invoice failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getNowPaymentsPayment(invoiceId: string) {
  const res = await fetch(`${NP_API}/payment/${invoiceId}`, { headers: npHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments status failed (${res.status}): ${text}`);
  }
  return res.json();
}

// NOWPayments IPN signature: HMAC-SHA512 of the JSON body with keys sorted alphabetically.
export function verifyNowPaymentsIpn(rawBody: string, signature: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const sorted = JSON.stringify(sortObject(parsed));
  const expected = createHmac("sha512", secret).update(sorted).digest("hex");
  return safeEqualHex(expected, signature);
}

export const NP_STATUS_MAP: Record<string, string> = {
  waiting: "pending",
  confirming: "processing",
  confirmed: "processing",
  sending: "processing",
  finished: "completed",
  failed: "failed",
  expired: "expired",
  partially_paid: "underpaid",
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
