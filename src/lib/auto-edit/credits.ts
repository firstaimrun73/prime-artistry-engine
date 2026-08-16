/**
 * Auto Edit credit estimates — uses existing imageQualityCost.
 * Actual charges happen only via generateMedia (existing system).
 *
 * Product target messaging may say ~35 credits for a typical Auto Edit.
 * Actual deduction is per successful generateMedia call:
 *   HD = 25, 2K = 40, 4K = 60 (see quality-options.ts).
 * Multi-step plans therefore cost (per-op cost × selected operations).
 * UI should show this estimate; do not invent a parallel deduction.
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
    note:
      n <= 1
        ? `Charged via existing image generation (${perOperation} credits at ${quality}). Product “~35 credits” messaging is approximate for multi-step runs.`
        : `Each of the ${n} operations uses the existing image generation charge (${perOperation} credits at ${quality}). Total estimate ${perOperation * n}. No separate Auto Edit ledger.`,
  };
}
