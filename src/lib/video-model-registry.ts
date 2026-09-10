/**
 * COMPATIBILITY SHIM — Video model registry
 *
 * Authoritative implementation lives in:
 *   @/lib/video/video-capability-registry
 *
 * This file re-exports the new capability-driven registry so existing
 * imports continue to compile during the migration.
 *
 * DO NOT add new Standard/Premium model pools here.
 * DO NOT add client-trusted pricing tables here.
 * Server quote engine is the only credit authority.
 *
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 */

export {
  type VideoGenMode,
  type VideoProductMode,
  type VideoTier,
  type VideoResolution,
  type VideoAspect,
  type VideoModelDef,
  type PricingFormula,
  type SelectVideoRouteInput,
  type SelectVideoRouteResult,
  VIDEO_REGISTRY_VERSION,
  PRODUCT_DURATIONS_STANDARD,
  PRODUCT_DURATIONS_PREMIUM,
  USER_MAX_DURATION_SEC,
  APPROVED_VIDEO_MODELS,
  BLOCKED_ENDPOINT_PREFIXES,
  resolutionUiLabel,
  qualityShortLabel,
  getApprovedModel,
  isEndpointBlocked,
  computeProviderCogsUsd,
  selectApprovedVideoRoute,
  capabilitiesForMode,
  uiOptionsFor,
  availableMaxDurationFor,
  promptMentionsAudio,
} from "@/lib/video/video-capability-registry";

/** @deprecated Legacy aliases — prefer VideoProductMode */
export type VideoModelTierSection = "standard" | "premium";

/** @deprecated Product duration ceilings — use PRODUCT_DURATIONS_* */
export const PRODUCT_VIDEO_DURATIONS = [5, 10, 15] as const;

/**
 * @deprecated Client must never be the credit authority.
 * These constants remain only for temporary compatibility with old UI estimates.
 * Real charge comes from server quote / MotioCreditPricingEngine.
 */
export const CREDIT_RETAIL_USD = 0.011;
export const MIN_VIDEO_CREDITS = 75;
export const MIN_VIDEO_CREDITS_SOUND = 90;
export const MIN_PREMIUM_VIDEO_CREDITS = 100;
export const MIN_PREMIUM_VIDEO_CREDITS_SOUND = 120;
export const MIN_VIDEO_TO_VIDEO_CREDITS = 100;
export const MIN_VIDEO_TO_VIDEO_CREDITS_SOUND = 130;
export const MAX_4K_DURATION_SEC = 0;

export function is4kDurationLocked(
  _durationSec: number,
  _resolution: string,
): boolean {
  return false;
}

export function roundVideoCredits(n: number, step = 10): number {
  if (!Number.isFinite(n) || n <= 0) return step;
  return Math.max(step, Math.ceil(n / step) * step);
}

/**
 * @deprecated Estimate only — never authoritative.
 * Prefer server quoteVideoGeneration / createGenerationQuote.
 */
export function estimateModelCredits(_opts: {
  durationSec?: number;
  resolution?: string;
  audio?: boolean;
  tier?: string;
  mode?: string;
}): number {
  return MIN_VIDEO_CREDITS;
}
