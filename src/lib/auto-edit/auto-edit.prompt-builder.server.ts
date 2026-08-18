/**
 * Auto Edit internal instruction builder.
 *
 * Rules provide SOFT HINTS only — they do not force operations.
 * The fal.ai GPT Image 2 Edit model receives the actual photograph
 * and must inspect it, then apply only appropriate corrections.
 *
 * Instruction is never exposed to the client.
 */

import type { ImageAnalysisResult } from "./types";
import type { AutoEditLayerBundle, AutoImprovementId } from "./auto-edit.types";
import { AUTO_EDIT_PROMPT_LIBRARY } from "./auto-edit.prompt-library";
import { labelImprovement } from "./constants";

const MAX_HINTS = 5;

/** Core auto-edit directive — model must inspect the supplied photo. */
const AUTO_INSPECT_CORE = [
  "You are an automatic professional photo enhancement editor.",
  "Inspect the provided original photograph carefully.",
  "Determine what, if anything, genuinely needs improvement.",
  "Automatically correct real visible problems when present, such as: blur or soft focus, noise, compression artifacts, low resolution or missing detail, poor exposure (underexposure or overexposure), weak contrast, color imbalance or color cast, faded appearance, scratches, dust, or other obvious photographic degradation.",
  "Apply only corrections that are appropriate for THIS specific image.",
  "If an area is already sharp, clean, and well-exposed, leave it alone — do not force every possible enhancement.",
  "Preserve the original subject, identity, facial characteristics, composition, objects, geometry, natural colors, clothing, background structure, and photographic intent.",
  "Do not add objects, remove people or objects, redesign the scene, change identity, invent content, apply an artistic style, or make unnecessary stylistic changes.",
  "Produce a natural, high-quality improved version of the SAME photograph.",
].join(" ");

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
  }
  if (issues.has("compression_artifacts")) add("COMPRESSION_REPAIR");
  if (issues.has("pixelation")) add("PIXELATION_REPAIR");

  if (
    issues.has("low_resolution") ||
    (analysis.dimensions.megapixels > 0 && analysis.dimensions.megapixels < 1)
  ) {
    add("LOW_RESOLUTION_RECOVERY");
  }

  if (analysis.lighting.isUnderexposed || issues.has("underexposed")) {
    add("UNDEREXPOSURE_FIX");
  }
  if (analysis.lighting.isOverexposed || issues.has("overexposed")) {
    add("OVEREXPOSURE_FIX");
  }
  if (analysis.lighting.isUneven) add("LIGHTING_BALANCE");
  if (issues.has("low_contrast")) add("CONTRAST_BALANCE");
  if (analysis.lighting.colorTemperatureOff || issues.has("color_cast")) {
    add("COLOR_BALANCE");
  }

  if (analysis.faces.detected) {
    if (analysis.faces.blurry || issues.has("blur") || issues.has("missing_detail")) {
      add("FACE_DETAIL_RECOVERY");
    }
    if (analysis.faces.poorLighting) add("PORTRAIT_LIGHTING");
  }

  if (analysis.background.isCluttered || analysis.background.hasDistractingElements) {
    add("BACKGROUND_CLEANUP");
  }

  if (issues.has("missing_detail") || analysis.quality.needsEnhancement) {
    add("DETAIL_RECOVERY");
  }

  if (selected.length === 0 || (layers.qualityScore > 0 && layers.qualityScore < 0.9)) {
    add("NATURAL_PHOTO_POLISH");
  }

  const ranked = selected
    .map((id) => AUTO_EDIT_PROMPT_LIBRARY[id])
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_HINTS)
    .map((e) => e.id);

  return ranked;
}

/**
 * Build ONE model-facing instruction for openai/gpt-image-2/edit.
 * Hints are optional; the model must still inspect the image and decide.
 */
export function buildSingleAutoEditPrompt(
  matched: AutoImprovementId[],
  analysis?: ImageAnalysisResult,
): { prompt: string; improvementsApplied: number } {
  const parts: string[] = [AUTO_INSPECT_CORE];

  const softHints = matched
    .filter((id) => id !== "NATURAL_PHOTO_POLISH")
    .slice(0, MAX_HINTS)
    .map((id) => labelImprovement(id));

  if (softHints.length > 0) {
    parts.push(
      "Heuristic signals (not mandatory — verify against the actual image before applying): " +
        softHints.join("; ") +
        ". Only apply a correction if you can see the corresponding problem in the photograph.",
    );
  }

  if (analysis) {
    const mp = analysis.dimensions.megapixels;
    if (mp > 0 && mp < 1) {
      parts.push(
        "The source may be relatively low resolution. Recover detail carefully without inventing false structure.",
      );
    }
    if (analysis.quality.isOldPhoto) {
      parts.push(
        "This may be an older or aged photograph. Restore naturally if damage or fading is visible; do not modernize identity or scene.",
      );
    }
  }

  parts.push(
    "Output: one natural photorealistic edit of the same photograph. No watermark, no text overlay, no border.",
  );

  return {
    improvementsApplied: Math.max(1, softHints.length || 1),
    prompt: parts.join("\n\n"),
  };
}
