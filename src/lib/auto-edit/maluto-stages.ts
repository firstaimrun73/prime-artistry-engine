/**
 * Maluto AI — multi-layer analysis structuring (pure, no provider calls).
 * Derives Stages 1–3 + Layers 4–8 from a single Gemini vision response.
 */
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";

export type MalutoStage1Technical = {
  width?: number;
  height?: number;
  imageType: string;
  qualityNotes: string[];
  confidence: number;
};

export type MalutoStage2Understanding = {
  imageType: string;
  subjects: string[];
  preserveElements: string[];
  compositionNotes: string[];
  vintageLikely: boolean;
  foregroundNotes: string[];
  backgroundNotes: string[];
};

export type MalutoStage3Defects = {
  issues: string[];
  recommendedActions: string[];
  restorationNeeded: boolean;
  colorRestorationNeeded: boolean;
  faceImprovementNeeded: boolean;
  backgroundCleanupNeeded: boolean;
  distractionsToRemove: string[];
  cropNeeded: boolean;
  cropInstruction: string;
  scratchLikely: boolean;
  tearLikely: boolean;
  fadeLikely: boolean;
  blurLikely: boolean;
};

export type MalutoLayer4Identity = {
  mustPreserve: string[];
  facialCare: boolean;
  avoidInvention: string[];
};

export type MalutoLayer5Localized = {
  damagedRegions: string[];
  healthyRegions: string[];
  colorCorrectionAreas: string[];
  detailRecoveryAreas: string[];
};

export type MalutoLayer6Decision = {
  operations: string[];
  skipOperations: string[];
  rationale: string;
};

export type MalutoAnalysisBundle = {
  stage1: MalutoStage1Technical;
  stage2: MalutoStage2Understanding;
  stage3: MalutoStage3Defects;
  layer4: MalutoLayer4Identity;
  layer5: MalutoLayer5Localized;
  layer6: MalutoLayer6Decision;
  noChange: boolean;
  confidence: number;
  restorationPrompt: string;
};

const QUALITY_ISSUE_HINTS = [
  "blur", "noise", "soft", "compress", "pixel", "resolution",
  "exposure", "contrast", "bright", "dark", "grain", "artifact",
];

function isQualityIssue(issue: string): boolean {
  const s = issue.toLowerCase();
  return QUALITY_ISSUE_HINTS.some((h) => s.includes(h));
}

function hasAny(issues: string[], re: RegExp): boolean {
  return issues.some((i) => re.test(i));
}

export function buildMalutoStages(
  analysis: GeminiAutoEditAnalysis,
  dims?: { width?: number; height?: number },
): MalutoAnalysisBundle {
  const qualityNotes = analysis.issues.filter(isQualityIssue).slice(0, 8);
  const contentIssues = analysis.issues.filter((i) => !isQualityIssue(i)).slice(0, 10);
  const allIssues = analysis.issues;

  const stage1: MalutoStage1Technical = {
    width: dims?.width,
    height: dims?.height,
    imageType: analysis.image_type || "photo",
    qualityNotes: qualityNotes.length
      ? qualityNotes
      : analysis.issues.length
        ? analysis.issues.slice(0, 4)
        : ["No major technical quality issues detected"],
    confidence: analysis.confidence,
  };

  const stage2: MalutoStage2Understanding = {
    imageType: analysis.image_type || "photo",
    subjects: [
      analysis.face_improvement_needed ? "Visible face(s) requiring careful preservation" : "",
      analysis.image_type === "portrait" ? "Portrait subject" : "",
      analysis.image_type === "old_photo" ? "Historical / vintage photograph character" : "",
    ].filter(Boolean),
    preserveElements: analysis.preserve_elements?.length
      ? analysis.preserve_elements
      : ["identity", "faces", "skin_tone", "pose", "clothing", "composition", "natural appearance"],
    compositionNotes: analysis.composition_adjustments?.slice(0, 6) ?? [],
    vintageLikely:
      analysis.image_type === "old_photo" ||
      analysis.restoration_needed ||
      hasAny(allIssues, /scratch|tear|fade|vintage|old/i),
    foregroundNotes: analysis.face_improvement_needed
      ? ["Primary subject / face in foreground"]
      : ["Primary subject region"],
    backgroundNotes: analysis.background_cleanup_needed
      ? ["Background may need light cleanup of distractions only"]
      : ["Background should remain largely unchanged"],
  };

  const stage3: MalutoStage3Defects = {
    issues: contentIssues.length ? contentIssues : analysis.issues.slice(0, 10),
    recommendedActions: analysis.recommended_actions.slice(0, 8),
    restorationNeeded: analysis.restoration_needed,
    colorRestorationNeeded: analysis.color_restoration_needed,
    faceImprovementNeeded: analysis.face_improvement_needed,
    backgroundCleanupNeeded: analysis.background_cleanup_needed,
    distractionsToRemove: analysis.distractions_to_remove ?? [],
    cropNeeded: analysis.crop_needed,
    cropInstruction: analysis.crop_instruction || "",
    scratchLikely: hasAny(allIssues, /scratch|scuff|mark/i),
    tearLikely: hasAny(allIssues, /tear|rip|missing|hole/i),
    fadeLikely: analysis.color_restoration_needed || hasAny(allIssues, /fade|discolor|yellow|sepia/i),
    blurLikely: hasAny(allIssues, /blur|soft|out of focus/i),
  };

  const layer4: MalutoLayer4Identity = {
    mustPreserve: stage2.preserveElements.slice(0, 12),
    facialCare: !!analysis.face_improvement_needed || analysis.image_type === "portrait",
    avoidInvention: [
      "Do not invent missing facial features",
      "Do not replace or age subjects",
      "Do not add people or objects not present",
      "Do not change clothing or pose",
    ],
  };

  const damaged: string[] = [];
  const healthy: string[] = ["Overall structure and composition"];
  if (stage3.scratchLikely || stage3.tearLikely) damaged.push("Surface damage regions (scratches/tears)");
  if (stage3.faceImprovementNeeded) damaged.push("Facial detail recovery zones");
  if (stage3.fadeLikely) damaged.push("Faded / discolored areas");
  if (stage3.blurLikely) damaged.push("Soft / low-detail regions");
  if (stage3.backgroundCleanupNeeded) damaged.push("Background distraction spots");
  if (!stage3.faceImprovementNeeded) healthy.push("Facial identity regions (leave natural)");
  if (!stage3.backgroundCleanupNeeded) healthy.push("Background structure");

  const layer5: MalutoLayer5Localized = {
    damagedRegions: damaged.length ? damaged : ["No strong localized damage signals"],
    healthyRegions: healthy,
    colorCorrectionAreas: stage3.fadeLikely || stage3.colorRestorationNeeded
      ? ["Faded / shifted colour regions"]
      : [],
    detailRecoveryAreas: stage3.faceImprovementNeeded || stage3.blurLikely
      ? ["Faces and soft detail areas (conservative)"]
      : [],
  };

  const ops: string[] = [];
  const skip: string[] = [];
  if (stage3.restorationNeeded || stage3.scratchLikely || stage3.tearLikely) {
    ops.push("repair scratches, tears, dust, stains, and damaged surface regions");
  } else {
    skip.push("heavy structural reconstruction");
  }
  if (stage3.colorRestorationNeeded || stage3.fadeLikely) {
    ops.push("restore faded or shifted colours naturally");
  } else {
    skip.push("global recolor / artistic grade");
  }
  if (stage3.faceImprovementNeeded) {
    ops.push("gently improve face clarity without changing identity, age, or expression");
  } else {
    skip.push("facial beautification");
  }
  if (stage3.backgroundCleanupNeeded) {
    ops.push("clean only clearly distracting background clutter");
  } else {
    skip.push("background replacement or heavy cleanup");
  }
  if (stage3.blurLikely) {
    ops.push("conservative detail enhancement on soft regions only");
  }
  for (const a of stage3.recommendedActions.slice(0, 4)) ops.push(a);

  const layer6: MalutoLayer6Decision = {
    operations: ops,
    skipOperations: skip,
    rationale: ops.length
      ? `Apply only: ${ops.slice(0, 4).join("; ")}`
      : "Minimal intervention — preserve original character",
  };

  const restorationPrompt = buildIntelligentRestorationPrompt(
    analysis, stage1, stage2, stage3, layer4, layer5, layer6,
  );

  return {
    stage1, stage2, stage3, layer4, layer5, layer6,
    noChange: analysis.no_change,
    confidence: analysis.confidence,
    restorationPrompt,
  };
}

