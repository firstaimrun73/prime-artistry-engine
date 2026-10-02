/**
 * Credit top-up packages — purchase packs (spend-side staircase is separate).
 *
 * Fixed packs (authoritative):
 *   $4.99 → 350 · $10 → 800 · $29.99 → 2,500 · $55 → 5,000 · $110 → 10,000
 *
 * Custom top-up (subscribers only): $2–$1,000 USD at 1 credit = $0.0178
 * (credits = floor(usd / 0.0178)).
 *
 * Video generation spend still uses the COGS staircase + $0.01 face — not this rate.
 */

export const CREDIT_RETAIL_USD = 0.0178;

/** Custom top-up face: 1 credit = $0.0178 */
export const CUSTOM_TOPUP_CREDIT_FACE_USD = 0.0178;
export const CUSTOM_TOPUP_MIN_USD = 2;
export const CUSTOM_TOPUP_MAX_USD = 1000;

export type CreditTopUpPack = {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  effectiveRate: number;
  discountLabel?: string;
  description: string;
};

export const CREDIT_TOPUP_PACKS: CreditTopUpPack[] = [
  {
    id: "topup-350",
    name: "Starter",
    credits: 350,
    priceUsd: 4.99,
    effectiveRate: 4.99 / 350,
    description: "350 credits · valid forever",
  },
  {
    id: "topup-800",
    name: "Plus",
    credits: 800,
    priceUsd: 10,
    effectiveRate: 10 / 800,
    discountLabel: "Better rate",
    description: "800 credits · regular creators",
  },
  {
    id: "topup-2500",
    name: "Pro",
    credits: 2500,
    priceUsd: 29.99,
    effectiveRate: 29.99 / 2500,
    discountLabel: "Best value",
    description: "2,500 credits · power users",
  },
  {
    id: "topup-5000",
    name: "Studio",
    credits: 5000,
    priceUsd: 55,
    effectiveRate: 55 / 5000,
    description: "5,000 credits · heavy use",
  },
  {
    id: "topup-10000",
    name: "Master",
    credits: 10000,
    priceUsd: 110,
    effectiveRate: 110 / 10000,
    description: "10,000 credits · teams & studios",
  },
];

/** Credits granted for a custom USD amount (subscribers only). */
export function customTopUpCredits(usd: number): number {
  const amount = Math.max(0, usd);
  if (amount < CUSTOM_TOPUP_MIN_USD || amount > CUSTOM_TOPUP_MAX_USD) {
    throw new Error(
      `Custom top-up must be between $${CUSTOM_TOPUP_MIN_USD} and $${CUSTOM_TOPUP_MAX_USD}.`,
    );
  }
  return Math.floor(amount / CUSTOM_TOPUP_CREDIT_FACE_USD);
}

/** Legacy single pack — maps to Starter for old checkout links. */
export const LEGACY_CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: 350,
  type: "one_time" as const,
  description: "350 AI credits, valid forever, works with any plan.",
  bullets: [
    "350 AI credits",
    "Valid forever (no expiry)",
    "Works with any plan",
    "Can be purchased multiple times",
  ],
} as const;
