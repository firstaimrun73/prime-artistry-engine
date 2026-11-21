/**
 * MOTIO2EDIT Auto executor (server-only).
 *
 * Pipeline:
 *   ONE https image
 *     → Gemini 2.5 Flash Lite (fal any-llm/vision) analysis + final_edit_prompt
 *     → NO_CHANGE → return original, charge 0 (still save History)
 *     → fal-ai/flux-kontext-lora with same image URL + prompt
 *     → validate → watermark → charge once
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateStandaloneAutoEditInput } from "./auto-edit.validation";
import type { StandaloneAutoEditResult } from "./auto-edit.types";
import {
  autoEditCreditCost,
  AUTO_EDIT_FAL_MODEL,
  labelIssue,
  labelImprovement,
  type AutoEditQuality,
  AUTO_EDIT_PRODUCT_VERSION,
} from "./constants";
import { analyzeImageWithGemini } from "./fal-vision.server";
import { runAutoKontextEdit } from "./kontext.server";
import { persistGenerationHistory } from "@/lib/history-persist.server";
import {
  assertAutoEditQualityEntitlement,
  assertFreeAutoEditAllowance,
} from "./entitlements";
import {
  assessRestorationOutput,
  buildMalutoStages,
} from "./maluto-stages";

export type RunStandaloneAutoEditArgs = {
  imageUrl: string;
  imageQuality: AutoEditQuality;
  width?: number;
  height?: number;
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  userId: string;
  profile: {
    plan: string;
    credits: number;
    email?: string | null;
    auto_edit_used_count?: number | null;
  };
  isAdmin: boolean;
};

export async function executeStandaloneAutoEdit(
  args: RunStandaloneAutoEditArgs,
): Promise<StandaloneAutoEditResult> {
  const validated = validateStandaloneAutoEditInput({ imageUrl: args.imageUrl });
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const quality: AutoEditQuality = args.imageQuality ?? "hd";
  assertAutoEditQualityEntitlement(args.profile.plan, quality);
  assertFreeAutoEditAllowance({
    plan: args.profile.plan,
    isAdmin: args.isAdmin,
    autoEditUsedCount: args.profile.auto_edit_used_count ?? 0,
  });

  const cost = autoEditCreditCost(quality);
  if (!args.isAdmin && args.profile.credits < cost) {
    throw new Error(`Not enough credits. Auto Edit costs ${cost} credits per job.`);
  }

  const analysis = await analyzeImageWithGemini(validated.imageUrl);
  const stages = buildMalutoStages(analysis, {
    width: args.width,
    height: args.height,
  });
  // Prefer structured Maluto restoration prompt (preserves vision intent + locks).
  if (stages.restorationPrompt && !analysis.no_change) {
    analysis.final_edit_prompt = stages.restorationPrompt;
  }

  const detectedIssues = analysis.issues.map(labelIssue).slice(0, 8);
  const recommended = analysis.recommended_actions.map(labelImprovement).slice(0, 6);

  const analysisMeta = {
    maluto_stages: {
      stage1: stages.stage1,
      stage2: stages.stage2,
      stage3: stages.stage3,
      confidence: stages.confidence,
    },
    product_version: AUTO_EDIT_PRODUCT_VERSION,
  };

  if (analysis.no_change || !analysis.final_edit_prompt.trim()) {
    try {
      const persist = await persistGenerationHistory({
        supabaseAdmin: args.supabaseAdmin,
        userId: args.userId,
        type: "image",
        prompt: "Maluto AI 1.8 Auto Edit",
        input_url: typeof validated.imageUrl === "string" ? validated.imageUrl : null,
        output_url: validated.imageUrl,
        status: "success",
        metadata: {
          experience: "auto-edit",
          source: "standalone_auto",
          operation: "auto_edit_no_change",
          product_version: AUTO_EDIT_PRODUCT_VERSION,
          quality,
          credits_charged: 0,
          credits_used: 0,
          no_change: true,
          ...analysisMeta,
        },
      });
      if (persist.error) {
        console.error("[AutoEdit] NO_CHANGE history insert failed:", persist.error);
      }
    } catch (histErr) {
      console.error("[AutoEdit] NO_CHANGE history persist exception:", histErr);
    }

    try {
      await args.supabaseAdmin.from("maluto_analyses").insert({
        user_id: args.userId,
        input_url: validated.imageUrl,
        output_url: validated.imageUrl,
        stage1: stages.stage1,
        stage2: stages.stage2,
        stage3: stages.stage3,
        restoration_prompt: stages.restorationPrompt || null,
        confidence: stages.confidence,
        quality,
        credits_charged: 0,
        status: "no_change",
      });
    } catch (e) {
      console.error("[AutoEdit] maluto_analyses insert failed:", e);
    }

    return {
      success: true,
      outputUrl: validated.imageUrl,
      changed: false,
      status: "NO_CHANGE",
      creditsCharged: 0,
      analysisSummary: {
        qualityScore: analysis.confidence,
        improvementsApplied: 0,
        needsEdit: false,
        confidence: analysis.confidence,
        detectedIssues: detectedIssues.length ? detectedIssues : ["No significant issues"],
        recommended: [],
      },
      message: "No automatic changes needed — original returned.",
    };
  }

  let gen = await runAutoKontextEdit({
    supabase: args.supabase,
    supabaseAdmin: args.supabaseAdmin,
    userId: args.userId,
    profile: args.profile,
    isAdmin: args.isAdmin,
    editPrompt: analysis.final_edit_prompt,
    imageUrl: validated.imageUrl,
    quality,
  });

  // Lightweight quality gate + one intelligent retry
  let qualityCheck = assessRestorationOutput({
    inputUrl: validated.imageUrl,
    outputUrl: gen.outputUrl,
    expectedChange: true,
  });
  if (!qualityCheck.ok) {
    console.warn("[AutoEdit] quality check failed, retrying once:", qualityCheck.reasons);
    const retryPrompt =
      analysis.final_edit_prompt +
      " Retry: ensure visible repair of detected defects while strictly preserving identity and composition. " +
      qualityCheck.reasons.join("; ");
    try {
      gen = await runAutoKontextEdit({
        supabase: args.supabase,
        supabaseAdmin: args.supabaseAdmin,
        userId: args.userId,
        profile: args.profile,
        isAdmin: args.isAdmin,
        editPrompt: retryPrompt.slice(0, 3500),
        imageUrl: validated.imageUrl,
        quality,
      });
      qualityCheck = assessRestorationOutput({
        inputUrl: validated.imageUrl,
        outputUrl: gen.outputUrl,
        expectedChange: true,
      });
    } catch (retryErr) {
      console.error("[AutoEdit] retry failed:", retryErr);
    }
  }

  console.log(
    "[AutoEdit] model:",
    AUTO_EDIT_FAL_MODEL,
    "| quality:",
    quality,
    "| credits:",
    cost,
    "| qualityOk:",
    qualityCheck.ok,
  );

  try {
    await args.supabaseAdmin.from("maluto_analyses").insert({
      user_id: args.userId,
      input_url: validated.imageUrl,
      output_url: gen.outputUrl,
      stage1: stages.stage1,
      stage2: stages.stage2,
      stage3: stages.stage3,
      restoration_prompt: stages.restorationPrompt || analysis.final_edit_prompt,
      confidence: stages.confidence,
      quality,
      credits_charged: args.isAdmin ? 0 : cost,
      status: qualityCheck.ok ? "complete" : "complete_with_warnings",
    });
  } catch (e) {
    console.error("[AutoEdit] maluto_analyses insert failed:", e);
  }

  return {
    success: true,
    outputUrl: gen.outputUrl,
    changed: gen.outputUrl !== validated.imageUrl,
    status: "COMPLETE",
    creditsCharged: args.isAdmin ? 0 : cost,
    analysisSummary: {
      qualityScore: analysis.confidence,
      improvementsApplied: Math.max(1, recommended.length),
      needsEdit: true,
      confidence: analysis.confidence,
      detectedIssues,
      recommended,
    },
    message: "Maluto AI 1.8 complete",
  };
}
