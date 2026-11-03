/**
 * MotioCreditPricingEngine — provider COGS → Motio2edit credits (spend only).
 *
 * Image Studio spend: 1 credit face = 1.45¢
 * Video Studio spend: 1 credit = $0.01 (1¢) — staircase tiers (NOT COGS×100)
 *
 * 2026-11 profitability bump: +100 credits on every video staircase tier
 * (Minimax text-to-video and other high-COGS routes need healthier margin).
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

export const VIDEO_COGS_TIER_UNDEFINED = "VIDEO_COGS_TIER_UNDEFINED";

/**
 * Video customer-credit staircase (+100 vs prior table for margin).
 * TOTAL PROVIDER COGS (video + audio) → customer credits
 *
 * Before → After:
 *  <0.35 → 50 → 150
 *  <0.50 → 80 → 180
 *  <0.65 → 100 → 200
 *  <1.00 → 125 → 225
 *  <1.25 → 180 → 280
 *  <2.00 → 250 → 350
 */
export function videoCogsStaircaseCredits(totalProviderCogsUsd: number): number {
  const cogs = Math.max(0, totalProviderCogsUsd);
  if (cogs >= 2.0) {
    throw new Error(VIDEO_COGS_TIER_UNDEFINED);
  }
  if (cogs < 0.35) return 150;
  if (cogs < 0.5) return 180;
  if (cogs < 0.65) return 200;
  if (cogs < 1.0) return 225;
  if (cogs < 1.25) return 280;
  return 350;
}

export function videoCogsStaircaseLabel(totalProviderCogsUsd: number): string {
  const cogs = Math.max(0, totalProviderCogsUsd);
  if (cogs >= 2.0) return VIDEO_COGS_TIER_UNDEFINED;
  if (cogs < 0.35) return "150cr (<$0.35)";
  if (cogs < 0.5) return "180cr ($0.35–$0.50)";
  if (cogs < 0.65) return "200cr ($0.50–$0.65)";
  if (cogs < 1.0) return "225cr ($0.65–$1.00)";
  if (cogs < 1.25) return "280cr ($1.00–$1.25)";
  return "350cr ($1.25–$2.00)";
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

export function videoCogsToCredits(providerCogsUsd: number): number {
  return providerCogsToCustomerCredits(providerCogsUsd, "video").customerCredits;
}

export function imageCogsToCredits(
  providerCogsUsd: number,
  product: BillingProduct = "image_standard",
): number {
  return providerCogsToCustomerCredits(providerCogsUsd, product).customerCredits;
}
