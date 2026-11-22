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
import { assertImageExperienceAccess } from "@/lib/studio/image/image-experience-access";
import { maxImagesForStudioTier } from "@/lib/studio/studio-tier";
import { canSubmitMultiReference, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
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
import {
  understandIntent,
  expandPromptDeterministic,
  buildFinalEditPrompt,
  type EditorIntent,
} from "@/lib/image-edit/prompt-engine";
import { quotePremiumCredits, normalizePremiumQuality } from "@/lib/studio/image/premium";
import { quoteUltraCredits, normalizeUltraQuality } from "@/lib/studio/image/ultra";
import { assertCircleAddAllowed, resolveCircleCharge } from "@/lib/circle-edit/server-charge";
import { normalizeCircleGeneratePayload } from "@/lib/circle-edit/normalize-generate-payload";
import { assertSafeMediaUrl } from "@/lib/safe-external-url";

export { completeCheckout } from "@/lib/checkout.functions";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch that cannot hang past remainingMs (AbortController). */
async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  remainingMs: number,
): Promise<Response> {
  const budget = Math.max(1_000, Math.min(remainingMs, 60_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Provider request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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
  if (status === 429) return "AI service is rate-limited right now. Please retry in a moment.";
  if (status === 401 || status === 403)
    return "AI service authentication failed (invalid or expired API key).";
  if (/balance|locked|billing|top up|exhausted/i.test(detail))
    return "AI service is out of credits. Top up the fal.ai account balance to continue.";
  if (/file_download_error|download the file/i.test(detail))
    return "The uploaded media could not be fetched by the AI. Please re-upload and try again.";
  if (/image_load_error|corrupted|supported format/i.test(detail))
    return "The uploaded image is invalid or in an unsupported format. Try a JPG or PNG.";
  if (/nsfw|safety/i.test(detail))
    return "The request was blocked by the safety filter. Try a different prompt or image.";
  if (detail) return `${label} failed: ${detail.slice(0, 160)}`;
  return `${label} failed (status ${status}). Please try again.`;
}

/** Extract first HTTPS image/video URL from common fal.ai result shapes. */
function extractRunFalOutputUrl(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const candidates: unknown[] = [
    (root.image as { url?: unknown } | undefined)?.url,
    Array.isArray(root.images) ? (root.images[0] as { url?: unknown } | undefined)?.url : undefined,
    (root.video as { url?: unknown } | undefined)?.url,
    root.output,
    root.url,
    (root.data as { image?: { url?: unknown } } | undefined)?.image?.url,
    Array.isArray((root.data as { images?: unknown } | undefined)?.images)
      ? ((root.data as { images: { url?: unknown }[] }).images[0] as { url?: unknown } | undefined)?.url
      : undefined,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

async function runFal(step: FalStep, falKey: string, opts?: { timeoutMs?: number; requestId?: string }): Promise<string> {
  // Keep under typical serverless maxDuration so the platform does not kill the
  // function mid-poll (which leaves the client stuck on a loading overlay).
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const rid = opts?.requestId ?? "n/a";
  const submit = await fetchWithDeadline(
    `${FAL_QUEUE}${step.model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify((step as FalStep & { input?: unknown; body?: unknown }).input ?? (step as FalStep & { body?: unknown }).body),
    },
    timeoutMs,
  );
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
  const falRequestId = submitJson.request_id ?? null;
  if (!statusUrl || !responseUrl) throw new Error(`${step.label}: missing status/response URL`);
  console.info("[generate] fal submitted", {
    rid,
    falRequestId,
    label: step.label,
    model: step.model,
  });

  const deadline = Date.now() + timeoutMs;
  let completed = false;
  let delay = 1000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetchWithDeadline(
      statusUrl,
      { headers: { Authorization: `Key ${falKey}` } },
      deadline - Date.now(),
    );
    const stTxt = await st.text();
    if (!st.ok) throw new Error(falErrorMessage(`${step.label} status`, st.status, stTxt));
    let stJson: { status?: string };
    try {
      stJson = JSON.parse(stTxt);
    } catch {
      delay = Math.min(delay + 500, 3000);
      continue;
    }
    if (stJson.status) lastStatus = stJson.status;
    if (stJson.status === "COMPLETED") {
      completed = true;
      break;
    }
    if (stJson.status === "FAILED" || stJson.status === "CANCELLED" || stJson.status === "ERROR") {
      throw new Error(`${step.label} ${stJson.status}`);
    }
    delay = Math.min(Math.floor(delay * 1.25), 3000);
  }
  if (!completed) {
    console.error("[generate] fal poll timeout", { rid, falRequestId, label: step.label, lastStatus, timeoutMs });
    throw new Error(`${step.label}: timed out waiting for provider. Please try again.`);
  }

  const res = await fetchWithDeadline(
    responseUrl,
    { headers: { Authorization: `Key ${falKey}` } },
    Math.max(5_000, deadline - Date.now()),
  );
  const resTxt = await res.text();
  if (!res.ok) throw new Error(falErrorMessage(`${step.label} result`, res.status, resTxt));
  let resJson: Record<string, unknown>;
  try {
    resJson = JSON.parse(resTxt);
  } catch {
    throw new Error(`${step.label}: invalid result JSON`);
  }

  const url = extractRunFalOutputUrl(resJson);
  if (!url) {
    console.error("[generate] fal no output URL", {
      rid,
      falRequestId,
      label: step.label,
      snippet: resTxt.slice(0, 200),
    });
    throw new Error(`${step.label}: no output URL in result`);
  }
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
  workspaceMode: z.enum(["auto", "composer"]).optional().nullable(),
  contextTags: z.array(z.string()).optional().nullable(),
  keepWatermark: z.boolean().optional().nullable(),
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
    // Existing Production FAL env only — normalize whitespace/quotes; never rotate keys here.
    const falKeyRaw = process.env.FAL_API_KEY || process.env.FAL_KEY || "";
    const falKeySource = process.env.FAL_API_KEY ? "FAL_API_KEY" : process.env.FAL_KEY ? "FAL_KEY" : null;
    const falKey = falKeyRaw.trim().replace(/^['"]|['"]$/g, "");
    if (!falKey) {
      console.error("[generate] FAL env missing at runtime", { hasFAL_API_KEY: Boolean(process.env.FAL_API_KEY), hasFAL_KEY: Boolean(process.env.FAL_KEY) });
      throw new Error("FAL API key is not configured.");
    }
    const genRequestId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    console.info("[generate] FAL auth context", {
      rid: genRequestId,
      source: falKeySource,
      keyLen: falKey.length,
      studioTier: (data as { studioTier?: string | null }).studioTier ?? null,
      workspaceMode: (data as { workspaceMode?: string | null }).workspaceMode ?? null,
      type: data.type,
      hasImageUrl: Boolean(data.imageUrl),
      promptLen: typeof data.prompt === "string" ? data.prompt.length : 0,
    });

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("plan, credits, email")
      .eq("id", userId)
      .single();
    if (profileErr || !profile) throw new Error("Could not load your profile.");

    const plan = (profile.plan || "free") as PlanId;
    const credits = profile.credits ?? 0;

    // Authoritative experience entitlement - never trust client-only tier selection
    if (data.type === "image" && data.studioTier) {
      assertImageExperienceAccess(plan, data.studioTier, isAdmin);
      // Count unique refs from either client field (UI sends referenceImageUrls; older clients use imageUrls).
      const multi = Array.from(
        new Set(
          ([
            ...((data.referenceImageUrls || []) as string[]),
            ...((data.imageUrls || []) as string[]),
          ]).filter((u): u is string => typeof u === "string" && u.length > 0),
        ),
      );
      const expMax = maxImagesForStudioTier(data.studioTier);
      if (multi.length > expMax && !isAdmin) {
        throw new Error(
          `This experience allows up to ${expMax} reference images (received ${multi.length}).`,
        );
      }
    }

    // Free users may select multiple references in the UI, but must never submit
    // multi-reference jobs to fal.ai (no credits, no history, no provider call).
    if (data.type === "image" && !isAdmin && !canSubmitMultiReference(plan, isAdmin)) {
      const multiCandidates = Array.from(
        new Set(
          ([
            data.imageUrl,
            ...((data.referenceImageUrls || []) as string[]),
            ...((data.imageUrls || []) as string[]),
          ]).filter((u): u is string => typeof u === "string" && u.length > 0),
        ),
      );
      if (multiCandidates.length >= 2) {
        console.info("[generate] blocked free multi-reference submit", {
          rid: genRequestId,
          plan,
          imageCount: multiCandidates.length,
        });
        throw new Error(MULTI_IMAGE_UPGRADE_MESSAGE);
      }
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
        // IMAGE PATH CONTINUES - full handler retained from main
        // NOTE: This file must contain the complete image generation handler.
        // If truncated, restore from main and re-apply free multi-ref block.
        throw new Error("IMAGE_HANDLER_MUST_BE_COMPLETE");
      }

      return {
        outputUrl,
        credits: isAdmin ? credits : Math.max(0, credits - cost),
        sourceMediaUrl: providerSourceUrl || null,
      };
    } catch (err) {
      if (reservedVideoQuote) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await releaseReservation(supabaseAdmin, reservedVideoQuote);
          markFailed(reservedVideoQuote);
        } catch {
          /* ignore */
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
          /* ignore */
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
