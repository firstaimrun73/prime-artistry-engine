/**
 * Prompt matcher + aggregator for MOTIO2EDIT Auto.
 * Multiple library hits → ONE merged internal instruction. Never exposed to UI.
 */

import type { ImageAnalysisResult } from "./types";
import type { AutoEditLayerBundle, AutoImprovementId } from "./auto-edit.types";
import { AUTO_EDIT_PROMPT_LIBRARY } from "./auto-edit.prompt-library";

const MAX_IMPROVEMENTS = 6;

const PRESERVE_BLOCK =
  "Preserve: exact identity and facial structure; original composition and subject position; clothing; scene geometry; natural skin texture. " +
  "Do not: redesign the image; change identity; invent objects; change the scene; apply an obvious artistic style; over-sharpen; create artificial skin; crop unnecessarily.";

export function matchImprovements(
  analysis: ImageAnalysisResult,
  layers: AutoEditLayerBundle,
): AutoImprovementId[] {
  const issues = new Set(analysis.quality.issues ?? []);
  const rest = new Set(analysis.quality.restorationIssues ?? []);
  const selected: AutoImprovementId[] = [];
  const add = (id: AutoImprovementId) => {
    if (!selected.includes(id)) selected.push(id);
  };

  if (analysis.quality.isOldPhoto) add("OLD_PHOTO_RESTORATION");
  if (rest.has("scratches")) add("SCRATCH_REPAIR");
  if (rest.has("dust")) add("DUST_REPAIR");
  if (rest.has("fading") || rest.has("color_loss")) add("FADE_REPAIR");
  if (rest.has("damaged_regions") || rest.has("tears") || rest.has("stains")) {
    add("DAMAGE_REPAIR");
  }
  if (analysis.quality.needsRestoration && selected.length === 0) add("RESTORE_PHOTO");

  if (issues.has("motion_blur")) add("MOTION_DEBLUR");
  else if (issues.has("defocus")) add("DEFOCUS_RECOVERY");
  else if (issues.has("blur") || analysis.faces.blurry) add("DEBLUR");

  if (issues.has("noise")) {
    add("DENOISE");
    add("NOISE_REDUCTION");
  }
  if (issues.has("compression_artifacts")) add("COMPRESSION_REPAIR");
  if (issues.has("pixelation")) add("PIXELATION_REPAIR");

  if (
    issues.has("low_resolution") ||
    (analysis.dimensions.megapixels > 0 && analysis.dimensions.megapixels < 1)
  ) {
    add("LOW_RESOLUTION_RECOVERY");
    add("UPSCALE_DETAIL");
  }

  if (analysis.lighting.isUnderexposed || issues.has("underexposed")) {
    add("UNDEREXPOSURE_FIX");
    add("SHADOW_RECOVERY");
  }
  if (analysis.lighting.isOverexposed || issues.has("overexposed")) {
    add("OVEREXPOSURE_FIX");
    add("HIGHLIGHT_RECOVERY");
  }
  if (analysis.lighting.isUneven) add("LIGHTING_BALANCE");
  if (
    (analysis.lighting.isUnderexposed || analysis.lighting.isOverexposed) &&
    !selected.includes("UNDEREXPOSURE_FIX") &&
    !selected.includes("OVEREXPOSURE_FIX")
  ) {
    add("EXPOSURE_FIX");
  }

  if (issues.has("low_contrast")) add("CONTRAST_BALANCE");
  if (analysis.lighting.colorTemperatureOff || issues.has("color_cast")) {
    add("COLOR_CAST_FIX");
    add("WHITE_BALANCE");
    add("COLOR_BALANCE");
  }

  if (analysis.faces.detected) {
    if (analysis.faces.blurry || issues.has("blur") || issues.has("missing_detail")) {
      add("FACE_DETAIL_RECOVERY");
      add("FACE_CLARITY");
    }
    if (analysis.faces.poorLighting) add("PORTRAIT_LIGHTING");
    add("SKIN_DETAIL_PRESERVATION");
  }

  if (
    analysis.background.isCluttered ||
    analysis.background.hasDistractingElements
  ) {
    add("BACKGROUND_CLEANUP");
    add("DISTRACTION_REDUCTION");
  }

  if (issues.has("missing_detail") || analysis.quality.needsEnhancement) {
    add("CLARITY_INCREASE");
    add("DETAIL_RECOVERY");
    add("SHARPEN");
  }

  // Always allow a conservative polish if anything else matched or quality is mid
  if (selected.length === 0 || (layers.qualityScore > 0 && layers.qualityScore < 0.9)) {
    add("NATURAL_PHOTO_POLISH");
  }

  // Cap + sort by library priority
  const ranked = selected
    .map((id) => AUTO_EDIT_PROMPT_LIBRARY[id])
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_IMPROVEMENTS)
    .map((e) => e.id);

  return ranked;
}

/**
 * Build exactly one model-facing prompt from matched improvements.
 */
export function buildSingleAutoEditPrompt(
  matched: AutoImprovementId[],
): { prompt: string; improvementsApplied: number } {
  if (matched.length === 0) {
    const polish = AUTO_EDIT_PROMPT_LIBRARY.NATURAL_PHOTO_POLISH;
    return {
      improvementsApplied: 1,
      prompt: [
        "Improve the supplied photograph naturally.",
        `Priority: 1. ${polish.instruction}`,
        PRESERVE_BLOCK,
        "The final result must remain faithful to the original photograph while improving detected quality problems.",
      ].join("\n\n"),
    };
  }

  const lines = matched.map((id, i) => {
    const entry = AUTO_EDIT_PROMPT_LIBRARY[id];
    return `${i + 1}. ${entry.instruction}`;
  });

  return {
    improvementsApplied: matched.length,
    prompt: [
      "Improve the supplied photograph naturally.",
      "Priority:",
      ...lines,
      PRESERVE_BLOCK,
      "The final result must remain faithful to the original photograph while improving its detected quality problems.",
    ].join("\n"),
  };
}
