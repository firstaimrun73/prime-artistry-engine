/**
 * MOTIO2EDIT Auto executor (server-only).
 *
 * ONE input → analysis → layers → match → ONE internal prompt
 * → ONE fixed Kontext generation (via runFixedImageEdit)
 * → safe client result (no prompt leak)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
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
import { runFixedImageEdit } from "@/lib/generation/fixed-image-edit.server";

export type RunStandaloneAutoEditArgs = {
  imageUrl: string;
  imageQuality: ImageQuality;
  width?: number;
  height?: number;
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  userId: string;
  profile: { plan: string; credits: number; email?: string | null };
  isAdmin: boolean;
};

/** Hard invariant: generation is invoked at most once per run. */
let __generationCallsThisRequest = 0;

export async function executeStandaloneAutoEdit(
  args: RunStandaloneAutoEditArgs,
): Promise<StandaloneAutoEditResult> {
  __generationCallsThisRequest = 0;

  const validated = validateStandaloneAutoEditInput({ imageUrl: args.imageUrl });
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const dims = { width: args.width, height: args.height };

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

  // Good image: skip AI when score is high and matcher has nothing substantial
  const attentionLayers = layers.layers.filter((l) => l.needsAttention);
  const onlyPolish =
    matched.length === 0 ||
    (matched.length === 1 && matched[0] === "NATURAL_PHOTO_POLISH");
  if (layers.qualityScore >= 0.92 && attentionLayers.length === 0 && onlyPolish) {
    return {
      success: true,
      outputUrl: validated.imageUrl,
      changed: false,
      analysisSummary: {
        qualityScore: layers.qualityScore,
        improvementsApplied: 0,
      },
      message: "No significant issues detected — original returned.",
    };
  }

  const { prompt, improvementsApplied } = buildSingleAutoEditPrompt(matched);

  __generationCallsThisRequest += 1;
  if (__generationCallsThisRequest !== 1) {
    throw new Error("Auto Edit invariant: generation must run exactly once.");
  }

  const gen = await runFixedImageEdit({
    supabase: args.supabase,
    supabaseAdmin: args.supabaseAdmin,
    userId: args.userId,
    profile: args.profile,
    isAdmin: args.isAdmin,
    internalPrompt: prompt,
    imageUrl: validated.imageUrl,
    imageQuality: args.imageQuality,
  });

  return {
    success: true,
    outputUrl: gen.outputUrl,
    changed: gen.outputUrl !== validated.imageUrl,
    analysisSummary: {
      qualityScore: layers.qualityScore,
      improvementsApplied,
    },
    message: "Motio2edit Auto complete",
  };
}
