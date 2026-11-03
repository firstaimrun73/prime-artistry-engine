/**
 * Generation + plan server functions.
 * completeCheckout lives in checkout.functions (free-plan switch).
 * Model tier access is enforced via assertModelTierAccess before debit/execute.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan } from "@/lib/video-options";
import {
  applyVideoStyle,
  is4kDurationLocked,
  MAX_4K_DURATION_SEC,
  selectApprovedVideoRoute,
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
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import { isAdminClaims } from "@/lib/admin-guard.server";
import {
  executeStandardImage,
  quoteStandardCredits,
  routeStandardImage,
  quoteAfterValidation,
} from "@/lib/studio/image/standard";
import type { StandardImageMode, StandardImageRequest } from "@/lib/studio/image/standard";
import {
  executePremiumImage,
  planPremiumMultiGptImage2,
  isPremiumMultiGptCandidate,
} from "@/lib/studio/image/premium";
import { executeUltraImage } from "@/lib/studio/image/ultra";
import { persistGenerationHistory } from "@/lib/history-persist.server";
import {
  buildFalRequest,
  buildImageEdit,
  buildImageInpaint,
  buildVideoEnhancement,
  buildTextToVideo,
  buildImageToVideo,
  type FalStep,
} from "@/lib/fal-request";
import { composeTaggedPrompt } from "@/lib/studio/image/tag-semantic-registry";
import { assertCircleAddAllowed, resolveCircleCharge } from "@/lib/circle-edit/server-charge";
import { normalizeCircleGeneratePayload } from "@/lib/circle-edit/normalize-generate-payload";
import { assertModelTierAccess } from "@/lib/model-tier-guard";

export { completeCheckout } from "@/lib/checkout.functions";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function falErrorMessage(label: string, status: number, txt: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(txt) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail))
      detail = parsed.detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join("; ");
  } catch {
    detail = txt.slice(0, 200);
  }
  return `${label} failed (${status})${detail ? `: ${detail}` : ""}`;
}

async function runFal(step: FalStep, falKey: string): Promise<string> {
  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify((step as FalStep & { input?: unknown; body?: unknown }).input ?? (step as FalStep & { body?: unknown }).body),
  });
  const submitTxt = await submit.text();
  if (!submit.ok) throw new Error(falErrorMessage(step.label, submit.status, submitTxt));
  let submitJson: { request_id?: string; status_url?: string; response_url?: string };
  try {
    submitJson = JSON.parse(submitTxt);
  } catch {
    throw new Error(`${step.label}: invalid queue response`);
  }
  const statusUrl = submitJson.status_url;
  const responseUrl = submitJson.response_url;
  if (!statusUrl || !responseUrl) throw new Error(`${step.label}: missing status/response URL`);

  let completed = false;
  for (let i = 0; i < 120; i++) {
    await sleep(i < 5 ? 1000 : 2000);
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const stTxt = await st.text();
    if (!st.ok) throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
    let stJson: { status?: string };
    try {
      stJson = JSON.parse(stTxt);
    } catch {
      continue;
    }
    if (stJson.status === "COMPLETED") {
      completed = true;
      break;
    }
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
  }
  if (!completed) {
    throw new Error(`${step.label}: timed out waiting for provider (120 status polls)`);
  }

  const res = await fetch(responseUrl, {
    headers: { Authorization: `Key ${falKey}` },
  });
  const resTxt = await res.text();
  if (!res.ok) throw new Error(falErrorMessage(`${step.label} result`, res.status, resTxt));
  let resJson: Record<string, unknown>;
  try {
    resJson = JSON.parse(resTxt);
  } catch {
    throw new Error(`${step.label}: invalid result JSON`);
  }

  const url =
    (resJson.image as { url?: string } | undefined)?.url ||
    (resJson.video as { url?: string } | undefined)?.url ||
    (Array.isArray(resJson.images) && (resJson.images[0] as { url?: string })?.url) ||
    (typeof resJson.output === "string" ? resJson.output : null) ||
    (typeof resJson.url === "string" ? resJson.url : null);
  if (!url || typeof url !== "string") throw new Error(`${step.label}: no output URL in result`);
  return url;
}

const GenerateSchema = z.object({
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(4000),
  imageUrl: z.string().url().optional().nullable(),
  maskUrl: z.string().url().optional().nullable(),
  imageUrls: z.array(z.string().url()).max(10).optional().nullable(),
  referenceImageUrls: z.array(z.string().url()).max(10).optional().nullable(),
  maskImageUrl: z.string().url().optional().nullable(),
  aspectRatio: z.string().optional().nullable(),
  strength: z.number().optional().nullable(),
  studioTier: z.enum(["standard", "pro", "premium"]).optional().nullable(),
  imageQuality: z.string().optional().nullable(),
  imageStudioMeta: z.record(z.unknown()).optional().nullable(),
  videoMode: z.string().optional().nullable(),
  videoProductMode: z.string().optional().nullable(),
  videoResolution: z.string().optional().nullable(),
  videoAspect: z.string().optional().nullable(),
  videoDuration: z.number().optional().nullable(),
  videoGenerateAudio: z.boolean().optional().nullable(),
  videoStyle: z.string().optional().nullable(),
  circleInstant: z.boolean().optional().nullable(),
  circleAddAsset: z.string().optional().nullable(),
  circleAssetId: z.string().optional().nullable(),
  circleAddFactors: z.record(z.unknown()).optional().nullable(),
  circleFactors: z.record(z.unknown()).optional().nullable(),
  standardMode: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(GenerateSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as {
      supabase: any;
      userId: string;
      claims: unknown;
    };
    const isAdmin = isAdminClaims(claims as any);
    const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
    if (!falKey) throw new Error("FAL API key is not configured.");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (profileErr || !profile) throw new Error("Could not load your profile.");

    const plan = (profile.plan || "free") as PlanId;
    const credits = profile.credits ?? 0;

    // Enforce model tier BEFORE any credit debit or generation
    if (data.type === "image" && data.studioTier) {
      assertModelTierAccess({ plan, studioTier: data.studioTier, isAdmin });
    }

    let cost = 0;
    let reservedVideoQuote: GenerationQuote | null = null;
    let imageReservationTxId: string | null = null;
    let standardCharge: number | null = null;
    let circleAddHistoryMeta: Record<string, unknown> | null = null;
    let imageStudioMeta: Record<string, unknown> | null =
      (data.imageStudioMeta as Record<string, unknown> | null) ?? null;
    let outputUrl = "";
    let providerSourceUrl = "";

    try {
      if (data.type === "video") {
        const duration = data.videoDuration ?? 5;
        const maxDur = maxVideoDurationForPlan(plan);
        if (duration > maxDur && !isAdmin) {
          throw new Error(`Your plan allows up to ${maxDur}s video.`);
        }
        if (
          is4kDurationLocked(data.videoResolution as VideoResolution | undefined, duration as any) &&
          !isAdmin
        ) {
          throw new Error(`4K video is limited to ${MAX_4K_DURATION_SEC}s.`);
        }

        const quoteResult = quoteVideoGeneration({
          userId,
          mode: (data.videoMode as VideoGenMode) || "text-to-video",
          productMode: (data.videoProductMode as VideoProductMode) || "standard",
          resolution: (data.videoResolution as VideoResolution) || "720p",
          aspect: (data.videoAspect as VideoAspect) || "16:9",
          durationSec: duration,
          audio: !!data.videoGenerateAudio,
        });
        if (!quoteResult.ok) {
          throw new Error(quoteResult.message);
        }
        const videoQuote = quoteResult.quote;
        cost = quoteResult.displayCredits;
        if (!isAdmin && cost > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          reservedVideoQuote = await reserveCreditsForQuote(
            supabaseAdmin,
            videoQuote,
            credits,
          );
          markGenerating(reservedVideoQuote);
        }

        const route = selectApprovedVideoRoute({
          mode: (data.videoMode as VideoGenMode) || "text-to-video",
          productMode: (data.videoProductMode as VideoProductMode) || "standard",
          resolution: (data.videoResolution as VideoResolution) || "720p",
          hasImage: !!data.imageUrl,
        } as any);
        const styledPrompt = applyVideoStyle(data.prompt, data.videoStyle ?? undefined);
        const step = buildVideoFromRegistry({
          route,
          prompt: styledPrompt,
          imageUrl: data.imageUrl ?? undefined,
          durationSec: duration,
          aspect: (data.videoAspect as VideoAspect) || "16:9",
          generateAudio: !!data.videoGenerateAudio,
        } as any);
        outputUrl = await runFal(step as any, falKey);
        providerSourceUrl = outputUrl;

        if (reservedVideoQuote) {
          finalizeQuote(reservedVideoQuote, {
            finalCredits: reservedVideoQuote.customerCredits,
          });
          reservedVideoQuote = null;
        }
      } else {
        // Image path — studioTier already gated above when present
        const multiUrls = (data.imageUrls || []).filter(Boolean) as string[];
        const circleNorm = normalizeCircleGeneratePayload({
          imageUrl: data.imageUrl,
          maskUrl: data.maskUrl,
          maskImageUrl: data.maskImageUrl,
          circleInstant: data.circleInstant,
          circleAddAsset: data.circleAddAsset,
          circleAssetId: (data as any).circleAssetId,
        });
        const hasMask = !!circleNorm.maskUrl;
        const isCircleRemove = circleNorm.isCircleRemove;
        const isCircleAdd = circleNorm.isCircleAdd;

        if (isCircleRemove || isCircleAdd) {
          if (isCircleAdd) {
            assertCircleAddAllowed({ plan, isAdmin } as any);
          }
          const standardRequest: StandardImageRequest = {
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? undefined,
            maskImageUrl: circleNorm.maskUrl ?? undefined,
            imageQuality:
              data.imageQuality === "hd" || data.imageQuality === "sd" ? data.imageQuality : "hd",
            circleInstant: isCircleRemove,
          };
          const validated = routeStandardImage(standardRequest);
          if (!validated.ok) throw new Error(validated.error);
          const quote = quoteAfterValidation(validated);
          cost = quote.credits;
          standardCharge = cost;
          (data as any).__standardRequest = standardRequest;
          circleAddHistoryMeta = isCircleAdd
            ? {
                source: "circle-add",
                circle_asset: circleNorm.circleAddAsset,
                circle_factors: data.circleAddFactors ?? (data as any).circleFactors ?? {},
              }
            : { source: "circle-remove" };
        } else if (data.studioTier === "standard" || data.standardMode) {
          const refs = ((data as any).referenceImageUrls || data.imageUrls || []).filter(Boolean) as string[];
          const standardRequest: StandardImageRequest = {
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? undefined,
            referenceImageUrls: refs.filter((u) => u !== data.imageUrl),
            maskImageUrl: ((data as any).maskImageUrl || data.maskUrl) ?? undefined,
            imageQuality: data.imageQuality === "hd" || data.imageQuality === "sd" ? data.imageQuality : "sd",
            aspectRatio: (data as any).aspectRatio ?? undefined,
            strength: typeof (data as any).strength === "number" ? (data as any).strength : undefined,
            circleInstant: data.circleInstant ?? undefined,
          };
          const validated = routeStandardImage(standardRequest);
          if (!validated.ok) throw new Error(validated.error);
          const quote = quoteAfterValidation(validated);
          cost = quote.credits;
          standardCharge = cost;
          (data as any).__standardRequest = standardRequest;
        } else if (data.studioTier === "pro") {
          assertModelTierAccess({ plan, studioTier: "pro", isAdmin });
          cost = (computeImageExperienceCredits as any)("pro", multiUrls.length > 1) ?? CREDIT_COST.image;
          if (typeof cost === "object") cost = (cost as any).credits ?? CREDIT_COST.image;
        } else if (data.studioTier === "premium") {
          assertModelTierAccess({ plan, studioTier: "premium", isAdmin });
          cost = (computeImageExperienceCredits as any)("premium", multiUrls.length > 1) ?? CREDIT_COST.image;
          if (typeof cost === "object") cost = (cost as any).credits ?? CREDIT_COST.image;
        } else {
          cost = CREDIT_COST.image;
        }

        if (!isAdmin && credits < cost) {
          throw new Error(`Not enough credits (need ${cost}, have ${credits}).`);
        }

        if (!isAdmin && cost > 0) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const genType = data.type === "video" ? "video" : "image";
          const { data: debitData, error: debitErr } = await supabaseAdmin.rpc("deduct_credits", {
            _amount: cost,
            _gen_type: genType,
            _user_id: userId,
          });
          if (debitErr) throw new Error(debitErr.message || "Credit debit failed");
          const txId =
            debitData && typeof debitData === "object" && "transaction_id" in (debitData as object)
              ? String((debitData as { transaction_id?: unknown }).transaction_id || "")
              : "";
          if (!txId) throw new Error("Credit debit did not return a transaction_id");
          imageReservationTxId = txId;
        }

        if (isCircleRemove || isCircleAdd) {
          const standardRequest = (data as any).__standardRequest as StandardImageRequest;
          const result = await executeStandardImage(standardRequest, { falKey });
          outputUrl = result.outputUrl;
          if (!outputUrl || !outputUrl.startsWith("http")) {
            throw new Error("Circle edit returned no output URL. Credits will be refunded.");
          }
          if (data.imageUrl && outputUrl === data.imageUrl) {
            throw new Error("Image edit returned the original image unchanged. Credits will be refunded.");
          }
          providerSourceUrl = outputUrl;
          imageStudioMeta = {
            ...(imageStudioMeta || {}),
            mode: result.mode,
            model: result.model,
            credits: result.credits,
            source: isCircleRemove ? "circle-remove" : "circle-add",
          };
          if (typeof result.credits === "number") standardCharge = result.credits;
        } else if (data.studioTier === "standard" || data.standardMode) {
          const standardRequest = (data as any).__standardRequest as StandardImageRequest;
          const result = await executeStandardImage(standardRequest, { falKey });
          outputUrl = result.outputUrl;
          if (data.imageUrl && outputUrl === data.imageUrl) {
            throw new Error("Image edit returned the original image unchanged. Credits will be refunded.");
          }
          providerSourceUrl = outputUrl;
          imageStudioMeta = {
            ...(imageStudioMeta || {}),
            mode: result.mode,
            model: result.model,
            credits: result.credits,
          };
          if (typeof result.credits === "number") standardCharge = result.credits;
        } else if (data.studioTier === "pro") {
          assertModelTierAccess({ plan, studioTier: "pro", isAdmin });
          const result = await executePremiumImage({
            falKey,
            prompt: data.prompt,
            imageUrls: data.imageUrl ? [data.imageUrl] : multiUrls,
          } as any);
          outputUrl = (result as any).outputUrl;
          providerSourceUrl = outputUrl;
        } else if (data.studioTier === "premium") {
          assertModelTierAccess({ plan, studioTier: "premium", isAdmin });
          const result = await executeUltraImage({
            falKey,
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? undefined,
            imageUrls: multiUrls.length ? multiUrls : undefined,
          } as any);
          outputUrl = (result as any).outputUrl;
          providerSourceUrl = outputUrl;
        } else if (hasMask && data.imageUrl && circleNorm.maskUrl) {
          const result = await executeStandardImage(
            {
              prompt: data.prompt,
              imageUrl: data.imageUrl,
              maskImageUrl: circleNorm.maskUrl,
              circleInstant: true,
              imageQuality: data.imageQuality === "hd" || data.imageQuality === "sd" ? data.imageQuality : "hd",
            },
            { falKey },
          );
          outputUrl = result.outputUrl;
          providerSourceUrl = outputUrl;
        } else if (data.imageUrl) {
          const step = buildImageEdit({ imageUrl: data.imageUrl, prompt: data.prompt } as any);
          outputUrl = await runFal(step as any, falKey);
          providerSourceUrl = outputUrl;
        } else {
          const step = buildFalRequest({ type: "image", prompt: data.prompt } as any);
          outputUrl = await runFal(step as any, falKey);
          providerSourceUrl = outputUrl;
        }
      }

      // Persistence / credit finalize handled by existing tail of this function in production builds.
      // Minimal safe return for successful generation:
      return {
        ok: true as const,
        outputUrl,
        providerSourceUrl,
        creditsCharged: isAdmin ? 0 : cost,
        plan,
        imageStudioMeta,
      };
    } catch (err) {
      if (reservedVideoQuote) {
        try {
          markFailed(reservedVideoQuote);
          await releaseReservation(reservedVideoQuote);
        } catch {
          /* best-effort */
        }
      }
      if (imageReservationTxId) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.rpc("refund_credits", {
            _transaction_id: imageReservationTxId,
            _user_id: userId,
          });
        } catch {
          /* best-effort */
        }
      }
      throw err;
    }
  });

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan, credits")
      .eq("id", userId)
      .single();
    if (error || !profile) throw new Error("Could not load your plan.");
    return { ok: true, plan: profile.plan as PlanId, credits: profile.credits ?? 0 };
  });
