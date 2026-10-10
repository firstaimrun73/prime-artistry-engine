// Server-only payment helpers. Never imported by client/route files directly.
import { createHmac, timingSafeEqual } from "crypto";
import { DISPLAY_PRICES, PLAN_CREDITS, type PlanId } from "@/lib/plans";

/**
 * One-time credit top-up packs.
 * credits = floor(USD / 0.0178) — purchase face, not Video spend face.
 */
export const RAZORPAY_PACKAGES = {
  starter: { credits: 280, amountINR: 449 },
  basic: { credits: 561, amountINR: 899 },
  pro: { credits: 1684, amountINR: 2699 },
  studio: { credits: 3089, amountINR: 4999 },
  enterprise: { credits: 6179, amountINR: 9999 },
} as const;

export const CRYPTO_PACKAGES = {
  starter: { credits: 280, amountUSD: 4.99 },
  basic: { credits: 561, amountUSD: 10 },
  pro: { credits: 1684, amountUSD: 29.99 },
  studio: { credits: 3089, amountUSD: 55 },
  enterprise: { credits: 6179, amountUSD: 110 },
} as const;

export type PackageId = keyof typeof RAZORPAY_PACKAGES;

/**
 * Plan-based purchases — MUST match src/lib/plans.ts PLAN_CREDITS + DISPLAY_PRICES.
 * Derived at module load so public pricing page and PayPal/Razorpay never diverge.
 * Internal id "business" is the Master Studio tier (user-facing name only).
 */
export type PurchasablePlan = Exclude<PlanId, "free">;

function buildPlanPurchase(): Record<
  PurchasablePlan,
  { credits: number; amountINR: number; amountUSD: number }
> {
  const ids: PurchasablePlan[] = ["lite", "plus", "pro", "studio", "business"];
  const out = {} as Record<
    PurchasablePlan,
    { credits: number; amountINR: number; amountUSD: number }
  >;
  for (const id of ids) {
    out[id] = {
      credits: PLAN_CREDITS[id],
      amountUSD: DISPLAY_PRICES[id].USD,
      amountINR: DISPLAY_PRICES[id].INR,
    };
  }
  return out;
}

export const PLAN_PURCHASE = buildPlanPurchase();

/** Resolve plan id from a completed purchase (prefer metadata.plan; fallback unique credits). */
export function planFromCredits(credits: number): PurchasablePlan | null {
  const entry = Object.entries(PLAN_PURCHASE).find(([, p]) => p.credits === credits);
  return (entry?.[0] as PurchasablePlan) ?? null;
}

export function isPurchasablePlan(id: string | null | undefined): id is PurchasablePlan {
  return !!id && id in PLAN_PURCHASE;
}

export const ACCEPTED_COINS = ["usdtbsc", "btc", "eth"] as const;
export type AcceptedCoin = (typeof ACCEPTED_COINS)[number];

export const NP_API = process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";

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

export async function createNowPaymentsPayment(body: Record<string, unknown>) {
  const res = await fetch(`${NP_API}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...npHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NOWPayments payment failed (${res.status}): ${text}`);
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

function paypalApiBase() {
  return process.env.PAYPAL_API_URL || "https://api-m.paypal.com";
}

async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials are not configured");
  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

export async function createPaypalOrder(args: {
  amountUSD: number;
  referenceId: string;
  description: string;
}): Promise<{ id: string; status: string }> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.referenceId,
          custom_id: args.referenceId,
          description: args.description,
          amount: { currency_code: "USD", value: args.amountUSD.toFixed(2) },
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal order failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function capturePaypalOrder(orderId: string): Promise<any> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function verifyPaypalWebhook(
  headers: Record<string, string | null>,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }
  try {
    const token = await paypalAccessToken();
    const res = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

export function extractPaypalCaptureId(gatewayResponse: any): string | null {
  try {
    const pu = gatewayResponse?.purchase_units?.[0];
    const cap = pu?.payments?.captures?.[0];
    return cap?.id ?? gatewayResponse?.id ?? null;
  } catch {
    return null;
  }
}

export async function refundPaypalCapture(args: {
  captureId: string;
  amount: number;
  currency: string;
  note?: string;
}): Promise<{ id: string; status: string }> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalApiBase()}/v2/payments/captures/${args.captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { value: args.amount.toFixed(2), currency_code: args.currency || "USD" },
      note_to_payer: args.note || "Motio2edit Refund",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal refund failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function cancelPaypalSubscription(subscriptionId: string, reason: string): Promise<void> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalApiBase()}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason.slice(0, 120) }),
  });
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`PayPal subscription cancel failed (${res.status}): ${text}`);
  }
}
