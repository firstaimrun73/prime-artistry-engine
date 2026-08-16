import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeImage } from "./analyze.server";
import type { ImageAnalysisResult } from "./types";
import { buildAutoEditPlan, type AutoEditPlan } from "./decision";

const schema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  /** Optional real pixel size from the client image load */
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

function fallbackAnalysis(width = 0, height = 0): ImageAnalysisResult {
  const megapixels = width > 0 && height > 0 ? (width * height) / 1_000_000 : 0;
  return {
    dimensions: {
      width,
      height,
      aspectRatio: height > 0 ? width / height : 1,
      megapixels,
    },
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
      issues: ["missing_detail"],
      restorationIssues: [],
      isOldPhoto: false,
      overallScore: 0.65,
      needsRestoration: false,
      needsEnhancement: true,
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
    analysisConfidence: 0.4,
    rawVisionResponse:
      "Fallback analysis (vision API not configured). Offering standard polish improvements.",
  };
}

/**
 * Server entry for Auto Edit analysis + structured plan.
 * Does not charge credits — analysis only.
 */
export const analyzeForAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      analysis: ImageAnalysisResult;
      mode: "vision" | "fallback";
      plan: AutoEditPlan;
    }> => {
      const dims = {
        width: data.width ?? 0,
        height: data.height ?? 0,
      };

      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        const analysis = fallbackAnalysis(dims.width, dims.height);
        return { analysis, mode: "fallback", plan: buildAutoEditPlan(analysis) };
      }

      const analysis = await analyzeImage(data.imageUrl, key, dims);
      return { analysis, mode: "vision", plan: buildAutoEditPlan(analysis) };
    },
  );
