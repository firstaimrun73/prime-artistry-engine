/**
 * Layer engine — turns structured analysis into independent layer findings.
 * Server-side. Does not call FAL or Anthropic.
 */

import type { ImageAnalysisResult } from "./types";
import type { AutoEditLayerBundle, AutoEditLayerFinding, AutoEditLayerId } from "./auto-edit.types";

function layer(
  id: AutoEditLayerId,
  facts: string[],
  confidence: number,
  needsAttention: boolean,
): AutoEditLayerFinding {
  return {
    layer: id,
    facts,
    confidence: Math.max(0, Math.min(1, confidence)),
    needsAttention,
  };
}

export function buildAnalysisLayers(analysis: ImageAnalysisResult): AutoEditLayerBundle {
  const issues = new Set(analysis.quality.issues ?? []);
  const rest = new Set(analysis.quality.restorationIssues ?? []);
  const conf = analysis.analysisConfidence ?? 0.6;
  const layers: AutoEditLayerFinding[] = [];

  layers.push(
    layer(
      "scene",
      [`scene=${analysis.scene}`],
      conf,
      false,
    ),
  );

  layers.push(
    layer(
      "subject",
      [
        analysis.people.hasPrimarySubject ? "primary_subject" : "no_clear_primary",
        `people_count=${analysis.people.count}`,
      ],
      conf,
      false,
    ),
  );

  layers.push(
    layer(
      "people",
      [
        `count=${analysis.people.count}`,
        analysis.people.hasPhotobombers ? "photobombers" : "no_photobombers",
      ],
      conf,
      analysis.people.hasPhotobombers,
    ),
  );

  const faceAttention =
    analysis.faces.detected &&
    (analysis.faces.blurry ||
      analysis.faces.poorLighting ||
      analysis.faces.hasArtifacts);
  layers.push(
    layer(
      "faces",
      [
        analysis.faces.detected ? "face_detected" : "no_face",
        analysis.faces.blurry ? "face_blurry" : "face_sharp_ok",
        analysis.faces.poorLighting ? "face_poor_lighting" : "face_light_ok",
      ],
      conf,
      faceAttention,
    ),
  );

  const soft =
    issues.has("blur") ||
    issues.has("motion_blur") ||
    issues.has("defocus") ||
    analysis.faces.blurry;
  layers.push(
    layer(
      "sharpness",
      [soft ? "soft_or_blurry" : "acceptable_sharpness"],
      conf,
      soft,
    ),
  );
  layers.push(
    layer(
      "blur",
      [
        issues.has("motion_blur") ? "motion_blur" : "",
        issues.has("defocus") ? "defocus" : "",
        issues.has("blur") ? "blur" : "",
      ].filter(Boolean),
      conf,
      soft,
    ),
  );

  const noisy = issues.has("noise");
  layers.push(layer("noise", [noisy ? "noise_present" : "noise_ok"], conf, noisy));

  const compressed =
    issues.has("compression_artifacts") || issues.has("pixelation");
  layers.push(
    layer(
      "compression",
      [
        issues.has("compression_artifacts") ? "compression_artifacts" : "",
        issues.has("pixelation") ? "pixelation" : "",
      ].filter(Boolean),
      conf,
      compressed,
    ),
  );

  const lowRes =
    issues.has("low_resolution") ||
    (analysis.dimensions.megapixels > 0 && analysis.dimensions.megapixels < 1);
  layers.push(
    layer(
      "resolution",
      [
        `mp=${analysis.dimensions.megapixels.toFixed(2)}`,
        lowRes ? "low_resolution" : "resolution_ok",
      ],
      conf,
      lowRes,
    ),
  );

  const underex = analysis.lighting.isUnderexposed || issues.has("underexposed");
  const overex = analysis.lighting.isOverexposed || issues.has("overexposed");
  layers.push(
    layer(
      "exposure",
      [
        underex ? "underexposed" : "",
        overex ? "overexposed" : "",
        !underex && !overex ? "exposure_ok" : "",
      ].filter(Boolean),
      conf,
      underex || overex,
    ),
  );
  layers.push(
    layer(
      "lighting",
      [
        analysis.lighting.isUneven ? "uneven" : "even",
        analysis.lighting.hasShadowClipping ? "shadow_clip" : "",
        analysis.lighting.hasHighlightClipping ? "highlight_clip" : "",
      ].filter(Boolean),
      conf,
      analysis.lighting.isUneven || underex || overex,
    ),
  );

  const colorOff =
    analysis.lighting.colorTemperatureOff || issues.has("color_cast");
  layers.push(
    layer("color", [colorOff ? "color_cast_or_temp_off" : "color_ok"], conf, colorOff),
  );

  const lowContrast = issues.has("low_contrast");
  layers.push(
    layer("contrast", [lowContrast ? "low_contrast" : "contrast_ok"], conf, lowContrast),
  );

  layers.push(
    layer(
      "background",
      [
        analysis.background.isCluttered ? "cluttered" : "",
        analysis.background.hasDistractingElements ? "distractions" : "",
      ].filter(Boolean),
      conf,
      analysis.background.isCluttered || analysis.background.hasDistractingElements,
    ),
  );
  layers.push(
    layer(
      "unwanted_objects",
      [analysis.background.hasUnwantedObjects ? "unwanted_objects" : "none"],
      conf,
      analysis.background.hasUnwantedObjects,
    ),
  );

  const restoring =
    analysis.quality.isOldPhoto ||
    analysis.quality.needsRestoration ||
    rest.size > 0;
  layers.push(
    layer(
      "restoration",
      [
        analysis.quality.isOldPhoto ? "old_photo" : "",
        ...[...rest],
      ].filter(Boolean),
      conf,
      restoring,
    ),
  );
  layers.push(
    layer("scratches", [rest.has("scratches") ? "scratches" : "none"], conf, rest.has("scratches")),
  );
  layers.push(
    layer("fading", [rest.has("fading") ? "fading" : "none"], conf, rest.has("fading")),
  );
  layers.push(
    layer(
      "damaged_regions",
      [
        rest.has("damaged_regions") || rest.has("tears") || rest.has("stains")
          ? "damage"
          : "none",
      ],
      conf,
      rest.has("damaged_regions") || rest.has("tears") || rest.has("stains"),
    ),
  );

  layers.push(
    layer(
      "portrait_quality",
      [
        analysis.faces.detected ? "portrait_candidate" : "not_portrait_focus",
        faceAttention ? "needs_face_work" : "face_ok",
      ],
      conf,
      faceAttention,
    ),
  );

  layers.push(
    layer(
      "composition",
      [
        analysis.composition.subjectWellPlaced ? "subject_ok" : "subject_placement",
        analysis.composition.hasEdgeDistractions ? "edge_distractions" : "",
      ].filter(Boolean),
      conf,
      analysis.composition.hasEdgeDistractions,
    ),
  );

  const needDetail =
    soft || lowRes || issues.has("missing_detail") || analysis.quality.needsEnhancement;
  layers.push(
    layer(
      "detail_recovery",
      [needDetail ? "detail_recovery_needed" : "detail_ok"],
      conf,
      needDetail,
    ),
  );

  layers.push(
    layer(
      "artifacts",
      [
        compressed ? "compression" : "",
        analysis.faces.hasArtifacts ? "face_artifacts" : "",
      ].filter(Boolean),
      conf,
      compressed || analysis.faces.hasArtifacts,
    ),
  );

  const score = analysis.quality.overallScore ?? 0.7;
  layers.push(
    layer(
      "overall_quality",
      [`score=${score.toFixed(2)}`],
      conf,
      score < 0.85 || analysis.quality.needsEnhancement,
    ),
  );

  return {
    layers,
    qualityScore: score,
    analysisConfidence: conf,
  };
}
