import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeImage } from "./analyze.server";
import type { ImageAnalysisResult } from "./types";

const schema = z.object({
  imageUrl: z.string().url().max(15_000_000),
});

/**
 * Server entry for Auto Edit analysis.
 * Uses existing analyze.server (Anthropic vision when key present).
 * Does not charge credits — analysis only.
 */
export const analyzeForAutoEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<{ analysis: ImageAnalysisResult; mode: "vision" | "fallback" }> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      // Honest fallback when vision is not configured
      const analysis: ImageAnalysisResult = {
        dimensions: { width: 0, height: 0, aspectRatio: 1, megapixels: 0 },
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
        rawVisionResponse: "Fallback analysis (vision API not configured). Offering standard polish improvements.",
      };
      return { analysis, mode: "fallback" };
    }

    const analysis = await analyzeImage(data.imageUrl, key);
    return { analysis, mode: "vision" };
  });
