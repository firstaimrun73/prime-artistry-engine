/**
 * Auto Edit server route entry — analysis only (credits stay on generateMedia).
 * Client drives status animation: Analyzing → Applying Prompts → Generating → Output.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeImage } from "./analyze.server";
import { prepareAutoEditFromAnalysis } from "./pipeline.service";
import type { ImageAnalysisResult } from "./types";
import type { ImageQuality } from "@/lib/quality-options";

const schema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["hd", "2k", "4k"]).default("hd"),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

function fallbackAnalysis(width = 0, height = 0): ImageAnalysisResult {
  const megapixels = width > 0 && height > 0 ? (width * height) / 1_000_000 : 0;
  return {
    dimensions: { width, height, aspectRatio: height > 0 ? width / height : 1, megapixels },
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
      hasEdgeDistracted: false,
      hasExcessiveEmptySpace: false,
    },
    analysisConfidence: 0.4,
    rawVisionResponse: "Fallback analysis. Standard Motio2Auto polish.",
  };
}

/**
 * Analyze + prepare internal prompt steps (no user prompt accepted).
 */
export const prepareAutoEditRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const dims = { width: data.width ?? 0, height: data.height ?? 0 };
    const quality = (data.imageQuality ?? "hd") as ImageQuality;

    const key = process.env.ANTHROPIC_API_KEY;
    let analysis: ImageAnalysisResult;
    let mode: "vision" | "fallback" = "fallback";

    if (!key) {
      analysis = fallbackAnalysis(dims.width, dims.height);
    } else {
      analysis = await analyzeImage(data.imageUrl, key, dims);
      mode = "vision";
    }

    const prepared = prepareAutoEditFromAnalysis(analysis, quality, data.imageUrl);

    return {
      mode,
      analysisConfidence: analysis.analysisConfidence,
      detectedIssues: prepared.plan.detectedIssues,
      message: prepared.message,
      status: prepared.status,
      /** Steps for client to feed generateMedia — internalPrompt must not be shown in UI */
      steps: prepared.steps.map((s) => ({
        operationId: s.operationId,
        strength: s.strength,
        internalPrompt: s.internalPrompt,
      })),
    };
  });
