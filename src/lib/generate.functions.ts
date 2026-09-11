import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan } from "@/lib/video-options";
import {
  applyVideoStyle,
  getVideoModel,
  is4kDurationLocked,
  MAX_4K_DURATION_SEC,
  selectApprovedVideoRoute,
  promptMentionsAudio,
} from "@/lib/video-model-registry";
import type { VideoGenMode, VideoProductMode, VideoResolution, VideoAspect } from "@/lib/video/video-capability-registry";
import {
  quoteVideoGeneration,
  reserveCreditsForQuote,
  releaseReservation,
  markGenerating,
  finalizeQuote,
  markFailed,
  type GenerationQuote,
} from "@/lib/billing";
import { buildVideoFromRegistry } from "@/lib/video-fal-step";
import { imageUpscaleFactor, videoResolutionMultiplier, videoResolutionUpscales } from "@/lib/quality-options";
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import { isAdminClaims } from "@/lib/admin-guard.server";
import { executeStandardImage, quoteStandardCredits, validateStandardImageRequest } from "@/lib/studio/image/standard";
import { isPremiumMultiGptCandidate, planPremiumMultiGptImage2 } from "@/lib/studio/image/premium/multi-image";
import { isPremiumSingleCandidate, executePremiumImage, validatePremiumImageRequest, quotePremiumCredits } from "@/lib/studio/image/premium";
import { isUltraCandidate, executeUltraImage, validateUltraImageRequest, quoteUltraCredits } from "@/lib/studio/image/ultra";
import { buildFalRequest, buildImageEdit, buildImageEnhancementPipeline, buildImageInpaint, buildVideoEnhancement, buildImageUpscale, buildTextToVideo, buildImageToVideo, type FalStep } from "@/lib/fal-request";
import { understandIntent, isPureEnhanceIntent, buildFinalEditPrompt, expandPromptDeterministic, getIntentSettings, type EditorIntent } from "@/lib/image-edit/prompt-engine";
import { composeTaggedPrompt } from "@/lib/studio/image/tag-semantic-registry";
import { assertCircleAddAllowed, resolveCircleCharge } from "@/lib/circle-edit/server-charge";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DETERMINISTIC_INTENTS: ReadonlySet<EditorIntent> = new Set(["outfit_transfer", "outfit_single", "color", "remove_people", "object_remove", "add_subject", "restore", "colorize", "face_fix", "background", "small_add"]);
const PREPARE_FAILED = "Couldn't finish preparing your image. Please try again or contact support.";
const STANDARD_FALLBACK_COST = 25;

// FILE CONTINUES - SEE NEXT COMMIT
export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    throw new Error("generateMedia temporarily incomplete - restore in progress");
  });

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase.from("profiles").select("plan, credits").eq("id", userId).single();
    if (error || !profile) throw new Error("Could not load your plan.");
    return { ok: true, plan: profile.plan as PlanId, credits: profile.credits ?? 0 };
  });

const checkoutSchema = z.object({
  plan: z.enum(["free", "lite", "plus", "pro", "studio", "business"]),
  currency: z.string().min(1).max(8),
});

export const completeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.plan !== "free") {
      throw new Error("Paid plans must be purchased through the secure payment checkout.");
    }
    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", currency: data.currency, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error("Could not update your plan.");
    return { ok: true, plan: "free" as PlanId, credits: 0 };
  });