export function buildIntelligentRestorationPrompt(
  analysis: GeminiAutoEditAnalysis,
  stage1: MalutoStage1Technical,
  stage2: MalutoStage2Understanding,
  stage3: MalutoStage3Defects,
  layer4: MalutoLayer4Identity,
  layer5: MalutoLayer5Localized,
  layer6: MalutoLayer6Decision,
  userRequest?: string,
): string {
  if (analysis.no_change) return "";

  const base = (analysis.final_edit_prompt || "").trim();
  const parts: string[] = [];

  if (userRequest?.trim()) {
    parts.push(`User request (honour if compatible with the photo): ${userRequest.trim().slice(0, 400)}`);
  }
  if (base) parts.push(base);
  else parts.push("Restore and enhance this photograph based on detected defects only.");

  if (layer6.operations.length) {
    parts.push(`Required repairs only: ${layer6.operations.join("; ")}.`);
  }
  if (layer6.skipOperations.length) {
    parts.push(`Avoid: ${layer6.skipOperations.join("; ")}.`);
  }
  if (layer5.damagedRegions.length && !layer5.damagedRegions[0].startsWith("No strong")) {
    parts.push(`Focus repair on: ${layer5.damagedRegions.join("; ")}.`);
  }
  if (layer5.healthyRegions.length) {
    parts.push(`Leave healthy: ${layer5.healthyRegions.join("; ")}.`);
  }
  if (stage1.qualityNotes.length) {
    parts.push(`Technical notes: ${stage1.qualityNotes.slice(0, 5).join("; ")}.`);
  }

  const preserve = layer4.mustPreserve.slice(0, 10).join(", ");
  parts.push(`MUST preserve: ${preserve || "identity, faces, pose, clothing, composition, natural skin tone"}.`);
  if (layer4.facialCare) {
    parts.push("Facial identity and expression must remain unchanged.");
  }
  parts.push("Do NOT redesign the photo, invent missing people/objects, change faces, add text/watermarks, or apply plastic skin.");
  if (stage3.cropNeeded && stage3.cropInstruction) {
    parts.push(`Crop only if essential: ${stage3.cropInstruction}`);
  } else {
    parts.push("Keep the full original frame and aspect ratio.");
  }
  parts.push("Natural photorealistic result. HD quality, no artificial upscaling.");

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 3500);
}

export function assessRestorationOutput(opts: {
  inputUrl: string;
  outputUrl: string;
  expectedChange: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!opts.outputUrl || typeof opts.outputUrl !== "string") {
    return { ok: false, reasons: ["Missing output URL"] };
  }
  if (!opts.outputUrl.startsWith("https://")) {
    return { ok: false, reasons: ["Output is not a valid HTTPS URL"] };
  }
  if (opts.expectedChange && opts.outputUrl === opts.inputUrl) {
    reasons.push("Output matches original while changes were expected");
  }
  return { ok: reasons.length === 0, reasons };
}
