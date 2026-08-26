/**
 * Isolated Ultra provider-cost estimates (USD).
 * Configurable constants — do not scatter prices elsewhere.
 */

import type { UltraMode, UltraQuality, UltraProviderCostEstimate } from "./types";
import { ultraMasterMegapixels } from "./model";

/** Motio2edit customer credit value (from generation-cost-registry). */
export const ULTRA_CREDIT_CUSTOMER_USD = 4 / 350; // ≈ 0.01142857

export const ultraPricingConfig = {
  /** Seedream ≤1536² output. */
  seedreamBaseLowUsd: 0.0675,
  /** Seedream 1536²–2048² output. */
  seedreamBaseHighUsd: 0.135,
  /** Extra input image after the first. */
  seedreamExtraRefUsd: 0.0045,
  /** Flux 2 Pro: $0.03 first MP + $0.015 extra MP (rounded up). */
  flux2ProFirstMpUsd: 0.03,
  flux2ProExtraMpUsd: 0.015,
  /** Topaz Precision: $0.08 per 24 MP of output. */
  topazPer24MpUsd: 0.08,
  topazMpBucket: 24,
} as const;

function fluxCostForMp(mp: number): number {
  const units = Math.max(1, Math.ceil(mp));
  if (units <= 1) return ultraPricingConfig.flux2ProFirstMpUsd;
  return (
    ultraPricingConfig.flux2ProFirstMpUsd +
    (units - 1) * ultraPricingConfig.flux2ProExtraMpUsd
  );
}

function topazCostForOutputMp(mp: number): number {
  if (mp <= 0) return 0;
  const buckets = Math.max(1, Math.ceil(mp / ultraPricingConfig.topazMpBucket));
  return buckets * ultraPricingConfig.topazPer24MpUsd;
}

/** Approximate delivery MP for enhancement cost. */
function deliveryMp(quality: UltraQuality): number {
  switch (quality) {
    case "sd":
      return 0.25;
    case "hd":
      return 1;
    case "2k":
      return 2;
    case "4k":
      return 8;
    case "8k":
    case "8k_max":
      return 33;
  }
}

function needsEnhancement(quality: UltraQuality): boolean {
  return quality === "4k" || quality === "8k" || quality === "8k_max";
}

/**
 * Estimate provider USD for an Ultra job (generation + refs + enhance).
 */
export function estimateUltraProviderCost(opts: {
  mode: UltraMode;
  quality: UltraQuality;
  referenceCount: number;
}): UltraProviderCostEstimate {
  const { mode, quality, referenceCount: n } = opts;
  let generationUsd = 0;
  let referenceUsd = 0;
  let enhancementUsd = 0;

  if (mode === "multi_image") {
    const high =
      quality === "hd" ||
      quality === "2k" ||
      quality === "4k" ||
      quality === "8k" ||
      quality === "8k_max";
    generationUsd = high
      ? ultraPricingConfig.seedreamBaseHighUsd
      : ultraPricingConfig.seedreamBaseLowUsd;
    const extra = Math.max(0, n - 1);
    referenceUsd = extra * ultraPricingConfig.seedreamExtraRefUsd;
  } else {
    const masterMp = ultraMasterMegapixels(quality);
    generationUsd = fluxCostForMp(masterMp);
    if (mode === "image_to_image") {
      generationUsd += fluxCostForMp(Math.min(masterMp, 4));
    }
  }

  if (needsEnhancement(quality)) {
    enhancementUsd = topazCostForOutputMp(deliveryMp(quality));
    if (quality === "8k_max") {
      enhancementUsd *= 1.25;
    }
  }

  const totalUsd = generationUsd + referenceUsd + enhancementUsd;
  return {
    generationUsd,
    referenceUsd,
    enhancementUsd,
    totalUsd,
    breakdown: `gen $${generationUsd.toFixed(4)} + refs $${referenceUsd.toFixed(4)} + enhance $${enhancementUsd.toFixed(4)} = $${totalUsd.toFixed(4)}`,
  };
}

export function ultraCustomerValueUsd(credits: number): number {
  return credits * ULTRA_CREDIT_CUSTOMER_USD;
}

export function ultraGrossMarginUsd(credits: number, providerUsd: number): number {
  return ultraCustomerValueUsd(credits) - providerUsd;
}

/** True when margin is dangerously thin or negative (block, do not downgrade). */
export function isUltraEconomicallyUnsafe(
  credits: number,
  providerUsd: number,
): boolean {
  const margin = ultraGrossMarginUsd(credits, providerUsd);
  return margin < ultraCustomerValueUsd(credits) * 0.2;
}
