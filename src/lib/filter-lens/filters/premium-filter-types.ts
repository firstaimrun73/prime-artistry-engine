/**
 * premium-filter-types.ts
 * Types for Motio2edit Premium-tier multi-stage filters.
 * Backend only — no UI changes.
 */

export type PremiumIntensityBehavior = 'linear' | 'threshold-activated' | 'progressive-structural';

export type PremiumCategory =
  | 'flagship'
  | 'high-impact'
  | 'artistic'
  | 'graphic';

export type PremiumPriority = 'P0' | 'P1' | 'P2' | 'P3';

/** Tunable knob exposed for adjustment UI / intensity mapping */
export interface PremiumAdjustmentParam {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  /** How this param scales with the master intensity slider */
  intensityMap?: 'linear' | 'threshold' | 'fixed';
  threshold?: number; // for threshold-activated
}

export interface PremiumFilterDefinition {
  filter_id: string;
  display_name: string;
  tier: 'premium';
  category: PremiumCategory;
  priority: PremiumPriority;
  description: string;
  visualDescription: string;

  /** Master intensity 0–100 */
  intensityRange: { min: number; max: number; default: number };
  intensityBehavior: PremiumIntensityBehavior;

  /** All adjustable parameters (for future adjustment panel + intensity scaling) */
  adjustments: PremiumAdjustmentParam[];

  /** Processing path */
  model: 'programmatic' | 'flux-img2img' | 'hybrid';
  /** When model is flux-img2img or hybrid */
  prompt?: string;
  negative_prompt?: string;
  strength?: number;
  guidance_scale?: number;
  controlnet_type?: 'canny' | 'depth';
  controlnet_weight?: number;
  two_pass?: boolean;

  /** When model is programmatic or hybrid — style key for engine-ops-style */
  styleKey?: 'anime' | 'comic' | 'sketch' | 'oil' | 'watercolor' | 'neon' | 'painting' | 'none';

  face_preserve: boolean;
  credit_cost: number;
  watermark_locked: boolean;
  max_output_px: number;

  /** Optional recipe stages (documentation + future pipeline runner) */
  recipeNotes?: string;
  newCapabilitiesRequired?: string[];
}
