/**
 * Auto Edit — product constants (Gemini Flash Lite vision + FLUX Kontext LoRA).
 *
 * Pipeline (fal.ai only, FAL_API_KEY):
 *   1) fal-ai/any-llm/vision (google/gemini-2.5-flash-lite)
 *   2) fal-ai/flux-kontext-lora — single-image edit
 *   3) watermark / finalize → charge once
 *
 * Product: Maluto AI (HD only, max 2MP input — enforced client-side, not shown in chrome)
 */

/** Auto Edit quality tiers. Maluto AI is HD-capped in product UI. */
export type AutoEditQuality = "sd" | "hd" | "2k" | "4k" | "8k" | "8k_max";

/** Target megapixels by quality (billing / history targets). */
export const AUTO_EDIT_TARGET_MP: Record<AutoEditQuality, number> = {
  sd: 1,
  hd: 2,
  "2k": 2,
  "4k": 3,
  "8k": 4,
  "8k_max": 6,
};

/**
 * Total Auto Edit credits by quality.
 * Debit flows through @/lib/billing lifecycle.
 */
export const AUTO_EDIT_CREDITS_BY_QUALITY: Record<AutoEditQuality, number> = {
  sd: 45,
  hd: 45,
  "2k": 50,
  "4k": 60,
  "8k": 60,
  "8k_max": 65,
};

/** @deprecated Prefer autoEditCreditCost(quality). HD default. */
export const AUTO_EDIT_CREDIT_COST = AUTO_EDIT_CREDITS_BY_QUALITY.hd;

export function autoEditCreditCost(quality: AutoEditQuality = "hd"): number {
  return AUTO_EDIT_CREDITS_BY_QUALITY[quality] ?? AUTO_EDIT_CREDIT_COST;
}

export function autoEditTargetMegapixels(quality: AutoEditQuality = "hd"): number {
  return AUTO_EDIT_TARGET_MP[quality] ?? 2;
}

/** Vision analysis on fal only. */
export const AUTO_EDIT_VISION_MODEL = "fal-ai/any-llm/vision" as const;
export const AUTO_EDIT_VISION_LLM = "google/gemini-2.5-flash-lite" as const;

/** Primary edit model — FLUX Kontext LoRA. */
export const AUTO_EDIT_FAL_MODEL = "fal-ai/flux-kontext-lora" as const;

/** Default watermark position metadata (server stamp applies it). */
export const AUTO_EDIT_WATERMARK_POSITION = "bottom-right" as const;

/** Product name shown in UI. */
export const AUTO_EDIT_PRODUCT_NAME = "Maluto AI" as const;

/** Public chrome version label + history metadata. */
export const AUTO_EDIT_PRODUCT_VERSION = "1.8" as const;

/** Max input pixels for Maluto (2MP). */
export const MALUTO_MAX_INPUT_PIXELS = 2_000_000;

export const AUTO_EDIT_PIPELINE_STATES = [
  "QUEUED",
  "ANALYSING",
  "EDITING",
  "FINALISING",
  "DONE",
  "FAILED",
] as const;

export type AutoEditPipelineState = (typeof AUTO_EDIT_PIPELINE_STATES)[number];

export function labelIssue(issue: string): string {
  const key = (issue || "").trim();
  if (!key) return "Issue";
  if (/^[a-z0-9_\-]+$/i.test(key) && /[_\-]/.test(key)) {
    return key
      .replace(/[_\-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function labelImprovement(action: string): string {
  const key = (action || "").trim();
  if (!key) return "Improvement";
  if (/^[a-z0-9_\-]+$/i.test(key) && /[_\-]/.test(key)) {
    return key
      .replace(/[_\-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}
