/**
 * Conservative Auto Edit decision engine.
 * Low confidence → NO_CHANGE. Caps operations. Respects risk with faces present.
 * Plans are automatic: defaultSelected ops are applied without user choosing tools.
 */

import type { ImageAnalysisResult } from "./types";
import {
  AUTO_EDIT_OPERATIONS,
  sortOperationsByPriority,
  type AutoEditOperationId,
} from "./operations";

export const AUTO_EDIT_MAX_OPERATIONS = 4;
export const AUTO_EDIT_MIN_CONFIDENCE = 0.35;

export type AutoEditPlanStatus = "READY" | "NO_CHANGE";

export type AutoEditPlannedOp = {
  id: AutoEditOperationId;
  title: string;
  description: string;
  reason: string;
  priority: number;
  risk: "low" | "medium" | "high";
  defaultSelected: boolean;
};

export type AutoEditPlan = {
  status: AutoEditPlanStatus;
  confidence: number;
  detectedIssues: string[];
  operations: AutoEditPlannedOp[];
  message: string;
};

function pushOp(
  list: AutoEditPlannedOp[],
  id: AutoEditOperationId,
  reason: string,
  defaultSelected: boolean,
) {
  if (list.some((o) => o.id === id)) return;
  const def = AUTO_EDIT_OPERATIONS[id];
  list.push({
    id,
    title: def.title,
    description: def.description,
    reason,
    priority: def.priority,
    risk: def.risk,
    defaultSelected,
  });
}

/**
 * Build a structured plan from analysis. Does not execute generation.
 */
export function buildAutoEditPlan(analysis: ImageAnalysisResult): AutoEditPlan {
  const confidence = analysis.analysisConfidence ?? 0;
  const detectedIssues: string[] = [];
  const ops: AutoEditPlannedOp[] = [];

  if (confidence < AUTO_EDIT_MIN_CONFIDENCE) {
    return {
      status: "NO_CHANGE",
      confidence,
      detectedIssues: [],
      operations: [],
      message:
        "Analysis confidence is too low for safe automatic edits. Upload a clearer photo or use the Image Editor.",
    };
  }

  const q = analysis.quality;
  const issues = q.issues ?? [];
  const rest = q.restorationIssues ?? [];
  const faces = analysis.faces;
  const lighting = analysis.lighting;
  const bg = analysis.background;
  const hasFace = faces?.detected === true;

  if (q.isOldPhoto || rest.length > 0) {
    detectedIssues.push(q.isOldPhoto ? "old_photo" : "damage");
    pushOp(
      ops,
      q.isOldPhoto ? "OLD_PHOTO_RESTORATION" : "PHOTO_RESTORATION",
      q.isOldPhoto ? "Aged or vintage photo signals" : "Physical damage signals",
      true,
    );
  }

  if (issues.includes("blur") || issues.includes("motion_blur") || issues.includes("defocus")) {
    detectedIssues.push("blur");
    pushOp(ops, "DEBLUR", "Blur or soft focus detected", true);
  }

  if (issues.includes("noise")) {
    detectedIssues.push("noise");
    pushOp(ops, "NOISE_REDUCTION", "Noise or grain detected", true);
  }

  if (issues.includes("compression_artifacts") || issues.includes("pixelation")) {
    detectedIssues.push("compression");
    pushOp(ops, "COMPRESSION_ARTIFACT_REDUCTION", "Compression artifacts detected", true);
  }

  if (lighting.isUnderexposed || issues.includes("underexposed")) {
    detectedIssues.push("underexposed");
    pushOp(ops, "EXPOSURE_CORRECTION", "Underexposure detected", true);
    pushOp(ops, "SHADOW_RECOVERY", "Dark shadows may need recovery", lighting.isUnderexposed);
  }

  if (lighting.isOverexposed || issues.includes("overexposed")) {
    detectedIssues.push("overexposed");
    pushOp(ops, "EXPOSURE_CORRECTION", "Overexposure detected", true);
    pushOp(ops, "HIGHLIGHT_RECOVERY", "Highlight clipping signals", lighting.hasHighlightClipping);
  }

  if (lighting.isUneven) {
    detectedIssues.push("uneven_lighting");
    pushOp(ops, "EXPOSURE_CORRECTION", "Uneven lighting detected", true);
  }

  if (hasFace && (faces.blurry || faces.poorLighting || faces.hasArtifacts)) {
    detectedIssues.push("face_quality");
    // High-risk: default on only when confidence is solid
    const faceDefault = confidence >= 0.55;
    pushOp(ops, "FACE_DETAIL_RESTORATION", "Face detail or lighting can be improved", faceDefault);
    pushOp(ops, "PORTRAIT_REPAIR", "Portrait cleanup suggested", faceDefault && faces.hasArtifacts);
  }

  if (bg.isCluttered || bg.hasDistractingElements || bg.hasUnwantedObjects) {
    detectedIssues.push("background");
    // Medium risk: auto only when confidence is high
    pushOp(ops, "BACKGROUND_CLEANUP", "Background clutter detected", confidence >= 0.65);
  }

  if (q.needsEnhancement || (q.overallScore > 0 && q.overallScore < 0.75)) {
    detectedIssues.push("quality");
    pushOp(ops, "IMAGE_ENHANCEMENT", "Overall quality can be improved", true);
  }

  if (
    issues.includes("low_resolution") ||
    (analysis.dimensions.megapixels > 0 && analysis.dimensions.megapixels < 1)
  ) {
    detectedIssues.push("low_resolution");
    pushOp(ops, "UPSCALE", "Low resolution signal", false);
  }

  // Conservative face gate: drop high-risk portrait ops if confidence mid-low
  let filtered = ops;
  if (hasFace && confidence < 0.5) {
    filtered = ops.filter((o) => o.risk !== "high");
  }

  // Sort and cap
  const orderedIds = sortOperationsByPriority(filtered.map((o) => o.id)).slice(
    0,
    AUTO_EDIT_MAX_OPERATIONS,
  );
  const capped = orderedIds
    .map((id) => filtered.find((o) => o.id === id)!)
    .filter(Boolean);

  if (capped.length === 0) {
    return {
      status: "NO_CHANGE",
      confidence,
      detectedIssues,
      operations: [],
      message: "No safe automatic improvements were recommended for this image.",
    };
  }

  const autoCount = capped.filter((o) => o.defaultSelected).length;

  return {
    status: "READY",
    confidence,
    detectedIssues: [...new Set(detectedIssues)],
    operations: capped,
    message:
      autoCount > 0
        ? `Automatic plan ready: ${autoCount} safe operation(s).`
        : `Plan ready with ${capped.length} optional operation(s); none auto-selected at this confidence.`,
  };
}

/** Operations marked defaultSelected, in priority order — used for fully automatic runs. */
export function automaticOperationsInOrder(plan: AutoEditPlan): AutoEditOperationId[] {
  const ids = plan.operations.filter((o) => o.defaultSelected).map((o) => o.id);
  return sortOperationsByPriority(ids);
}

export function selectedOperationsInOrder(
  plan: AutoEditPlan,
  selectedIds: Set<string>,
): AutoEditOperationId[] {
  const ids = plan.operations.filter((o) => selectedIds.has(o.id)).map((o) => o.id);
  return sortOperationsByPriority(ids);
}
