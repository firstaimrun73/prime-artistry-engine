/**
 * Ultra enhanceToDeliveryResolution — isolated enhancement service.
 */

import { enhancementProfileFor } from "./profiles";
import { buildTopazPrecisionStep, type UltraEnhanceStep } from "./topaz";
import type { UltraQuality } from "../types";
import { ultraDeliveryDimensions } from "../model";

export type EnhanceInput = {
  sourceUrl: string;
  quality: UltraQuality;
  aspectRatio: string;
  runStep: (step: UltraEnhanceStep) => Promise<string>;
};

export type EnhanceResult = {
  finalUrl: string;
  finalWidth: number;
  finalHeight: number;
  enhancementModel: string;
  enhancementProfile: string;
  providerCostHintUsd: number;
};

/**
 * Enhance master → delivery resolution for 4K/8K/8K Max.
 * SD/HD/2K typically pass through (master already delivery-class).
 */
export async function enhanceToDeliveryResolution(
  input: EnhanceInput,
): Promise<EnhanceResult> {
  const profile = enhancementProfileFor(input.quality);
  const dims = ultraDeliveryDimensions(input.quality, input.aspectRatio);

  if (!profile.needsUpscale) {
    return {
      finalUrl: input.sourceUrl,
      finalWidth: dims.width,
      finalHeight: dims.height,
      enhancementModel: "none",
      enhancementProfile: profile.id,
      providerCostHintUsd: 0,
    };
  }

  const step = buildTopazPrecisionStep({
    imageUrl: input.sourceUrl,
    profile,
  });
  const url = await input.runStep(step);
  if (!url || !url.startsWith("http")) {
    throw new Error("Ultra enhancement returned no output URL.");
  }

  return {
    finalUrl: url,
    finalWidth: dims.width,
    finalHeight: dims.height,
    enhancementModel: step.model,
    enhancementProfile: profile.id,
    providerCostHintUsd: 0.08,
  };
}

export { enhancementProfileFor } from "./profiles";
export { buildTopazPrecisionStep } from "./topaz";
