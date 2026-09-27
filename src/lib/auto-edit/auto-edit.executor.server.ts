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
} from "./constants";
import { analyzeImageWithGemini } from "./fal-vision.server";
import { runAutoKontextEdit } from "./kontext.server";
import {
  assertAutoEditQualityEntitlement,
  assertFreeAutoEditAllowance,
} from "./entitlements";

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

  const detectedIssues = analysis.issues.map(labelIssue).slice(0, 8);
  const recommended = analysis.recommended_actions.map(labelImprovement).slice(0, 6);

  if (analysis.no_change || !analysis.final_edit_prompt.trim()) {
    // Still record History so the job is visible (0 credits, no edit applied).
    let outputUrl = validated.imageUrl;
    try {
      const { persistGenerationHistory } = await import("@/lib/history-persist.server");
      let outputBytes: Buffer | null = null;
      let outputContentType = "image/jpeg";
      try {
        if (validated.imageUrl.startsWith("http")) {
          const res = await fetch(validated.imageUrl);
          if (res.ok) {
            outputBytes = Buffer.from(await res.arrayBuffer());
            outputContentType = res.headers.get("content-type") || outputContentType;
          }
        }
      } catch {
        /* keep source URL only */
      }
      const persist = await persistGenerationHistory({
        supabaseAdmin: args.supabaseAdmin,
        userId: args.userId,
        type: "image",
        prompt: "Maluto AI Auto Edit",
        input_url: validated.imageUrl.startsWith("https://") ? validated.imageUrl : null,
        output_url: validated.imageUrl,
        status: "success",
        is_private: true,
        outputBytes,
        outputContentType,
        outputExt: "jpg",
        metadata: {
          experience: "auto-edit",
          source: "standalone_auto",
          operation: "auto_edit_no_change",
          quality,
          credits_charged: 0,
          credits_used: 0,
          no_change: true,
        },
      });
      if (persist.error) {
        console.error("[AutoEdit] NO_CHANGE history persist failed:", persist.error);
      }
      if (persist.output_url) outputUrl = persist.output_url;
    } catch (e) {
      console.error("[AutoEdit] NO_CHANGE history persist exception:", e);
    }

    return {
      success: true,
      outputUrl,
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

  const gen = await runAutoKontextEdit({
    supabase: args.supabase,
    supabaseAdmin: args.supabaseAdmin,
    userId: args.userId,
    profile: args.profile,
    isAdmin: args.isAdmin,
    editPrompt: analysis.final_edit_prompt,
    imageUrl: validated.imageUrl,
    quality,
  });

  console.log(
    "[AutoEdit] model:",
    AUTO_EDIT_FAL_MODEL,
    "| quality:",
    quality,
    "| credits:",
    cost,
  );

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
    message: "MOTIO2EDIT Auto Edit complete",
  };
}
