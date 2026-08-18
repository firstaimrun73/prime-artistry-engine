/**
 * Auto Edit prompt generator — builds model-ready text from analysis + op id.
 *
 * Separate from main editor prompt-engine / prompt-enhance.server:
 * those enrich user-authored text; Auto Edit has no user prompt and must
 * invent instructions from detected defects only.
 *
 * Deterministic templates only (no LLM). Promptless fal steps (raw deblur /
 * topaz when invoked outside generateMedia) do not need this; every Auto Edit
 * step currently goes through generateMedia, which always requires a prompt
 * string for routing (pure_enhance vs kontext).
 */

import type { ImageAnalysisResult } from "./types";
import type { AutoEditOperationId } from "./operations";

export type AutoEditPromptInput = {
  analysis: ImageAnalysisResult;
  operationId: string;
  /** Catalog baseline (operations / autoPrompts) — used as fallback seed */
  catalogInstruction?: string;
};

const IDENTITY =
  "Keep the exact same people, faces, identity, pose, clothing, and composition. " +
  "Do not invent or remove subjects. Photorealistic only.";

function issuesOf(a: ImageAnalysisResult): Set<string> {
  return new Set([
    ...(a.quality.issues ?? []),
    ...(a.quality.restorationIssues ?? []),
  ]);
}

/**
 * Build an internal generation prompt for one Auto Edit step.
 * Stronger wording for enhance-path ops so post-processing / kontext actually move pixels.
 */
export function buildAutoEditPrompt(input: AutoEditPromptInput): string {
  const { analysis, operationId } = input;
  const issues = issuesOf(analysis);
  const hasFace = analysis.faces?.detected === true;
  const lowRes =
    issues.has("low_resolution") ||
    (analysis.dimensions.megapixels > 0 && analysis.dimensions.megapixels < 1);
  const soft =
    issues.has("blur") ||
    issues.has("motion_blur") ||
    issues.has("defocus") ||
    issues.has("missing_detail") ||
    analysis.faces?.blurry === true;
  const noisy = issues.has("noise");
  const compressed =
    issues.has("compression_artifacts") || issues.has("pixelation");
  const dark =
    analysis.lighting.isUnderexposed ||
    issues.has("underexposed") ||
    analysis.scene === "night";
  const bright =
    analysis.lighting.isOverexposed || issues.has("overexposed");

  switch (operationId) {
    case "DEBLUR":
      return [
        "Deblur and unblur this photograph aggressively.",
        "Recover sharp edges, fine detail, and texture from motion blur or soft focus.",
        "Increase sharpness and clarity substantially while remaining photorealistic.",
        IDENTITY,
      ].join(" ");

    case "NOISE_REDUCTION":
      return [
        "Denoise this image: remove grain and sensor noise.",
        "Preserve real edges and natural texture; avoid plastic skin.",
        "Improve clarity carefully after noise is reduced.",
        IDENTITY,
      ].join(" ");

    case "COMPRESSION_ARTIFACT_REDUCTION":
      return [
        "Reduce JPEG and compression blockiness and ringing.",
        "Recover cleaner edges and surfaces without inventing new content.",
        "Enhance overall quality and clarity.",
        IDENTITY,
      ].join(" ");

    case "UPSCALE":
      return [
        "Upscale this photo with natural detail recovery.",
        "Increase resolution, peak detail, HD clarity and sharpness.",
        "Keep subject, composition and colors the same; do not restyle.",
        IDENTITY,
      ].join(" ");

    case "IMAGE_ENHANCEMENT": {
      const parts = [
        "Enhance this photograph for professional clarity.",
        "Increase sharpness, micro-contrast and fine detail; reduce mild blur and noise.",
      ];
      if (soft) parts.push("Deblur soft areas and recover crisp edges.");
      if (noisy) parts.push("Reduce visible grain without smearing detail.");
      if (lowRes) parts.push("Upscale and recover resolution with natural detail.");
      if (compressed) parts.push("Clean compression artifacts.");
      if (dark) parts.push("Gently lift underexposure while protecting highlights.");
      if (bright) parts.push("Recover blown highlights without flattening midtones.");
      parts.push(
        "Keep composition, subjects and overall color palette; do not redesign the scene.",
      );
      if (hasFace) parts.push(IDENTITY);
      return parts.join(" ");
    }

    case "OLD_PHOTO_RESTORATION":
      return [
        "Restore this old photograph: repair scratches, tears, stains, dust and fading.",
        "Recover natural tonal range and fine detail.",
        "Keep original composition and subjects intact.",
        hasFace ? IDENTITY : "Do not invent new people or objects.",
      ].join(" ");

    case "PHOTO_RESTORATION":
      return [
        "Restore this photo: repair scratches, dust, stains and physical damage.",
        "Improve clarity while keeping the original look and subjects.",
        hasFace ? IDENTITY : "Do not invent new content outside repaired areas.",
      ].join(" ");

    case "EXPOSURE_CORRECTION":
      return [
        dark
          ? "Correct underexposure: brighten shadows and midtones for a natural balanced exposure."
          : bright
            ? "Correct overexposure: recover highlight detail and rebalance exposure."
            : "Correct exposure for a natural well-balanced result.",
        "Do not change subject identity or composition.",
        hasFace ? IDENTITY : "",
      ]
        .filter(Boolean)
        .join(" ");

    case "SHADOW_RECOVERY":
      return [
        "Recover shadow detail gently; lift crushed blacks without washing out the image.",
        "Keep highlight control and subject identity unchanged.",
        hasFace ? IDENTITY : "",
      ]
        .filter(Boolean)
        .join(" ");

    case "HIGHLIGHT_RECOVERY":
      return [
        "Recover blown highlights and reduce clipping while keeping a natural contrast curve.",
        "Do not change subject identity.",
        hasFace ? IDENTITY : "",
      ]
        .filter(Boolean)
        .join(" ");

    case "PORTRAIT_REPAIR":
      return [
        "Professional portrait repair: even skin tone, subtle blemish cleanup with realistic texture, balanced lighting.",
        "IDENTITY LOCK: same person, same face geometry, same age appearance.",
        IDENTITY,
      ].join(" ");

    case "FACE_DETAIL_RESTORATION":
      return [
        "Enhance facial detail: natural skin texture, sharper eyes, clearer catchlights, balanced face lighting.",
        "Do NOT change identity, expression, age or bone structure.",
        IDENTITY,
      ].join(" ");

    case "BACKGROUND_CLEANUP":
      return [
        "Clean and simplify only the background: remove minor clutter and distractions.",
        "Keep the main subject pixel-identical with clean edges.",
        IDENTITY,
      ].join(" ");

    case "DEFAULT_POLISH":
      return [
        "Apply professional photo polish: improve sharpness and clarity, balance exposure and color,",
        "reduce mild noise and soft focus, recover fine detail.",
        soft ? "Deblur soft regions." : "",
        lowRes ? "Enhance resolution and peak detail." : "",
        "Keep subject and composition identical.",
        hasFace ? IDENTITY : "",
      ]
        .filter(Boolean)
        .join(" ");

    default:
      return (
        input.catalogInstruction?.trim() ||
        [
          "Improve overall photo quality: sharpness, clarity and natural detail.",
          "Keep composition and subjects unchanged.",
          hasFace ? IDENTITY : "",
        ]
          .filter(Boolean)
          .join(" ")
      );
  }
}
