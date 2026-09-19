/**
 * Motio2edit generation billing types.
 *
 * Universal Motio2edit credits across all studios.
 * Spend conversion (NOT purchase pricing):
 *   Image Studio: 1 credit face = 1.45¢  ($0.0145)
 *   Video Studio: 1 credit face = 1.86¢  ($0.0186)
 *
 * Video spend rule (Phase 3 owner-defined):
 *   credits = max(50, ceil(provider_cogs_usd * videoCreditsPerUsd))
 *   videoCreditsPerUsd = 180  e.g. $0.25 → 45 credits, $0.50 → 90 credits.
 * Purchase pack pricing is separate and unchanged by these face values.
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
  /** Display / accounting face value of 1 Motio2edit credit in USD (spend side) */
  creditFaceUsd: number;
  /** Image Studio spend face value (1 credit = 1.45¢) */
  imageCreditFaceUsd: number;
  /** Video Studio spend face value (1 credit = 1.86¢) */
  videoCreditFaceUsd: number;
  /** Motio2edit credits per $1 of provider COGS for video (Phase 3). */
  videoCreditsPerUsd: number;
  minRealizedCreditUsd: number;
  targetGrossMargin: number;
  operatingReserveUsd: number;
  roundingStep: number;
  productMinimumCredits: Partial<Record<BillingProduct, number>>;
  quoteTtlSeconds: number;
  pricingVersion: string;
};

/**
 * Spend-side Motio2edit credit economics (universal wallet).
 * Does NOT change how users purchase credit packs.
 *
 * Video: 1 Motio2edit credit = 1.86¢ face; charge = max(50, ceil(fal_cogs_usd × 180))
 * Image: 1 Motio2edit credit = 1.45¢ face
 */
export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  creditFaceUsd: 0.0186,
  imageCreditFaceUsd: 0.0145,
  videoCreditFaceUsd: 0.0186,
  videoCreditsPerUsd: 180,
  minRealizedCreditUsd: 0.0186,
  targetGrossMargin: 0,
  operatingReserveUsd: 0,
  roundingStep: 1,
  productMinimumCredits: {
    video: 50,
    image_standard: 10,
    image_premium: 15,
  },
  quoteTtlSeconds: 300,
  pricingVersion: "2026-09-motio-spend-v1",
};

/** Video Studio: 1 credit = 1.86¢ (spend accounting only) */
export const VIDEO_CREDIT_FACE_CENTS = 1.86;
/** Image Studio: 1 credit = 1.45¢ (spend accounting only) */
export const IMAGE_CREDIT_FACE_CENTS = 1.45;
