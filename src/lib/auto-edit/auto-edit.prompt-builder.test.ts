import { describe, expect, it } from "vitest";
import type { ImageAnalysisResult } from "./types";
import { buildAnalysisLayers } from "./auto-edit.layers.server";
import {
  buildSingleAutoEditPrompt,
  matchImprovements,
} from "./auto-edit.prompt-builder.server";
import { AUTO_EDIT_PROMPT_LIBRARY } from "./auto-edit.prompt-library";
import { validateStandaloneAutoEditInput } from "./auto-edit.validation";

function baseAnalysis(overrides: Partial<ImageAnalysisResult> = {}): ImageAnalysisResult {
  return {
    dimensions: { width: 1200, height: 900, aspectRatio: 4 / 3, megapixels: 1.08 },
    scene: "other",
    people: {
      count: 0,
      hasPrimarySubject: true,
      hasSecondaryPeople: false,
      hasBackgroundPeople: false,
      hasPhotobombers: false,
      hasPartiallyVisiblePeople: false,
    },
    faces: {
      detected: false,
      count: 0,
      primaryFaceVisible: false,
      blurry: false,
      hasArtifacts: false,
      redEye: false,
      poorLighting: false,
      occluded: false,
    },
    background: {
      isCluttered: false,
      hasDistractingElements: false,
      hasUnwantedObjects: false,
      hasDamagedRegions: false,
      hasInconsistentLighting: false,
    },
    quality: {
      issues: [],
      restorationIssues: [],
      isOldPhoto: false,
      overallScore: 0.85,
      needsRestoration: false,
      needsEnhancement: false,
    },
    lighting: {
      isUnderexposed: false,
      isOverexposed: false,
      isUneven: false,
      hasHighlightClipping: false,
      hasShadowClipping: false,
      colorTemperatureOff: false,
    },
    composition: {
      horizonStraight: true,
      subjectWellPlaced: true,
      hasEdgeDistractions: false,
      hasExcessiveEmptySpace: false,
    },
    analysisConfidence: 0.8,
    rawVisionResponse: "test",
    ...overrides,
  };
}

describe("AUTO_EDIT_PROMPT_LIBRARY", () => {
  it("has at least 30 improvement entries", () => {
    expect(Object.keys(AUTO_EDIT_PROMPT_LIBRARY).length).toBeGreaterThanOrEqual(30);
  });
});

describe("matchImprovements", () => {
  it("selects DEBLUR for blurry images", () => {
    const a = baseAnalysis({
      quality: {
        issues: ["blur"],
        restorationIssues: [],
        isOldPhoto: false,
        overallScore: 0.5,
        needsRestoration: false,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(matched.some((id) => id === "DEBLUR" || id === "MOTION_DEBLUR" || id === "DEFOCUS_RECOVERY")).toBe(
      true,
    );
  });

  it("selects restoration for old damaged photos", () => {
    const a = baseAnalysis({
      quality: {
        issues: [],
        restorationIssues: ["scratches", "damaged_regions"],
        isOldPhoto: true,
        overallScore: 0.4,
        needsRestoration: true,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(matched).toContain("OLD_PHOTO_RESTORATION");
    expect(matched.some((id) => id === "SCRATCH_REPAIR" || id === "DAMAGE_REPAIR")).toBe(true);
  });

  it("selects noise reduction for noisy images", () => {
    const a = baseAnalysis({
      quality: {
        issues: ["noise"],
        restorationIssues: [],
        isOldPhoto: false,
        overallScore: 0.55,
        needsRestoration: false,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(matched.some((id) => id === "DENOISE" || id === "NOISE_REDUCTION")).toBe(true);
  });

  it("selects exposure fix for underexposed images", () => {
    const a = baseAnalysis({
      lighting: {
        isUnderexposed: true,
        isOverexposed: false,
        isUneven: false,
        hasHighlightClipping: false,
        hasShadowClipping: true,
        colorTemperatureOff: false,
      },
      quality: {
        issues: ["underexposed"],
        restorationIssues: [],
        isOldPhoto: false,
        overallScore: 0.5,
        needsRestoration: false,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(
      matched.some(
        (id) =>
          id === "UNDEREXPOSURE_FIX" || id === "EXPOSURE_FIX" || id === "SHADOW_RECOVERY",
      ),
    ).toBe(true);
  });

  it("selects low-res recovery", () => {
    const a = baseAnalysis({
      dimensions: { width: 400, height: 300, aspectRatio: 4 / 3, megapixels: 0.12 },
      quality: {
        issues: ["low_resolution"],
        restorationIssues: [],
        isOldPhoto: false,
        overallScore: 0.45,
        needsRestoration: false,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(
      matched.some((id) => id === "LOW_RESOLUTION_RECOVERY" || id === "UPSCALE_DETAIL"),
    ).toBe(true);
  });

  it("selects face detail for blurry faces", () => {
    const a = baseAnalysis({
      faces: {
        detected: true,
        count: 1,
        primaryFaceVisible: true,
        blurry: true,
        hasArtifacts: false,
        redEye: false,
        poorLighting: false,
        occluded: false,
      },
      quality: {
        issues: ["blur"],
        restorationIssues: [],
        isOldPhoto: false,
        overallScore: 0.5,
        needsRestoration: false,
        needsEnhancement: true,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(
      matched.some((id) => id === "FACE_DETAIL_RECOVERY" || id === "FACE_CLARITY"),
    ).toBe(true);
  });

  it("caps matched improvements and still produces one prompt", () => {
    const a = baseAnalysis({
      quality: {
        issues: ["blur", "noise", "underexposed", "low_resolution", "compression_artifacts"],
        restorationIssues: ["scratches"],
        isOldPhoto: true,
        overallScore: 0.3,
        needsRestoration: true,
        needsEnhancement: true,
      },
      lighting: {
        isUnderexposed: true,
        isOverexposed: false,
        isUneven: true,
        hasHighlightClipping: false,
        hasShadowClipping: true,
        colorTemperatureOff: true,
      },
      faces: {
        detected: true,
        count: 1,
        primaryFaceVisible: true,
        blurry: true,
        hasArtifacts: true,
        redEye: false,
        poorLighting: true,
        occluded: false,
      },
    });
    const layers = buildAnalysisLayers(a);
    const matched = matchImprovements(a, layers);
    expect(matched.length).toBeLessThanOrEqual(6);
    const { prompt, improvementsApplied } = buildSingleAutoEditPrompt(matched);
    expect(improvementsApplied).toBe(matched.length || 1);
    expect(prompt).toContain("Improve the supplied photograph naturally");
    expect(prompt.split("Priority").length).toBeGreaterThanOrEqual(1);
  });
});

describe("validateStandaloneAutoEditInput", () => {
  it("accepts https URLs", () => {
    const r = validateStandaloneAutoEditInput({
      imageUrl: "https://example.com/photo.jpg",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects http, data, javascript, file", () => {
    for (const bad of [
      "http://evil.com/x.jpg",
      "data:image/png;base64,aaa",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "blob:https://x",
    ]) {
      const r = validateStandaloneAutoEditInput({ imageUrl: bad });
      expect(r.ok).toBe(false);
    }
  });
});
