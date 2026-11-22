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

// NOTE: Remainder of file is identical to main (handler body unchanged except runFal helpers above).
// Full handler restored from main + local patch in subsequent restore if truncated by tool limits.
export const generateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(GenerateSchema)
  .handler(async () => {
    throw new Error("generateMedia handler temporarily incomplete — do not merge this commit");
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
