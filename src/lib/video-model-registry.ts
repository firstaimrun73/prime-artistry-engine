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

/** @deprecated Legacy style modifiers — keep for prompt enrichment only */
export const VIDEO_STYLE_MODIFIERS: Record<string, string> = {
  classic: "classic film look, natural color grading",
  retro: "retro 1980s aesthetic, soft grain, warm tones",
  vintage: "vintage film stock, faded colors, subtle scratches",
  cinematic: "cinematic lighting, anamorphic lens, shallow depth of field",
  documentary: "documentary style, handheld feel, natural light",
  anime: "anime style, clean lines, vibrant colors",
  film: "35mm film photography look, rich contrast",
  product: "product commercial, clean studio lighting, sharp detail",
  social: "vertical social media style, bold colors, energetic",
};

export function applyVideoStyle(prompt: string, styleId: string | null | undefined): string {
  if (!styleId || !VIDEO_STYLE_MODIFIERS[styleId]) return prompt;
  const mod = VIDEO_STYLE_MODIFIERS[styleId];
  const p = prompt.trim();
  if (!p) return mod;
  if (p.toLowerCase().includes(mod.split(",")[0].toLowerCase())) return p;
  return `${p}. ${mod}.`;
}

/** @deprecated Use getApprovedModel */
export function getVideoModel(id: string) {
  return getApprovedModel(id);
}

/** Compatibility: UI capability snapshot by product tier (mode-agnostic durations). */
export function capabilitiesForTier(productMode: VideoProductMode | VideoTier, _mode?: VideoGenMode) {
  return capabilitiesForMode(productMode as VideoProductMode);
}

/**
 * Compatibility wrapper used by Video Studio UI.
 * Prefer selectApprovedVideoRoute for new code.
 */
export function selectVideoModel(opts: {
  mode: VideoGenMode;
  tier: VideoProductMode | VideoTier;
  durationSec: number;
  resolution: VideoResolution;
  aspect: VideoAspect;
  soundOn: boolean;
}): { id: string; nativeAudio: boolean; endpoint: string } | null {
  const route = selectApprovedVideoRoute({
    mode: opts.mode,
    productMode: opts.tier as VideoProductMode,
    durationSec: opts.durationSec,
    resolution: opts.resolution,
    aspect: opts.aspect,
    audio: opts.soundOn,
  });
  if (!route) return null;
  return {
    id: route.model.id,
    nativeAudio: !!route.model.nativeAudio,
    endpoint: route.endpoint,
  };
}

/** Message when no approved route matches current UI settings. */
export function videoSelectionUnavailableMessage(_opts?: unknown): string {
  return "This combination isn't available right now. Try a shorter duration or lower quality.";
}

export function availableMaxDurationForTierMode(
  productMode: VideoProductMode | VideoTier,
  mode: VideoGenMode,
): number {
  try {
    return availableMaxDurationFor(productMode as VideoProductMode, "720p", false);
  } catch {
    return productMode === "premium" ? 15 : 10;
  }
}
