/**
 * MotioCreditPricingEngine — provider COGS → Motio2edit credits (spend only).
 *
 * Universal Motio2edit credits wallet. Purchase pack pricing is separate.
 *
 * Image Studio spend: 1 credit face = 1.45¢
 * Video Studio spend: 1 credit = $0.01 (1¢) — staircase tiers below (NOT COGS×100)
 *
 * Video customer pricing is an exact COGS staircase (owner-defined).
 * Do NOT use percentage margin, COGS×4, or COGS×100 for Video.
 */

import {
  DEFAULT_BILLING_CONFIG,
  type BillingConfig,
  type BillingProduct,
} from "./types";

export type CustomerCreditQuote = {
  customerCredits: number;
  providerCogsUsd: number;
  requiredRetailUsd: number;
  pricingVersion: string;
  appliedMinimum: boolean;
  creditFaceCents: number;
  breakdown: {
    providerCogsUsd: number;
    providerCogsCents: number;
    creditFaceCents: number;
    rawCredits: number;
    roundedCredits: number;
    productMinimum: number;
    formula: string;
    videoTierLabel?: string;
  };
};

/** Thrown / returned when Video total provider COGS is $2.00 or higher. */
export const VIDEO_COGS_TIER_UNDEFINED = "VIDEO_COGS_TIER_UNDEFINED";

/**
 * Authoritative Video customer-credit staircase.
 * Boundaries are exact; no gaps, no overlaps, no fallback tier.
 *
 * TOTAL PROVIDER COGS (video + audio) → customer credits
 */
export function videoCogsStaircaseCredits(totalProviderCogsUsd: number): number {
  const cogs = Math.max(0, totalProviderCogsUsd);
  if (cogs >= 2.0) {
    throw new Error(VIDEO_COGS_TIER_UNDEFINED);
  }
  if (cogs < 0.35) return 50;
  if (cogs < 0.5) return 80;
  if (cogs < 0.65) return 100;
  if (cogs < 1.0) return 125;
  if (cogs < 1.25) return 180;
  // 1.25 ≤ cogs < 2.00
  return 250;
}

export function videoCogsStaircaseLabel(totalProviderCogsUsd: number): string {
  const cogs = Math.max(0, totalProviderCogsUsd);
  if (cogs >= 2.0) return VIDEO_COGS_TIER_UNDEFINED;
  if (cogs < 0.35) return "50cr (<$0.35)";
  if (cogs < 0.5) return "80cr ($0.35–$0.50)";
  if (cogs < 0.65) return "100cr ($0.50–$0.65)";
  if (cogs < 1.0) return "125cr ($0.65–$1.00)";
  if (cogs < 1.25) return "180cr ($1.00–$1.25)";
  return "250cr ($1.25–$2.00)";
}

function isImageProduct(product: BillingProduct): boolean {
  return (
    product === "image_standard" ||
    product === "image_premium" ||
    product === "image_ultra" ||
    product === "auto_edit" ||
    product === "circle"
  );
}

/**
 * Convert fal/provider COGS (USD) → Motio2edit credits to deduct on spend.
 * Video uses the owner staircase. Image retains its own face value.
 */
export function providerCogsToCustomerCredits(
  providerCogsUsd: number,
  product: BillingProduct,
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): CustomerCreditQuote {
  const cogs = Math.max(0, providerCogsUsd);
  const cogsCents = cogs * 100;
  const productMinimum = config.productMinimumCredits[product] ?? 0;

  let rawCredits: number;
  let creditFaceCents: number;
  let formula: string;
  let videoTierLabel: string | undefined;

  if (product === "video") {
    // Video: exact staircase on TOTAL provider COGS (includes audio when present).
    // Face value for display/accounting: 1 credit = $0.01
    creditFaceCents = (config.videoCreditFaceUsd ?? 0.01) * 100;
    try {
      rawCredits = videoCogsStaircaseCredits(cogs);
      videoTierLabel = videoCogsStaircaseLabel(cogs);
      formula = `video staircase: ${videoTierLabel}; face 1¢/credit`;
    } catch (e) {
      if (e instanceof Error && e.message === VIDEO_COGS_TIER_UNDEFINED) {
        throw e;
      }
      throw e;
    }
  } else if (isImageProduct(product)) {
    const faceUsd = config.imageCreditFaceUsd ?? 0.0145;
    creditFaceCents = faceUsd * 100;
    rawCredits = faceUsd > 0 ? cogs / faceUsd : cogsCents;
    formula = "image: ceil(cogs_usd / 0.0145) credits; face 1.45¢/credit";
  } else {
    creditFaceCents = (config.creditFaceUsd ?? 0.01) * 100;
    rawCredits = cogsCents;
    formula = "default: ceil(cogs_usd × 100)";
  }

  const step = Math.max(1, config.roundingStep ?? 1);
  let roundedCredits: number;
  if (product === "video") {
    // Staircase already returns exact tier credits — do not re-round or apply old minimums.
    roundedCredits = rawCredits;
  } else {
    roundedCredits = Math.max(step, Math.ceil(rawCredits / step) * step);
  }
  const appliedMinimum =
    product !== "video" && roundedCredits < productMinimum;
  const customerCredits = appliedMinimum ? productMinimum : roundedCredits;

  return {
    customerCredits,
    providerCogsUsd: +cogs.toFixed(6),
    requiredRetailUsd: +(customerCredits * (creditFaceCents / 100)).toFixed(6),
    pricingVersion: config.pricingVersion,
    appliedMinimum,
    creditFaceCents,
    breakdown: {
      providerCogsUsd: +cogs.toFixed(6),
      providerCogsCents: +cogsCents.toFixed(4),
      creditFaceCents,
      rawCredits: +rawCredits.toFixed(4),
      roundedCredits,
      productMinimum: product === "video" ? 0 : productMinimum,
      formula,
      videoTierLabel,
    },
  };
}

/** Convenience: video-only COGS → credits (staircase). Throws VIDEO_COGS_TIER_UNDEFINED at $2+. */
export function videoCogsToCredits(providerCogsUsd: number): number {
  return providerCogsToCustomerCredits(providerCogsUsd, "video").customerCredits;
}

/** Convenience: image-only COGS → credits. */
export function imageCogsToCredits(
  providerCogsUsd: number,
  product: BillingProduct = "image_standard",
): number {
  return providerCogsToCustomerCredits(providerCogsUsd, product).customerCredits;
}
