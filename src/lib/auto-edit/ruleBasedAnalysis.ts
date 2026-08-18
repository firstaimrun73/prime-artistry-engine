/**
 * Rule-based Auto Edit analysis — NO external vision / Anthropic API.
 *
 * Builds a structured ImageAnalysisResult from dimensions and optional
 * client-side signals so decision.ts can select operations.
 *
 * Designed to be extended: add new signals / branches without calling LLMs.
 */

import type { ImageAnalysisResult, SceneType } from "./types";

export type RuleBasedAnalysisInput = {
  width?: number;
  height?: number;
  /** Optional 0–1 luminance from client canvas sampling */
  avgLuminance?: number;
  /** Optional 0–1 approximate contrast from client */
  contrastScore?: number;
  /** Hint from filename or client (e.g. "portrait", "night") */
  sceneHint?: string;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function inferScene(width: number, height: number, hint?: string): SceneType {
  const h = (hint ?? "").toLowerCase();
  if (/night|dark|low.?light/.test(h)) return "night";
  if (/portrait|selfie|face|person/.test(h)) return "portrait";
  if (/food|meal|dish/.test(h)) return "food";
  if (/product|packshot|sku/.test(h)) return "product";
  if (/doc|scan|receipt/.test(h)) return "document";
  if (/animal|pet|dog|cat/.test(h)) return "animal";
  if (width > 0 && height > 0) {
    const ar = width / height;
    if (ar < 0.85) return "portrait";
    if (ar > 1.4) return "landscape";
  }
  return "other";
}

/**
 * Substantial conditional analysis program.
 * Does not call network APIs. Safe for server and pure unit testing.
 */
export function buildRuleBasedAnalysis(input: RuleBasedAnalysisInput): ImageAnalysisResult {
  const width = input.width && input.width > 0 ? input.width : 0;
  const height = input.height && input.height > 0 ? input.height : 0;
  const megapixels = width > 0 && height > 0 ? (width * height) / 1_000_000 : 0;
  const aspectRatio = height > 0 ? width / height : 1;
  const scene = inferScene(width, height, input.sceneHint);

  const lum = input.avgLuminance != null ? clamp01(input.avgLuminance) : null;
  const contrast = input.contrastScore != null ? clamp01(input.contrastScore) : null;

  const isUnderexposed = lum != null ? lum < 0.32 : false;
  const isOverexposed = lum != null ? lum > 0.82 : false;
  const isUneven =
    contrast != null ? contrast > 0.72 && lum != null && lum > 0.25 && lum < 0.75 : false;
  const isLowLight = isUnderexposed || scene === "night";

  // Approximate soft focus / noise without a vision model:
  // low res + low contrast often correlates with soft or grainy phone shots.
  const softFocusHeuristic =
    (megapixels > 0 && megapixels < 1.2) ||
    (contrast != null && contrast < 0.28) ||
    (isLowLight && megapixels > 0 && megapixels < 2);
  const noiseHeuristic =
    isLowLight || (megapixels > 0 && megapixels < 0.6 && contrast != null && contrast > 0.55);

  const issues: string[] = [];
  const restorationIssues: string[] = [];

  if (megapixels > 0 && megapixels < 0.9) issues.push("low_resolution");
  if (megapixels > 0 && megapixels < 0.35) issues.push("missing_detail");
  if (softFocusHeuristic) {
    issues.push("blur");
    issues.push("missing_detail");
  }
  if (noiseHeuristic) issues.push("noise");
  if (isUnderexposed) issues.push("underexposed");
  if (isOverexposed) issues.push("overexposed");
  if (contrast != null && contrast < 0.22) issues.push("low_contrast");
  if (issues.length === 0) issues.push("missing_detail");

  const likelyPortrait = scene === "portrait" || (aspectRatio > 0 && aspectRatio < 0.9);
  const peopleCount = likelyPortrait ? 1 : 0;
  const faceDetected = likelyPortrait;

  let overallScore = 0.72;
  if (isUnderexposed || isOverexposed) overallScore -= 0.12;
  if (contrast != null && contrast < 0.25) overallScore -= 0.1;
  if (megapixels > 0 && megapixels < 1) overallScore -= 0.08;
  if (softFocusHeuristic) overallScore -= 0.08;
  if (noiseHeuristic) overallScore -= 0.05;
  if (issues.includes("missing_detail")) overallScore -= 0.05;
  overallScore = clamp01(overallScore);

  let analysisConfidence = width > 0 && height > 0 ? 0.62 : 0.48;
  if (lum != null) analysisConfidence += 0.08;
  if (contrast != null) analysisConfidence += 0.05;
  analysisConfidence = clamp01(analysisConfidence);

  const needsEnhancement =
    overallScore < 0.8 ||
    issues.length > 0 ||
    isLowLight ||
    softFocusHeuristic ||
    (contrast != null && contrast < 0.3);

  return {
    dimensions: { width, height, aspectRatio, megapixels },
    scene,
    people: {
      count: peopleCount,
      hasPrimarySubject: true,
      hasSecondaryPeople: false,
      hasBackgroundPeople: false,
      hasPhotobombers: false,
      hasPartiallyVisiblePeople: false,
    },
    faces: {
      detected: faceDetected,
      count: faceDetected ? 1 : 0,
      primaryFaceVisible: faceDetected,
      blurry: softFocusHeuristic && faceDetected,
      hasArtifacts: false,
      redEye: false,
      poorLighting: isLowLight && faceDetected,
      occluded: false,
    },
    background: {
      isCluttered: false,
      hasDistractingElements: false,
      hasUnwantedObjects: false,
      hasDamagedRegions: false,
      hasInconsistentLighting: isUneven,
    },
    quality: {
      issues,
      restorationIssues,
      isOldPhoto: false,
      overallScore,
      needsRestoration: false,
      needsEnhancement,
    },
    lighting: {
      isUnderexposed,
      isOverexposed,
      isUneven,
      hasHighlightClipping: isOverexposed,
      hasShadowClipping: isUnderexposed,
      colorTemperatureOff: false,
    },
    composition: {
      horizonStraight: true,
      subjectWellPlaced: true,
      hasEdgeDistractions: false,
      hasExcessiveEmptySpace: aspectRatio > 2.2,
    },
    analysisConfidence,
    rawVisionResponse: [
      "rule-based",
      `scene=${scene}`,
      `mp=${megapixels.toFixed(2)}`,
      lum != null ? `lum=${lum.toFixed(2)}` : null,
      contrast != null ? `contrast=${contrast.toFixed(2)}` : null,
      softFocusHeuristic ? "softFocus=1" : null,
      noiseHeuristic ? "noise=1" : null,
      `issues=${issues.join(",")}`,
    ]
      .filter(Boolean)
      .join("; "),
  };
}
