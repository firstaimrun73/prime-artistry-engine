/**
 * MOTIO2EDIT Auto executor (server-only).
 *
 * Pipeline:
 *   ONE image → vision analysis (Claude) or rule fallback
 *            → deterministic layer validation
 *            → improvement match + ONE internal prompt
 *            → ONE fal.ai Kontext generation
 *            → watermark → charge AUTO_EDIT_CREDIT_COST once
 *
 * User never supplies a prompt. Internal prompts never return to the client.
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
import { AUTO_EDIT_CREDIT_COST, labelImprovement, labelIssue } from "./constants";
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

  // Pre-check credits for the fixed Auto Edit job (before expensive analysis)
  if (!args.isAdmin && args.profile.credits < AUTO_EDIT_CREDIT_COST) {
    throw new Error(
      `Not enough credits. Auto Edit costs ${AUTO_EDIT_CREDIT_COST} credits per job.`,
    );
  }

  const dims = { width: args.width, height: args.height };

  // —— Analysis layer (LLM vision preferred; deterministic fallback) ——
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

  // —— Deterministic validation / planner ——
  const layers = buildAnalysisLayers(analysis);
  const matched = matchImprovements(analysis, layers);

  const issueIds = [
    ...(analysis.quality.issues ?? []),
    ...(analysis.quality.restorationIssues ?? []),
  ];
  const detectedIssues = [...new Set(issueIds.map(labelIssue))].slice(0, 8);
  const recommended = matched.map(labelImprovement).slice(0, 6);

  const attentionLayers = layers.layers.filter((l) => l.needsAttention);
  const onlyPolish =
    matched.length === 0 ||
    (matched.length === 1 && matched[0] === "NATURAL_PHOTO_POLISH");

  // NO_CHANGE: high quality + nothing substantial — do not charge
  if (layers.qualityScore >= 0.92 && attentionLayers.length === 0 && onlyPolish) {
    return {
      success: true,
      outputUrl: validated.imageUrl,
      changed: false,
      status: "NO_CHANGE",
      creditsCharged: 0,
      analysisSummary: {
        qualityScore: layers.qualityScore,
        improvementsApplied: 0,
        needsEdit: false,
        confidence: layers.analysisConfidence,
        detectedIssues: detectedIssues.length ? detectedIssues : ["No significant issues"],
        recommended: [],
      },
      message: "No automatic changes needed — original returned.",
    };
  }

  const { prompt, improvementsApplied } = buildSingleAutoEditPrompt(matched);

  __generationCallsThisRequest += 1;
  if (__generationCallsThisRequest !== 1) {
    throw new Error("Auto Edit invariant: generation must run exactly once.");
  }

  // —— Single fal.ai execution + fixed job credit ——
  const gen = await runFixedImageEdit({
    supabase: args.supabase,
    supabaseAdmin: args.supabaseAdmin,
    userId: args.userId,
    profile: args.profile,
    isAdmin: args.isAdmin,
    internalPrompt: prompt,
    imageUrl: validated.imageUrl,
    imageQuality: args.imageQuality,
    creditCost: AUTO_EDIT_CREDIT_COST,
  });

  return {
    success: true,
    outputUrl: gen.outputUrl,
    changed: gen.outputUrl !== validated.imageUrl,
    status: "COMPLETE",
    creditsCharged: args.isAdmin ? 0 : AUTO_EDIT_CREDIT_COST,
    analysisSummary: {
      qualityScore: layers.qualityScore,
      improvementsApplied,
      needsEdit: true,
      confidence: layers.analysisConfidence,
      detectedIssues,
      recommended,
    },
    message: "MOTIO2EDIT Auto Edit complete",
  };
}
