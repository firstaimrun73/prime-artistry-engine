/**
 * Credit top-up packages (Video Studio blueprint §2.5).
 * Retail anchor: $0.004 / credit.
 */

export const CREDIT_RETAIL_USD = 0.004;

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
    id: "topup-starter-300",
    name: "Starter",
    credits: 300,
    priceUsd: 1.2,
    effectiveRate: 0.004,
    description: "300 credits · ~2× 5s Standard videos",
  },
  {
    id: "topup-standard-1000",
    name: "Standard",
    credits: 1000,
    priceUsd: 3.8,
    effectiveRate: 0.0038,
    discountLabel: "5% off",
    description: "1,000 credits · best for regular use",
  },
  {
    id: "topup-pro-3000",
    name: "Pro",
    credits: 3000,
    priceUsd: 10.8,
    effectiveRate: 0.0036,
    discountLabel: "10% off",
    description: "3,000 credits · power users",
  },
  {
    id: "topup-studio-10000",
    name: "Studio",
    credits: 10000,
    priceUsd: 32,
    effectiveRate: 0.0032,
    discountLabel: "20% off",
    description: "10,000 credits · teams & heavy video",
  },
];

/** Legacy single pack still referenced by checkout — maps to nearest blueprint pack. */
export const LEGACY_CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: 320,
  type: "one_time" as const,
  description: "320 AI credits, valid forever, works with any plan.",
  bullets: [
    "320 AI credits",
    "Valid forever (no expiry)",
    "Works with any plan",
    "≈ 12 image edits at 25 credits each",
    "Can be purchased multiple times",
  ],
} as const;
