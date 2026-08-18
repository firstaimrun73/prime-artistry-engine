/**
 * MOTIO2EDIT Auto executor (server-only).
 *
 * ONE input image → analysis → ONE internal prompt → ONE generateMedia call.
 * Does not return the internal prompt to callers of the public result shape.
 */

import { analyzeImage } from "./analyze.server";
import { buildRuleBasedAnalysis } from "./ruleBasedAnalysis";
import { buildAnalysisLayers } from "./auto-edit.layers.server";
import {
  buildSingleAutoEditPrompt,
  matchImprovements,
} from "./auto-edit.prompt-builder.server";
import { validateStandaloneAutoEditInput } from "./auto-edit.validation";
import type { StandaloneAutoEditResult } from "./auto-edit.types";
import type { ImageQuality } from "@/lib/quality-options";
import { generateMedia } from "@/lib/generate.functions";

export type RunStandaloneAutoEditArgs = {
  imageUrl: string;
  imageQuality: ImageQuality;
  width?: number;
  height?: number;
};

/**
 * Full standalone pipeline. Credits + watermark remain inside generateMedia.
 */
export async function executeStandaloneAutoEdit(
  args: RunStandaloneAutoEditArgs,
): Promise<StandaloneAutoEditResult> {
  const validated = validateStandaloneAutoEditInput({ imageUrl: args.imageUrl });
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const dims = {
    width: args.width,
    height: args.height,
  };

  // Analysis: Anthropic vision when available; rule-based fallback (still structured).
  let analysis;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      analysis = await analyzeImage(validated.imageUrl, anthropicKey, dims);
    } catch (err) {
      console.warn(
        "[AutoEdit] Vision analysis failed, using rule-based fallback:",
        err instanceof Error ? err.message : err,
      );
      analysis = buildRuleBasedAnalysis(dims);
    }
  } else {
    analysis = buildRuleBasedAnalysis(dims);
  }

  const layers = buildAnalysisLayers(analysis);
  const matched = matchImprovements(analysis, layers);
  const { prompt, improvementsApplied } = buildSingleAutoEditPrompt(matched);

  // Single generation — never loop steps.
  // generateMedia owns credits, FAL routing, and server watermark policy.
  const res = await generateMedia({
    data: {
      prompt,
      type: "image",
      imageUrl: validated.imageUrl,
      sourceKind: "image",
      // Moderate edit strength for natural photo improvement
      strength: 0.45,
      imageQuality: args.imageQuality,
      // Standalone Auto: let plan policy decide watermark (free forced, paid via prefs not exposed here)
      keepWatermark: undefined,
    },
  });

  if (!res?.outputUrl) {
    throw new Error("Generation returned no image.");
  }

  return {
    success: true,
    outputUrl: res.outputUrl,
    changed: res.outputUrl !== validated.imageUrl,
    analysisSummary: {
      qualityScore: layers.qualityScore,
      improvementsApplied,
    },
    message: "Motio2edit Auto complete",
  };
}
