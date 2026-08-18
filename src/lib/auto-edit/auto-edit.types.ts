/**
 * MOTIO2EDIT Auto — standalone single-pass types.
 * Safe client-facing result never includes internal prompts or vision raw text.
 */

export type AutoEditLayerId =
  | "scene"
  | "subject"
  | "people"
  | "faces"
  | "sharpness"
  | "blur"
  | "noise"
  | "compression"
  | "resolution"
  | "exposure"
  | "lighting"
  | "color"
  | "contrast"
  | "background"
  | "unwanted_objects"
  | "restoration"
  | "scratches"
  | "fading"
  | "damaged_regions"
  | "portrait_quality"
  | "composition"
  | "detail_recovery"
  | "artifacts"
  | "overall_quality";

export type AutoEditLayerFinding = {
  layer: AutoEditLayerId;
  facts: string[];
  /** 0–1 */
  confidence: number;
  /** True when this layer recommends an improvement */
  needsAttention: boolean;
};

export type AutoEditLayerBundle = {
  layers: AutoEditLayerFinding[];
  qualityScore: number;
  analysisConfidence: number;
};

export type AutoImprovementId =
  | "RESTORE_PHOTO"
  | "DEBLUR"
  | "MOTION_DEBLUR"
  | "DEFOCUS_RECOVERY"
  | "CLARITY_INCREASE"
  | "DETAIL_RECOVERY"
  | "SHARPEN"
  | "DENOISE"
  | "NOISE_REDUCTION"
  | "COMPRESSION_REPAIR"
  | "PIXELATION_REPAIR"
  | "LOW_RESOLUTION_RECOVERY"
  | "UPSCALE_DETAIL"
  | "EXPOSURE_FIX"
  | "UNDEREXPOSURE_FIX"
  | "OVEREXPOSURE_FIX"
  | "LIGHTING_BALANCE"
  | "SHADOW_RECOVERY"
  | "HIGHLIGHT_RECOVERY"
  | "CONTRAST_BALANCE"
  | "COLOR_BALANCE"
  | "WHITE_BALANCE"
  | "COLOR_CAST_FIX"
  | "FACE_DETAIL_RECOVERY"
  | "FACE_CLARITY"
  | "PORTRAIT_LIGHTING"
  | "SKIN_DETAIL_PRESERVATION"
  | "OLD_PHOTO_RESTORATION"
  | "FADE_REPAIR"
  | "SCRATCH_REPAIR"
  | "DUST_REPAIR"
  | "DAMAGE_REPAIR"
  | "BACKGROUND_CLEANUP"
  | "DISTRACTION_REDUCTION"
  | "NATURAL_PHOTO_POLISH";

/** Safe payload returned to the Auto UI */
export type StandaloneAutoEditResult = {
  success: boolean;
  outputUrl: string;
  changed: boolean;
  analysisSummary: {
    qualityScore: number;
    improvementsApplied: number;
  };
  message?: string;
};
