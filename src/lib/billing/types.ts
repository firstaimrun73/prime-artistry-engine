/**
 * Motio2edit generation billing types.
 *
 * Provider COGS ≠ customer Motio2edit credits.
 * Final economics (margins, reserves, plan multipliers) are CONFIGURABLE
 * and will be finalized after cross-review (ChatGPT + Grok + Claude).
 * Do not hardcode final business prices into product code paths.
 */

export type BillingProduct =
  | "video"
  | "image_standard"
  | "image_premium"
  | "image_ultra"
  | "auto_edit"
  | "circle"
  | "music"
  | "lens"
  | "other";

export type QuoteStatus =
  | "quoted"
  | "reserved"
  | "generating"
  | "succeeded"
  | "finalized"
  | "failed"
  | "released"
  | "expired";

export type CreditBucket =
  | "purchased"
  | "bonus"
  | "daily"
  | "welcome"
  | "promotional"
  | "admin";

export type LedgerKind =
  | "purchase"
  | "welcome"
  | "daily"
  | "bonus"
  | "promotion"
  | "generation_reservation"
  | "generation_charge"
  | "generation_release"
  | "refund"
  | "admin_adjustment"
  | "subscription_renewal";

export type GenerationQuote = {
  quoteId: string;
  userId: string;
  product: BillingProduct;
  operation: string;
  provider: string;
  modelId: string;
  endpoint: string;
  mode?: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  audio?: boolean;
  /** Internal only — never show to normal users */
  providerCogsUsd: number;
  /** Customer-facing Motio2edit credits for this quote */
  customerCredits: number;
  pricingVersion: string;
  createdAt: string;
  expiresAt: string;
  status: QuoteStatus;
  reservationTxId?: string;
  finalCredits?: number;
  finalProviderCogsUsd?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type QuoteRequest = {
  userId: string;
  product: BillingProduct;
  operation: string;
  provider: string;
  modelId: string;
  endpoint: string;
  mode?: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  audio?: boolean;
  providerCogsUsd: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type InsufficientCreditsError = {
  code: "INSUFFICIENT_CREDITS";
  requiredCredits: number;
  availableCredits: number;
  shortfall: number;
  quoteId?: string;
};

export type BillingConfig = {
  creditFaceUsd: number;
  minRealizedCreditUsd: number;
  targetGrossMargin: number;
  operatingReserveUsd: number;
  roundingStep: number;
  productMinimumCredits: Partial<Record<BillingProduct, number>>;
  quoteTtlSeconds: number;
  pricingVersion: string;
};

/**
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 * These defaults are scaffolding only — change via config, not scattered code.
 */
export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  creditFaceUsd: 0.011,
  minRealizedCreditUsd: 0.0099,
  targetGrossMargin: 0.45,
  operatingReserveUsd: 0.05,
  roundingStep: 10,
  productMinimumCredits: {
    video: 75,
  },
  quoteTtlSeconds: 300,
  pricingVersion: "2026-09-scaffold-v1",
};
