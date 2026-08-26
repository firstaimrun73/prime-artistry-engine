/**
 * Ultra AI end-to-end execute: validate → quote → gen → enhance.
 * Credits are NOT deducted here (caller owns transaction).
 */

import { quoteUltraCredits } from "./credits";
import { enhanceToDeliveryResolution } from "./enhance";
import {
  estimateUltraProviderCost,
  isUltraEconomicallyUnsafe,
} from "./provider-cost";
import {
  assertSeedreamBodySafe,
  buildUltraGenerationStep,
} from "./request";
import { validateUltraImageRequest } from "./validation";
import type {
  UltraExecuteResult,
  UltraFalStep,
  UltraImageRequest,
} from "./types";
import { ULTRA_SEEDREAM_EDIT } from "./model";

export type UltraExecuteOptions = {
  falKey: string;
  runStep: (step: UltraFalStep) => Promise<string>;
};

export async function executeUltraImage(
  raw: UltraImageRequest,
  opts: UltraExecuteOptions,
): Promise<UltraExecuteResult> {
  const validated = validateUltraImageRequest(raw);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const quote = quoteUltraCredits({
    mode: validated.mode,
    quality: validated.quality,
    referenceCount: validated.referenceCount,
  });

  const provider = estimateUltraProviderCost({
    mode: validated.mode,
    quality: validated.quality,
    referenceCount: validated.referenceCount,
  });

  if (isUltraEconomicallyUnsafe(quote.credits, provider.totalUsd)) {
    throw new Error(
      "Ultra AI is temporarily unavailable for this configuration.",
    );
  }

  const genStep = buildUltraGenerationStep(validated);
  if (genStep.model === ULTRA_SEEDREAM_EDIT) {
    assertSeedreamBodySafe(genStep.body);
  }

  const masterUrl = await opts.runStep(genStep);
  if (!masterUrl || !masterUrl.startsWith("http")) {
    throw new Error("Ultra generation returned no output. Credits not charged.");
  }

  let finalUrl = masterUrl;
  let enhancementModel: string | undefined;
  let enhancementProfile: string | undefined;
  let outputWidth: number | undefined;
  let outputHeight: number | undefined;

  try {
    const enhanced = await enhanceToDeliveryResolution({
      sourceUrl: masterUrl,
      quality: validated.quality,
      aspectRatio: validated.aspectRatio,
      runStep: opts.runStep,
    });
    finalUrl = enhanced.finalUrl;
    enhancementModel = enhanced.enhancementModel;
    enhancementProfile = enhanced.enhancementProfile;
    outputWidth = enhanced.finalWidth;
    outputHeight = enhanced.finalHeight;
  } catch (e) {
    if (
      validated.quality === "4k" ||
      validated.quality === "8k" ||
      validated.quality === "8k_max"
    ) {
      throw new Error(
        e instanceof Error
          ? `${e.message} — Ultra enhancement failed. Credits not charged.`
          : "Ultra enhancement failed. Credits not charged.",
      );
    }
  }

  return {
    outputUrl: finalUrl,
    mode: validated.mode,
    model: genStep.model,
    quality: validated.quality,
    aspectRatio: validated.aspectRatio,
    referenceCount: validated.referenceCount,
    credits: quote.credits,
    estimatedProviderCostUsd: provider.totalUsd,
    enhancementModel,
    enhancementProfile,
    outputWidth,
    outputHeight,
  };
}
