import type { ImageAnalysisResult } from "./types";

export type AutoImprovement = {
  id: string;
  title: string;
  reason: string;
  /** Prompt segment applied via existing generateMedia image-edit path */
  prompt: string;
  defaultSelected: boolean;
};

/**
 * Map structured analysis into selectable improvements.
 * Apply step still uses the existing FAL edit pipeline (not a new backend).
 */
export function buildImprovementsFromAnalysis(analysis: ImageAnalysisResult): AutoImprovement[] {
  const out: AutoImprovement[] = [];

  if (analysis.quality.needsRestoration || analysis.quality.isOldPhoto) {
    out.push({
      id: "restore",
      title: "Restore damage",
      reason: "Photo shows age or physical damage signals",
      prompt:
        "Restore this photo: repair scratches, fade, dust and damage while preserving the original look and subjects.",
      defaultSelected: true,
    });
  }

  if (analysis.quality.needsEnhancement || analysis.quality.overallScore < 0.75) {
    out.push({
      id: "enhance",
      title: "Enhance clarity",
      reason: "Overall quality can be improved",
      prompt:
        "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition, subject and colors identical.",
      defaultSelected: true,
    });
  }

  if (analysis.lighting.isUnderexposed || analysis.lighting.isOverexposed || analysis.lighting.isUneven) {
    out.push({
      id: "lighting",
      title: "Balance lighting",
      reason: "Exposure or lighting looks uneven",
      prompt:
        "Balance exposure and lighting: recover shadows and highlights naturally without changing the subject.",
      defaultSelected: true,
    });
  }

  if (analysis.lighting.colorTemperatureOff) {
    out.push({
      id: "color",
      title: "Color correction",
      reason: "White balance or color cast detected",
      prompt:
        "Correct white balance and colors for a natural, true-to-life look. Keep the subject unchanged.",
      defaultSelected: true,
    });
  }

  if (analysis.faces.detected && (analysis.faces.blurry || analysis.faces.poorLighting || analysis.faces.hasArtifacts)) {
    out.push({
      id: "face",
      title: "Face enhancement",
      reason: "Face detail or lighting can be improved",
      prompt:
        "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age.",
      defaultSelected: true,
    });
  }

  if (analysis.faces.redEye) {
    out.push({
      id: "redeye",
      title: "Red-eye correction",
      reason: "Red-eye detected",
      prompt: "Remove red-eye from the pupils while keeping natural eye color and identity.",
      defaultSelected: true,
    });
  }

  if (
    analysis.background.isCluttered ||
    analysis.background.hasDistractingElements ||
    analysis.background.hasUnwantedObjects
  ) {
    out.push({
      id: "clean-bg",
      title: "Clean background",
      reason: "Background distractions detected",
      prompt:
        "Clean and simplify the background: remove clutter and distractions while keeping the subject identical.",
      defaultSelected: false,
    });
  }

  if (analysis.people.hasPhotobombers || analysis.people.hasBackgroundPeople) {
    out.push({
      id: "remove-bg-people",
      title: "Remove background people",
      reason: "Extra people in the background",
      prompt:
        "Remove background people and photobombers; reconstruct the background naturally. Keep the primary subject identical.",
      defaultSelected: false,
    });
  }

  // Always offer a safe default polish if nothing specific matched
  if (out.length === 0) {
    out.push({
      id: "polish",
      title: "Professional polish",
      reason: "General improvement pass",
      prompt:
        "Apply a professional polish: subtle clarity, balanced exposure and natural color while keeping the subject and composition identical.",
      defaultSelected: true,
    });
  }

  return out;
}

export function composeImprovementPrompt(selected: AutoImprovement[]): string {
  if (selected.length === 0) {
    return "Apply a professional polish: subtle clarity, balanced exposure and natural color while keeping the subject identical.";
  }
  const parts = selected.map((s) => s.prompt);
  return (
    "Apply these improvements in one coherent edit, without changing identity or composition unless required: " +
    parts.join(" ")
  );
}
