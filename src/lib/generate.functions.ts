/**
 * Generation + plan server functions.
 * completeCheckout lives in checkout.functions (free-plan switch).
 * Restored so Vite resolves generateMedia (main had see_artifact placeholder).
 * Handler body from last READY preview build of this branch (ddb744c0).
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
  quotePremiumCredits,
  validatePremiumImageRequest,
} from "@/lib/studio/image/premium";
import {
  executeUltraImage,
  validateUltraImageRequest,
  quoteUltraCredits,
} from "@/lib/studio/image/ultra";
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
    if (stJson.status === "COMPLETED") break;
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
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

/** Ordered https refs: referenceImageUrls preferred over imageUrls. */
function normalizeClientRefs(data: {
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  imageUrls?: string[] | null;
}): string[] {
  const primary =
    typeof data.imageUrl === "string" && data.imageUrl.startsWith("https://")
      ? data.imageUrl
      : null;
  const fromRefs = Array.isArray(data.referenceImageUrls)
    ? data.referenceImageUrls.filter(
        (u): u is string => typeof u === "string" && u.startsWith("https://"),
      )
    : [];
  const fromUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter(
        (u): u is string => typeof u === "string" && u.startsWith("https://"),
      )
    : [];
  const extras = fromRefs.length > 0 ? fromRefs : fromUrls.filter((u) => u !== primary);
  const out: string[] = [];
  for (const u of extras) {
    if (!out.includes(u) && u !== primary) out.push(u);
  }
  return out;
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
  circleAddFactors: z.record(z.unknown()).optional().nullable(),
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

    let cost = 0;
    let reservedVideoQuote: GenerationQuote | null = null;
    let standardCharge: number | null = null;
    let circleAddHistoryMeta: Record<string, unknown> | null = null;
    let imageStudioMeta: Record<string, unknown> | null =
      (data.imageStudioMeta as Record<string, unknown> | null) ?? null;
    let outputUrl = "";
    let providerSourceUrl = "";
    let imageDebitTxId: string | null = null;

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

        const quote = await quoteVideoGeneration({
          supabase,
          userId,
          plan,
          mode: (data.videoMode as VideoGenMode) || "text-to-video",
          productMode: (data.videoProductMode as VideoProductMode) || "standard",
          resolution: (data.videoResolution as VideoResolution) || "720p",
          aspect: (data.videoAspect as VideoAspect) || "16:9",
          durationSec: duration,
          generateAudio: !!data.videoGenerateAudio,
        } as any);
        cost = (quote as any).credits ?? (quote as any).displayCredits ?? 0;
        if (!isAdmin) {
          await reserveCreditsForQuote(supabase, quote as any);
          reservedVideoQuote = quote as any;
          markGenerating(quote as any);
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
          await finalizeQuote(supabase, reservedVideoQuote, { outputUrl } as any);
        }
      } else {
        const multiUrls = (data.imageUrls || []).filter(Boolean) as string[];
        const hasMask = !!data.maskUrl;
        const isCircleAdd = data.circleInstant === false && !!data.circleAddAsset;

        if (isCircleAdd) {
          assertCircleAddAllowed({ plan, isAdmin } as any);
          const charge = resolveCircleCharge({ plan, isAdmin } as any);
          cost = (charge as any).credits ?? 0;
          standardCharge = cost;
          circleAddHistoryMeta = {
            source: "circle-add",
            circle_asset: data.circleAddAsset,
            circle_factors: data.circleAddFactors ?? {},
          };
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
          const refs = normalizeClientRefs(data);
          if (
            isPremiumMultiGptCandidate({
              studioTier: "pro",
              imageUrl: data.imageUrl,
              referenceImageUrls: refs,
              maskImageUrl: data.maskImageUrl || data.maskUrl,
              circleInstant: data.circleInstant ?? undefined,
            })
          ) {
            const multiPlan = planPremiumMultiGptImage2({
              prompt: data.prompt,
              imageUrl: data.imageUrl,
              referenceImageUrls: refs,
              imageQuality: data.imageQuality,
              aspectRatio: data.aspectRatio,
            });
            if (!multiPlan.ok) throw new Error(multiPlan.error === "not_multi" ? "Premium multi routing error." : multiPlan.error);
            cost = multiPlan.credits;
            standardCharge = cost;
            (data as any).__premiumMultiPlan = multiPlan;
          } else {
            const req = {
              prompt: data.prompt,
              imageUrl: data.imageUrl ?? undefined,
              referenceImageUrls: refs,
              imageQuality: data.imageQuality,
              aspectRatio: data.aspectRatio ?? undefined,
            };
            const v = validatePremiumImageRequest(req as any);
            if (!v.ok) throw new Error((v as any).error || "Invalid Premium request");
            cost = quotePremiumCredits({ mode: v.mode, quality: v.quality }).credits;
            standardCharge = cost;
            (data as any).__premiumSingleReq = req;
          }
        } else if (data.studioTier === "premium") {
          const refs = normalizeClientRefs(data);
          const ultraReq = {
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? undefined,
            referenceImageUrls: refs.length ? refs : undefined,
            imageQuality: data.imageQuality ?? undefined,
            aspectRatio: data.aspectRatio ?? undefined,
          };
          const uv = validateUltraImageRequest(ultraReq as any);
          if (!uv.ok) throw new Error((uv as any).error || "Invalid Ultra request");
          cost = quoteUltraCredits({
            mode: uv.mode,
            quality: uv.quality,
            referenceCount: uv.referenceCount,
          }).credits;
          standardCharge = cost;
          (data as any).__ultraReq = ultraReq;
        } else {
          const refs = normalizeClientRefs(data);
          if (data.imageUrl && refs.length >= 1 && !hasMask && !isCircleAdd) {
            const standardRequest: StandardImageRequest = {
              prompt: data.prompt,
              imageUrl: data.imageUrl ?? undefined,
              referenceImageUrls: refs.filter((u) => u !== data.imageUrl),
              imageQuality: data.imageQuality === "hd" || data.imageQuality === "sd" ? data.imageQuality : "sd",
              aspectRatio: data.aspectRatio ?? undefined,
            };
            const validated = routeStandardImage(standardRequest);
            if (!validated.ok) throw new Error(validated.error);
            const quote = quoteAfterValidation(validated);
            cost = quote.credits;
            standardCharge = cost;
            (data as any).__standardRequest = standardRequest;
            (data as any).__inferredStandard = true;
          } else {
            cost = CREDIT_COST.image;
          }
        }

        if (!isAdmin && credits < cost) {
          throw new Error(`Not enough credits (need ${cost}, have ${credits}).`);
        }

        if (!isAdmin && cost > 0) {
          const { data: debitData, error: debitErr } = await supabase.rpc("deduct_credits", {
            _amount: cost,
            _gen_type: `image_${data.studioTier || "default"}`,
            _user_id: userId,
          });
          if (debitErr) throw new Error(debitErr.message || "Credit debit failed");
          const tx = (debitData as { transaction_id?: string } | null)?.transaction_id;
          imageDebitTxId = typeof tx === "string" ? tx : null;
        }

        if (isCircleAdd) {
          const step = buildImageInpaint({
            imageUrl: data.imageUrl!,
            maskUrl: data.maskUrl!,
            prompt: data.prompt,
          } as any);
          outputUrl = await runFal(step as any, falKey);
          providerSourceUrl = outputUrl;
        } else if (data.studioTier === "standard" || data.standardMode || (data as any).__inferredStandard) {
          const standardRequest = (data as any).__standardRequest as StandardImageRequest;
          const result = await executeStandardImage(standardRequest, { falKey });
          outputUrl = result.outputUrl;
          providerSourceUrl = outputUrl;
          imageStudioMeta = {
            ...(imageStudioMeta || {}),
            mode: result.mode,
            model: result.model,
            credits: result.credits,
          };
          if (typeof result.credits === "number") standardCharge = result.credits;
        } else if (data.studioTier === "pro") {
          const refs = normalizeClientRefs(data);
          const runStep = (step: { label: string; model: string; body?: unknown; input?: unknown }) =>
            runFal(step as any, falKey);
          if (
            isPremiumMultiGptCandidate({
              studioTier: "pro",
              imageUrl: data.imageUrl,
              referenceImageUrls: refs,
              maskImageUrl: data.maskImageUrl || data.maskUrl,
              circleInstant: data.circleInstant ?? undefined,
            })
          ) {
            const multiPlan = planPremiumMultiGptImage2({
              prompt: data.prompt,
              imageUrl: data.imageUrl,
              referenceImageUrls: refs,
              imageQuality: data.imageQuality,
              aspectRatio: data.aspectRatio,
            });
            if (!multiPlan.ok) throw new Error(multiPlan.error === "not_multi" ? "Premium multi routing error." : multiPlan.error);
            outputUrl = await runFal(multiPlan.step as any, falKey);
            if (!outputUrl?.startsWith("http")) throw new Error("Premium multi returned no output.");
            providerSourceUrl = outputUrl;
            imageStudioMeta = {
              ...(imageStudioMeta || {}),
              mode: "multi_image_to_image",
              model: multiPlan.step.model,
              credits: multiPlan.credits,
              referenceCount: multiPlan.imageUrls.length,
              imageUrls: multiPlan.imageUrls,
            };
            standardCharge = multiPlan.credits;
          } else {
            const req = {
              prompt: data.prompt,
              imageUrl: data.imageUrl ?? undefined,
              referenceImageUrls: refs,
              imageQuality: data.imageQuality,
              aspectRatio: data.aspectRatio ?? undefined,
              strength: typeof data.strength === "number" ? data.strength : undefined,
            };
            const result = await executePremiumImage(req, { falKey, runStep });
            outputUrl = result.outputUrl;
            providerSourceUrl = outputUrl;
            imageStudioMeta = {
              ...(imageStudioMeta || {}),
              mode: result.mode,
              model: result.model,
              credits: result.credits,
            };
            standardCharge = result.credits;
          }
        } else if (data.studioTier === "premium") {
          const refs = normalizeClientRefs(data);
          const runStep = (step: { label: string; model: string; body?: unknown; input?: unknown }) =>
            runFal(step as any, falKey);
          const ultraReq = {
            prompt: data.prompt,
            imageUrl: data.imageUrl ?? undefined,
            referenceImageUrls: refs.length ? refs : undefined,
            imageQuality: data.imageQuality ?? undefined,
            aspectRatio: data.aspectRatio ?? undefined,
          };
          const result = await executeUltraImage(ultraReq, { falKey, runStep });
          outputUrl = result.outputUrl;
          providerSourceUrl = outputUrl;
          imageStudioMeta = {
            ...(imageStudioMeta || {}),
            mode: result.mode,
            model: result.model,
            credits: result.credits,
            referenceCount: result.referenceCount,
          };
          standardCharge = result.credits;
        } else if (hasMask && data.imageUrl && data.maskUrl) {
          const result = await executeStandardImage({
            falKey,
            prompt: data.prompt,
            imageUrl: data.imageUrl,
            maskUrl: data.maskUrl,
            mode: "remove",
          } as any);
          outputUrl = (result as any).outputUrl;
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

      imageDebitTxId = null; // success — do not refund
      let newCredits = isAdmin ? credits : Math.max(0, credits - cost);
      const { data: updated } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();
      if (updated && typeof updated.credits === "number") {
        newCredits = updated.credits;
      }

      try {
        const creditsUsed = isAdmin ? 0 : (standardCharge ?? cost);
        const meta: Record<string, unknown> = {
          ...(circleAddHistoryMeta ?? {}),
          ...(typeof imageStudioMeta === "object" && imageStudioMeta ? imageStudioMeta : {}),
          credits_used: creditsUsed,
          imageQuality: data.imageQuality ?? null,
          quality: data.imageQuality ?? null,
          studio_tier: data.studioTier ?? null,
          prompt: data.prompt,
          provider: "fal",
          source_media_url: providerSourceUrl || outputUrl,
        };
        if (data.type === "image" && data.studioTier) {
          if (!meta.source) meta.source = "image-studio";
          if (!meta.experienceLabel) {
            meta.experienceLabel =
              data.studioTier === "standard"
                ? "Standard"
                : data.studioTier === "pro"
                  ? "Premium"
                  : data.studioTier === "premium"
                    ? "Ultra AI"
                    : data.studioTier;
          }
        }
        await persistGenerationHistory({
          supabaseAdmin: supabase,
          userId,
          type: data.type === "video" ? "video" : "image",
          prompt: data.prompt,
          input_url: data.imageUrl ?? null,
          output_url: providerSourceUrl || outputUrl || "",
          sourceMediaUrl: providerSourceUrl || outputUrl,
          status: "success",
          metadata: meta,
        } as any);
      } catch (histErr) {
        console.error("[generate] persistGenerationHistory failed:", histErr);
      }

      return {
        outputUrl,
        credits: newCredits,
        sourceMediaUrl: providerSourceUrl || null,
      };
    } catch (err) {
      if (reservedVideoQuote) {
        try {
          await releaseReservation(supabase, reservedVideoQuote);
          markFailed(reservedVideoQuote);
        } catch {
          /* ignore */
        }
      }
      if (imageDebitTxId) {
        try {
          await supabase.rpc("refund_credits", {
            _transaction_id: imageDebitTxId,
            _user_id: userId,
          });
        } catch (re) {
          console.error("[generate] image credit refund failed:", re);
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
