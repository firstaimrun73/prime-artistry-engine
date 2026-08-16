/**
 * Auto Edit credit estimates — uses existing imageQualityCost.
 * Actual charges happen only via generateMedia (existing system).
 */

import { imageQualityCost, type ImageQuality } from "@/lib/quality-options";

export function estimateAutoEditCredits(
  operationCount: number,
  quality: ImageQuality,
): {
  perOperation: number;
  total: number;
  operationCount: number;
  note: string;
} {
  const perOperation = imageQualityCost(quality);
  const n = Math.max(0, operationCount);
  return {
    perOperation,
    total: perOperation * n,
    operationCount: n,
    note: "Each operation uses the existing image generation charge for the selected quality.",
  };
}
