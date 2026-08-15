/**
 * Auto Edit / Prompt Intelligence — foundation types only.
 *
 * These types describe a structured analysis of a user's edit request.
 * They are intentionally separate from ExpandedIntent (which is a
 * generation-ready prompt expansion used by expand-prompt / aiEngine).
 *
 * No AI calls, no server functions, no credit logic, no UI wiring.
 * This file is pure TypeScript interfaces for future use.
 */

/** Editor surface the user is currently working in. */
export type AutoEditContext = "image" | "video" | "music";

/**
 * High-level operation category inferred from the user request.
 * Kept as a string union so future categories can be added without
 * breaking consumers that switch on known values.
 */
export type AutoEditOperationCategory =
  | "remove"
  | "replace"
  | "modify"
  | "enhance"
  | "restore"
  | "background"
  | "clothing"
  | "object"
  | "person"
  | "style"
  | "crop"
  | "generation";

/**
 * Structured result of analyzing a free-form user prompt in context of
 * the current editor (image / video / music).
 *
 * Future Auto Edit pipeline will produce this object; generation and
 * credit systems remain unchanged and will consume only the fields they need.
 */
export interface AutoEditAnalysis {
  /** Which editor the request came from. */
  context: AutoEditContext;

  /** Free-text summary of what the user is trying to achieve. */
  userIntent: string;

  /** Primary verb / action (e.g. "remove", "replace", "brighten"). */
  primaryAction: string;

  /** Main subject or element the action applies to (e.g. "person on left", "sky"). */
  target: string;

  /** Concrete change requested (e.g. "make transparent", "turn blue"). */
  requestedChange: string;

  /**
   * Explicit list of elements that must stay unchanged
   * (identity, lighting, composition, etc.).
   */
  preservationRequirements: string[];

  /**
   * Optional description of the spatial or temporal region affected
   * (e.g. "left third of frame", "background only", "0–3s").
   */
  affectedRegion?: string;

  /** Model confidence in the analysis, 0–1. */
  confidence: number;

  /** Coarse category used for routing / UI hints. */
  operationCategory: AutoEditOperationCategory;
}
