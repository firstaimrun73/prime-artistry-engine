/**
 * MOTIO2EDIT Auto executor (server-only).
 *
 * Pipeline:
 *   ONE image → rule hints (not forced ops)
 *            → ONE inspect-and-decide internal instruction
 *            → ONE fal.ai openai/gpt-image-2/edit call
 *            → watermark → charge AUTO_EDIT_CREDIT_COST once
 *
 * No user prompt. No OpenAI/Claude/Gemini API keys.
 * GPT Image receives the photograph and decides appropriate improvements.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRuleBasedAnalysis } from "./ruleBasedAnalysis";
import { buildAnalysisLayers } from "./auto-edit.layers.server";
import {
  buildSingleAutoEditPrompt,
  matchImprovements,
} from "./auto-edit.prompt-builder.server";
import { validateStandaloneAutoEditInput } from "./auto-edit.validation";
import type { StandaloneAutoEditResult } from "./auto-edit.types";
import {
  AUTO_EDIT_CREDIT_COST,
  AUTO_EDIT_FAL_MODEL,
  labelImprovement,
  labelIssue,
} from "./constants";
import { runAutoGptImageEdit } from "./gpt-image-edit.server";
import type { ImageQuality } from "@/lib/quality-options";

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

let __generationCallsThisRequest = 0;

export async function executeStandaloneAutoEdit(
  args: RunStandaloneAutoEditArgs,
): Promise<StandaloneAutoEditResult> {
  __generationCallsThisRequest = 0;

  const validated = validateStandaloneAutoEditInput({ imageUrl: args.imageUrl });
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  if (!args.isAdmin && args.profile.credits < AUTO_EDIT_CREDIT_COST) {
    throw new Error(
      `Not enough credits. Auto Edit costs ${AUTO_EDIT_CREDIT_COST} credits per job.`,
    );
  }

  const dims = { width: args.width, height: args.height };

  // Soft heuristic hints only — not a paid vision API
  const analysis = buildRuleBasedAnalysis(dims);
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

  // Safeguard: skip generation when heuristics say the photo is already strong
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

  const { prompt, improvementsApplied } = buildSingleAutoEditPrompt(matched, analysis);

  __generationCallsThisRequest += 1;
  if (__generationCallsThisRequest !== 1) {
    throw new Error("Auto Edit invariant: generation must run exactly once.");
  }

  // Single fal.ai GPT Image 2 Edit call
  const gen = await runAutoGptImageEdit({
    supabase: args.supabase,
    supabaseAdmin: args.supabaseAdmin,
    userId: args.userId,
    profile: args.profile,
    isAdmin: args.isAdmin,
    internalPrompt: prompt,
    imageUrl: validated.imageUrl,
  });

  console.log("[AutoEdit] model:", AUTO_EDIT_FAL_MODEL, "| falCalls: 1");

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
