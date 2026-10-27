/**
 * Auto Edit — product constants (Gemini Flash Lite vision + FLUX Kontext LoRA).
 *
 * Pipeline (fal.ai only, FAL_API_KEY):
 *   1) fal-ai/any-llm/vision (google/gemini-2.5-flash-lite) — analyse + decide + final_edit_prompt
 *   2) fal-ai/flux-kontext-lora — single-image edit with that prompt
 *   3) watermark / finalize → charge once
 *
 * Product: Maluto AI 1.8
 * Free-tier users receive one complimentary generation per account (server-enforced).
 * Subsequent generations: 40 credits (product policy).
 */

/** Auto Edit quality tiers (includes backend-only 8k_max). */
export type AutoEditQuality = "sd" | "hd" | "2k" | "4k" | "8k" | "8k_max";

/** Target megapixels by quality (billing / history targets). */
export const AUTO_EDIT_TARGET_MP: Record<AutoEditQuality, number> = {
  sd: 1,
  hd: 1,
  "2k": 2,
  "4k": 3,
  "8k": 4,
  "8k_max": 6,
};

/**
 * Total Auto Edit credits by quality.
 * Product policy: 40 credits for subsequent Maluto AI generations (all tiers aligned).
 * Debit flows through @/lib/billing lifecycle.
 */
export const AUTO_EDIT_CREDITS_BY_QUALITY: Record<AutoEditQuality, number> = {
  sd: 40,
  hd: 40,
  "2k": 40,
  "4k": 40,
  "8k": 40,
  "8k_max": 40,
};

/** @deprecated Prefer autoEditCreditCost(quality). HD default. */
export const AUTO_EDIT_CREDIT_COST = AUTO_EDIT_CREDITS_BY_QUALITY.hd;

export function autoEditCreditCost(quality: AutoEditQuality = "hd"): number {
  return AUTO_EDIT_CREDITS_BY_QUALITY[quality] ?? AUTO_EDIT_CREDIT_COST;
}

export function autoEditTargetMegapixels(quality: AutoEditQuality = "hd"): number {
  return AUTO_EDIT_TARGET_MP[quality] ?? 1;
}

/** Vision analysis on fal only. */
export const AUTO_EDIT_VISION_MODEL = "fal-ai/any-llm/vision" as const;
export const AUTO_EDIT_VISION_LLM = "google/gemini-2.5-flash-lite" as const;

/** Primary edit model — FLUX Kontext LoRA (NOT GPT Image 2). */
export const AUTO_EDIT_FAL_MODEL = "fal-ai/flux-kontext-lora" as const;

/** Default watermark position metadata (server stamp applies it). */
export const AUTO_EDIT_WATERMARK_POSITION = "bottom-right" as const;

/** Product name shown in UI. */
export const AUTO_EDIT_PRODUCT_NAME = "Maluto AI 1.8" as const;

/** Semantic version for History / metadata. */
export const AUTO_EDIT_PRODUCT_VERSION = "1.8" as const;

/** Pipeline states for client progress (no GPT-specific wording). */
export const AUTO_EDIT_PIPELINE_STATES = [
  "QUEUED",
  "ANALYSING",
  "EDITING",
  "FINALISING",
  "DONE",
  "FAILED",
] as const;

export type AutoEditPipelineState = (typeof AUTO_EDIT_PIPELINE_STATES)[number];

/** Human-readable label for a detected issue key or free-text issue. */
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

/** Human-readable label for a recommended improvement action. */
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
