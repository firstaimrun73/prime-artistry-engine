/**
 * Internal improvement catalog for MOTIO2EDIT Auto.
 * Never shown in the UI. Used only by prompt matcher/builder.
 */

import type { AutoImprovementId } from "./auto-edit.types";

export type PromptLibraryEntry = {
  id: AutoImprovementId;
  /** Short priority rank — lower runs earlier in the merged instruction list */
  priority: number;
  instruction: string;
};

export const AUTO_EDIT_PROMPT_LIBRARY: Record<AutoImprovementId, PromptLibraryEntry> = {
  OLD_PHOTO_RESTORATION: {
    id: "OLD_PHOTO_RESTORATION",
    priority: 10,
    instruction:
      "Restore this aged photograph: repair fading, yellowing, and age-related degradation while keeping the original look.",
  },
  RESTORE_PHOTO: {
    id: "RESTORE_PHOTO",
    priority: 12,
    instruction: "Restore physical and digital damage; recover missing detail in repaired regions only.",
  },
  SCRATCH_REPAIR: {
    id: "SCRATCH_REPAIR",
    priority: 14,
    instruction: "Remove scratches and linear damage marks; inpaint seamlessly from surrounding texture.",
  },
  DUST_REPAIR: {
    id: "DUST_REPAIR",
    priority: 15,
    instruction: "Remove dust spots and speckles without softening real detail.",
  },
  FADE_REPAIR: {
    id: "FADE_REPAIR",
    priority: 16,
    instruction: "Recover faded tones and restore natural density without oversaturating.",
  },
  DAMAGE_REPAIR: {
    id: "DAMAGE_REPAIR",
    priority: 17,
    instruction: "Repair torn, stained, or damaged regions with realistic local content.",
  },
  MOTION_DEBLUR: {
    id: "MOTION_DEBLUR",
    priority: 20,
    instruction: "Correct motion blur; recover sharp edges and subject definition.",
  },
  DEFOCUS_RECOVERY: {
    id: "DEFOCUS_RECOVERY",
    priority: 21,
    instruction: "Recover detail lost to soft focus or defocus blur.",
  },
  DEBLUR: {
    id: "DEBLUR",
    priority: 22,
    instruction: "Deblur the photograph and restore crisp edges and fine detail.",
  },
  SHARPEN: {
    id: "SHARPEN",
    priority: 24,
    instruction: "Apply natural sharpening; avoid halos and artificial crunch.",
  },
  CLARITY_INCREASE: {
    id: "CLARITY_INCREASE",
    priority: 25,
    instruction: "Increase midtone clarity and local contrast for a cleaner look.",
  },
  DETAIL_RECOVERY: {
    id: "DETAIL_RECOVERY",
    priority: 26,
    instruction: "Recover fine texture and micro-detail where the source is soft or flat.",
  },
  DENOISE: {
    id: "DENOISE",
    priority: 30,
    instruction: "Reduce digital noise while preserving edges and natural grain where appropriate.",
  },
  NOISE_REDUCTION: {
    id: "NOISE_REDUCTION",
    priority: 31,
    instruction: "Reduce grain and sensor noise without plastic smoothing.",
  },
  COMPRESSION_REPAIR: {
    id: "COMPRESSION_REPAIR",
    priority: 32,
    instruction: "Reduce JPEG blockiness, ringing, and compression artifacts.",
  },
  PIXELATION_REPAIR: {
    id: "PIXELATION_REPAIR",
    priority: 33,
    instruction: "Reduce pixelation and restore smoother continuous detail.",
  },
  LOW_RESOLUTION_RECOVERY: {
    id: "LOW_RESOLUTION_RECOVERY",
    priority: 34,
    instruction: "Recover resolution and readable detail from a low-resolution source.",
  },
  UPSCALE_DETAIL: {
    id: "UPSCALE_DETAIL",
    priority: 35,
    instruction: "Enhance resolution with natural detail recovery; keep composition identical.",
  },
  UNDEREXPOSURE_FIX: {
    id: "UNDEREXPOSURE_FIX",
    priority: 40,
    instruction: "Lift underexposure; open shadows naturally without crushing blacks incorrectly.",
  },
  OVEREXPOSURE_FIX: {
    id: "OVEREXPOSURE_FIX",
    priority: 41,
    instruction: "Recover blown highlights and rebalance overall exposure.",
  },
  EXPOSURE_FIX: {
    id: "EXPOSURE_FIX",
    priority: 42,
    instruction: "Correct overall exposure for a natural, well-balanced photograph.",
  },
  SHADOW_RECOVERY: {
    id: "SHADOW_RECOVERY",
    priority: 43,
    instruction: "Recover shadow detail gently while protecting highlight structure.",
  },
  HIGHLIGHT_RECOVERY: {
    id: "HIGHLIGHT_RECOVERY",
    priority: 44,
    instruction: "Recover highlight detail and reduce clipping.",
  },
  LIGHTING_BALANCE: {
    id: "LIGHTING_BALANCE",
    priority: 45,
    instruction: "Balance uneven lighting across the frame without changing the scene design.",
  },
  CONTRAST_BALANCE: {
    id: "CONTRAST_BALANCE",
    priority: 46,
    instruction: "Restore healthy contrast; avoid crushing blacks or blowing whites.",
  },
  COLOR_CAST_FIX: {
    id: "COLOR_CAST_FIX",
    priority: 50,
    instruction: "Remove unwanted color cast for neutral, natural color.",
  },
  WHITE_BALANCE: {
    id: "WHITE_BALANCE",
    priority: 51,
    instruction: "Correct white balance to a natural daylight-neutral appearance unless the scene is clearly intentional.",
  },
  COLOR_BALANCE: {
    id: "COLOR_BALANCE",
    priority: 52,
    instruction: "Balance colors for a natural, photographic look.",
  },
  FACE_DETAIL_RECOVERY: {
    id: "FACE_DETAIL_RECOVERY",
    priority: 60,
    instruction:
      "Recover facial detail: eyes, brows, natural skin texture. Do not change identity, age, or expression.",
  },
  FACE_CLARITY: {
    id: "FACE_CLARITY",
    priority: 61,
    instruction: "Improve face clarity and sharpness while keeping realistic skin.",
  },
  PORTRAIT_LIGHTING: {
    id: "PORTRAIT_LIGHTING",
    priority: 62,
    instruction: "Balance portrait lighting on the face without changing pose or identity.",
  },
  SKIN_DETAIL_PRESERVATION: {
    id: "SKIN_DETAIL_PRESERVATION",
    priority: 63,
    instruction: "Preserve natural skin texture; avoid plastic or overly smoothed skin.",
  },
  BACKGROUND_CLEANUP: {
    id: "BACKGROUND_CLEANUP",
    priority: 70,
    instruction: "Gently simplify only the background; keep the main subject unchanged.",
  },
  DISTRACTION_REDUCTION: {
    id: "DISTRACTION_REDUCTION",
    priority: 71,
    instruction: "Reduce minor background distractions without inventing a new scene.",
  },
  NATURAL_PHOTO_POLISH: {
    id: "NATURAL_PHOTO_POLISH",
    priority: 90,
    instruction:
      "Apply a light professional polish: clarity, balanced tone, and natural detail. Stay faithful to the original.",
  },
};

export const ALL_IMPROVEMENT_IDS = Object.keys(
  AUTO_EDIT_PROMPT_LIBRARY,
) as AutoImprovementId[];
