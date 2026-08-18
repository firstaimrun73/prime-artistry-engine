/**
 * MOTIO2EDIT Auto Edit — product constants.
 *
 * One Auto Edit job = deterministic plan + single fal.ai GPT Image edit + watermark.
 * User is charged once for the whole pipeline, not per internal step.
 */

/** Credits charged for one complete Auto Edit (plan + generation). */
export const AUTO_EDIT_CREDIT_COST = 70;

/**
 * Primary fal.ai GPT Image edit endpoint (NOT Flux Kontext, NOT external OpenAI SDK).
 * Docs: https://fal.ai/models/openai/gpt-image-2/edit
 */
export const AUTO_EDIT_FAL_MODEL = "openai/gpt-image-2/edit" as const;

/**
 * Quality tier for GPT Image 2 edit.
 * medium ≈ $0.061 at 1024×1024 (edit pricing table on fal) — under ~$0.09 target.
 * high ≈ $0.219 at 1024×1024 — exceeds target; do not use as default.
 */
export const AUTO_EDIT_GPT_QUALITY = "medium" as const;

/** Product name shown in UI. */
export const AUTO_EDIT_PRODUCT_NAME = "MOTIO2EDIT Auto Edit" as const;

/** Human-readable labels for detected quality issues (client-safe). */
export const ISSUE_LABELS: Record<string, string> = {
  blur: "Soft focus / blur",
  motion_blur: "Motion blur",
  defocus: "Out of focus",
  noise: "Image noise",
  compression_artifacts: "Compression artifacts",
  pixelation: "Pixelation",
  overexposed: "Overexposure",
  underexposed: "Underexposure",
  low_contrast: "Low contrast",
  color_cast: "Color cast",
  oversharpened: "Over-sharpening",
  low_resolution: "Low resolution",
  missing_detail: "Missing fine detail",
  fading: "Fading",
  scratches: "Scratches",
  cracks: "Cracks",
  dust: "Dust",
  stains: "Stains",
  tears: "Tears",
  damaged_regions: "Damaged regions",
  monochrome_aged: "Aged monochrome",
  color_loss: "Color loss",
};

/** Human-readable labels for internal improvement IDs (client-safe). */
export const IMPROVEMENT_LABELS: Record<string, string> = {
  RESTORE_PHOTO: "Photo restoration",
  DEBLUR: "Deblur",
  MOTION_DEBLUR: "Motion deblur",
  DEFOCUS_RECOVERY: "Focus recovery",
  CLARITY_INCREASE: "Clarity",
  DETAIL_RECOVERY: "Detail recovery",
  SHARPEN: "Sharpen",
  DENOISE: "Denoise",
  NOISE_REDUCTION: "Noise reduction",
  COMPRESSION_REPAIR: "Compression repair",
  PIXELATION_REPAIR: "Pixelation repair",
  LOW_RESOLUTION_RECOVERY: "Resolution recovery",
  UPSCALE_DETAIL: "Detail upscale",
  EXPOSURE_FIX: "Exposure correction",
  UNDEREXPOSURE_FIX: "Underexposure fix",
  OVEREXPOSURE_FIX: "Overexposure fix",
  LIGHTING_BALANCE: "Lighting balance",
  SHADOW_RECOVERY: "Shadow recovery",
  HIGHLIGHT_RECOVERY: "Highlight recovery",
  CONTRAST_BALANCE: "Contrast balance",
  COLOR_BALANCE: "Color balance",
  WHITE_BALANCE: "White balance",
  COLOR_CAST_FIX: "Color-cast fix",
  FACE_DETAIL_RECOVERY: "Face detail",
  FACE_CLARITY: "Face clarity",
  PORTRAIT_LIGHTING: "Portrait lighting",
  SKIN_DETAIL_PRESERVATION: "Natural skin detail",
  OLD_PHOTO_RESTORATION: "Old photo restoration",
  FADE_REPAIR: "Fade repair",
  SCRATCH_REPAIR: "Scratch repair",
  DUST_REPAIR: "Dust repair",
  DAMAGE_REPAIR: "Damage repair",
  BACKGROUND_CLEANUP: "Background cleanup",
  DISTRACTION_REDUCTION: "Distraction reduction",
  NATURAL_PHOTO_POLISH: "Natural polish",
};

export function labelIssue(id: string): string {
  return ISSUE_LABELS[id] ?? id.replace(/_/g, " ");
}

export function labelImprovement(id: string): string {
  return IMPROVEMENT_LABELS[id] ?? id.replace(/_/g, " ");
}
