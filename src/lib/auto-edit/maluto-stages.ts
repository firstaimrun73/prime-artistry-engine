/**
 * Maluto AI — three-stage analysis structuring (pure).
 * Maps existing Gemini vision analysis into Stage 1/2/3 records
 * and builds a conservative restoration instruction.
 * Does not call providers.
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
};

export type MalutoAnalysisBundle = {
  stage1: MalutoStage1Technical;
  stage2: MalutoStage2Understanding;
  stage3: MalutoStage3Defects;
  noChange: boolean;
  confidence: number;
  /** Instruction for the restoration model */
  restorationPrompt: string;
};

const QUALITY_ISSUE_HINTS = [
  "blur",
  "noise",
  "soft",
  "compress",
  "pixel",
  "resolution",
  "exposure",
  "contrast",
  "bright",
  "dark",
  "grain",
  "artifact",
];

function isQualityIssue(issue: string): boolean {
  const s = issue.toLowerCase();
  return QUALITY_ISSUE_HINTS.some((h) => s.includes(h));
}

/**
 * Structure vision analysis into the three Maluto stages.
 */
export function buildMalutoStages(
  analysis: GeminiAutoEditAnalysis,
  dims?: { width?: number; height?: number },
): MalutoAnalysisBundle {
  const qualityNotes = analysis.issues.filter(isQualityIssue).slice(0, 8);
  const contentIssues = analysis.issues.filter((i) => !isQualityIssue(i)).slice(0, 10);

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
      analysis.issues.some((i) => /scratch|tear|fade|vintage|old/i.test(i)),
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
  };

  const restorationPrompt = buildIntelligentRestorationPrompt(analysis, stage1, stage2, stage3);

  return {
    stage1,
    stage2,
    stage3,
    noChange: analysis.no_change,
    confidence: analysis.confidence,
    restorationPrompt,
  };
}

/**
 * Intelligent restoration instruction: only needed ops, strong preservation locks.
 */
export function buildIntelligentRestorationPrompt(
  analysis: GeminiAutoEditAnalysis,
  stage1: MalutoStage1Technical,
  stage2: MalutoStage2Understanding,
  stage3: MalutoStage3Defects,
  userRequest?: string,
): string {
  if (analysis.no_change) return "";

  const base = (analysis.final_edit_prompt || "").trim();
  const parts: string[] = [];

  if (userRequest?.trim()) {
    parts.push(`User request (honour if compatible with the photo): ${userRequest.trim().slice(0, 400)}`);
  }

  if (base) {
    parts.push(base);
  } else {
    parts.push("Restore and enhance this photograph based on detected defects only.");
  }

  const ops: string[] = [];
  if (stage3.restorationNeeded) ops.push("repair scratches, tears, dust, stains, and damaged regions");
  if (stage3.colorRestorationNeeded) ops.push("restore faded or shifted colours naturally");
  if (stage3.faceImprovementNeeded)
    ops.push("gently improve face clarity without changing identity, age, or expression");
  if (stage3.backgroundCleanupNeeded) ops.push("clean only clearly distracting background clutter");
  for (const a of stage3.recommendedActions.slice(0, 5)) {
    ops.push(a);
  }
  if (ops.length) {
    parts.push(`Required repairs only: ${ops.join("; ")}.`);
  }

  if (stage1.qualityNotes.length) {
    parts.push(`Technical notes: ${stage1.qualityNotes.slice(0, 5).join("; ")}.`);
  }

  const preserve = stage2.preserveElements.slice(0, 10).join(", ");
  parts.push(
    `MUST preserve: ${preserve || "identity, faces, pose, clothing, composition, natural skin tone"}.`,
  );
  parts.push(
    "Do NOT redesign the photo, invent missing people/objects, change faces, add text/watermarks, or apply plastic skin.",
  );
  if (stage3.cropNeeded && stage3.cropInstruction) {
    parts.push(`Crop only if essential: ${stage3.cropInstruction}`);
  } else {
    parts.push("Keep the full original frame and aspect ratio.");
  }
  parts.push("Natural photorealistic result.");

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 3500);
}

/** Lightweight post-restore usability checks (no second paid vision call). */
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
