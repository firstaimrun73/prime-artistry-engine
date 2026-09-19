/**
 * MotioCreditPricingEngine — provider COGS → Motio2edit credits (spend only).
 *
 * Universal Motio2edit credits wallet. Purchase pack pricing is separate.
 *
 * Image Studio spend: 1 credit face = 1.45¢
 * Video Studio spend: 1 credit face = 1.86¢
 *
 * Video charge rule (owner-defined):
 *   credits = max(productMinimum, ceil(provider_cogs_usd × videoCreditsPerUsd))  // 180
 *   Example: fal COGS $0.25 → 45 credits after successful delivery.
 *
 * Image charge rule:
 *   credits = max(productMinimum, ceil(provider_cogs_usd / 0.0145))
 *   (1 credit covers 1.45¢ of backend cost)
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
  };
};

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

  if (product === "video") {
    // Phase 3: credits = ceil(cogs_usd × videoCreditsPerUsd), min productMinimum (25)
    const perUsd = config.videoCreditsPerUsd ?? 180;
    creditFaceCents = (config.videoCreditFaceUsd ?? 0.0186) * 100;
    rawCredits = cogs * perUsd;
    formula = `video: ceil(cogs_usd × ${perUsd}) credits; face 1.86¢/credit`;
  } else if (isImageProduct(product)) {
    // 1 credit covers 1.45¢ of backend cost
    const faceUsd = config.imageCreditFaceUsd ?? 0.0145;
    creditFaceCents = faceUsd * 100;
    rawCredits = faceUsd > 0 ? cogs / faceUsd : cogsCents;
    formula = "image: ceil(cogs_usd / 0.0145) credits; face 1.45¢/credit";
  } else {
    creditFaceCents = (config.creditFaceUsd ?? 0.0186) * 100;
    rawCredits = cogsCents;
    formula = "default: ceil(cogs_usd × 100)";
  }

  const step = Math.max(1, config.roundingStep ?? 1);
  const roundedCredits = Math.max(step, Math.ceil(rawCredits / step) * step);
  const appliedMinimum = roundedCredits < productMinimum;
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
      productMinimum,
      formula,
    },
  };
}

/** Convenience: video-only COGS → credits (same engine). */
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
