/**
 * Credit purchase packs — 1 purchased credit = $0.0178 USD.
 * credits = floor(USD / 0.0178)
 *
 * Fixed pack prices (authoritative):
 *   $4.99 → 280 · $10 → 561 · $29.99 → 1,684 · $55 → 3,089 · $110 → 6,179
 *
 * Custom top-up (subscribers only): $2–$1,000, same rate.
 *
 * Video generation SPEND is separate: COGS staircase + $0.01 face.
 */

export const CREDIT_PURCHASE_FACE_USD = 0.0178;
/** @deprecated alias — use CREDIT_PURCHASE_FACE_USD */
export const CREDIT_RETAIL_USD = CREDIT_PURCHASE_FACE_USD;
export const CUSTOM_TOPUP_CREDIT_FACE_USD = CREDIT_PURCHASE_FACE_USD;
export const CUSTOM_TOPUP_MIN_USD = 2;
export const CUSTOM_TOPUP_MAX_USD = 1000;

export type CreditTopUpPack = {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  /** INR list price for Razorpay (approx). */
  priceInr: number;
  effectiveRate: number;
  discountLabel?: string;
  description: string;
};

/** Server-authoritative: never trust client-supplied credit counts. */
export function creditsFromUsd(usd: number): number {
  const amount = Math.max(0, Number(usd) || 0);
  return Math.floor(amount / CREDIT_PURCHASE_FACE_USD);
}

export function customTopUpCredits(usd: number): number {
  if (usd < CUSTOM_TOPUP_MIN_USD || usd > CUSTOM_TOPUP_MAX_USD) {
    throw new Error(
      `Custom top-up must be between $${CUSTOM_TOPUP_MIN_USD} and $${CUSTOM_TOPUP_MAX_USD}.`,
    );
  }
  return creditsFromUsd(usd);
}

const PACK_PRICES_USD = [4.99, 10, 29.99, 55, 110] as const;
const PACK_NAMES = ["Starter", "Plus", "Pro", "Studio", "Master"] as const;
/** Approximate INR for Razorpay (marketing list; server charges these paise). */
const PACK_PRICES_INR = [449, 899, 2699, 4999, 9999] as const;

export const CREDIT_TOPUP_PACKS: CreditTopUpPack[] = PACK_PRICES_USD.map((priceUsd, i) => {
  const credits = creditsFromUsd(priceUsd);
  return {
    id: `topup-${credits}`,
    name: PACK_NAMES[i],
    credits,
    priceUsd,
    priceInr: PACK_PRICES_INR[i],
    effectiveRate: CREDIT_PURCHASE_FACE_USD,
    discountLabel: i >= 2 ? "Best value" : i === 1 ? "Popular" : undefined,
    description: `${credits.toLocaleString()} credits · $${priceUsd.toFixed(2)} · valid forever`,
  };
});

/** Lookup pack by id; credits always recomputed from price. */
export function getTopUpPack(packId: string): CreditTopUpPack | null {
  const pack = CREDIT_TOPUP_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  // Re-assert credits from face rate (authoritative)
  return { ...pack, credits: creditsFromUsd(pack.priceUsd) };
}

/** Legacy single pack for old checkout links. */
export const LEGACY_CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: creditsFromUsd(4.99),
  type: "one_time" as const,
  description: `${creditsFromUsd(4.99)} AI credits, valid forever, works with any plan.`,
  bullets: [
    `${creditsFromUsd(4.99)} AI credits`,
    "Valid forever (no expiry)",
    "Works with any plan",
    "Can be purchased multiple times",
  ],
} as const;
