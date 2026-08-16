/**
 * Auto Edit — shared config (validation + timeouts).
 * Analysis model settings + image limits used by analyze + orchestrator.
 */

export const ANALYSIS_MODEL = process.env.ANTHROPIC_ANALYSIS_MODEL ?? "claude-sonnet-4-5";
export const ANALYSIS_MAX_TOKENS = Number(process.env.ANTHROPIC_ANALYSIS_MAX_TOKENS ?? 2000);

/** Supported content types for probe validation (orchestrator). */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Runtime limits for Auto Edit orchestration.
 * Generation still goes through existing generateMedia (credits + FAL).
 */
export const AUTO_EDIT_CONFIG = {
  /** Match client upload limit (25 MB). */
  maxImageSizeBytes: 25 * 1024 * 1024,
  maxImageDimensionPx: 8192,
  minImageDimensionPx: 64,
  /** Analysis + sequential ops budget (guards runaway loops). */
  maxTotalModelCalls: 8,
  maxRetriesPerStep: 1,
  retryBaseDelayMs: 1500,
  /** Per generation step; generateMedia also has its own FAL timeout. */
  stepTimeoutMs: 180_000,
} as const;
