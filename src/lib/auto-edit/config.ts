/**
 * Auto Edit — shared config (validation + timeouts).
 * Vision analysis runs on fal.ai only (no Anthropic / OpenAI API keys).
 */

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
 */
export const AUTO_EDIT_CONFIG = {
  /** Match client upload limit (40 MB). */
  maxImageSizeBytes: 40 * 1024 * 1024,
  maxImageDimensionPx: 8192,
  minImageDimensionPx: 64,
  /** Analysis + sequential ops budget (guards runaway loops). */
  maxTotalModelCalls: 8,
  maxRetriesPerStep: 1,
  retryBaseDelayMs: 1500,
  /** Per generation step; generateMedia also has its own FAL timeout. */
  stepTimeoutMs: 180_000,
} as const;
