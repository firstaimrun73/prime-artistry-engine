/**
 * Auto Edit credit estimates — uses existing imageQualityCost.
 * Standalone Motio2edit Auto performs exactly ONE generateMedia call,
 * so charge = one image generation at the selected quality (HD/2K/4K).
 * Actual deduction happens only inside generateMedia.
 */

import { imageQualityCost, type ImageQuality } from "@/lib/quality-options";

export function estimateAutoEditCredits(
  _operationCount: number,
  quality: ImageQuality,
): {
  perOperation: number;
  total: number;
  operationCount: number;
  note: string;
} {
  const perOperation = imageQualityCost(quality);
  return {
    perOperation,
    total: perOperation,
    operationCount: 1,
    note: `Standalone Auto Edit = one image generation (${perOperation} credits at ${quality}). Matched improvements do not multiply the charge.`,
  };
}
