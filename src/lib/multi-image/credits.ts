/**
 * Credit estimation for Multi-Image.
 *
 * Exact Multi-Image pricing matrix will be plugged in later from product blueprint.
 * Until then, estimate using the existing image quality tier cost × executable outputs.
 * Does not modify global plan pricing or payment infrastructure.
 */

import { imageQualityCost, type ImageQuality } from "@/lib/quality-options";
import type { MultiImageOutputCount } from "./types";
import { resolveExecutableOutputCount } from "./config";

export type MultiImageCreditEstimateInput = {
  quality: ImageQuality;
  requestedOutputCount: MultiImageOutputCount;
  modelId: string;
  /** Reserved for future matrix (e.g. per extra reference). */
  inputCount?: number;
};

export type MultiImageCreditEstimate = {
  /** Credits that would be charged with current rules */
  estimatedCredits: number;
  /** What the user asked for */
  requestedOutputCount: MultiImageOutputCount;
  /** What will actually be produced today */
  executableOutputCount: MultiImageOutputCount;
  /** True when estimate uses provisional (pre-blueprint) rules */
  provisional: true;
  note: string;
};

/**
 * Pluggable estimator. Replace body when Multi-Image credit matrix is defined.
 * Currently: imageQualityCost(quality) * executableOutputCount.
 */
export function estimateMultiImageCredits(
  input: MultiImageCreditEstimateInput,
): MultiImageCreditEstimate {
  const executableOutputCount = resolveExecutableOutputCount(
    input.requestedOutputCount,
    input.modelId,
  );
  const perOutput = imageQualityCost(input.quality);
  return {
    estimatedCredits: perOutput * executableOutputCount,
    requestedOutputCount: input.requestedOutputCount,
    executableOutputCount,
    provisional: true,
    note:
      "Provisional estimate using existing image quality credits. Final Multi-Image pricing matrix TBD.",
  };
}
