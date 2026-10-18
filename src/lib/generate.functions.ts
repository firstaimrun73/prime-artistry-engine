/**
 * Generation + plan server functions.
 * completeCheckout lives in checkout.functions (free-plan switch).
 * Restored so Vite resolves generateMedia (main had see_artifact placeholder).
 * Fix: pass referenceImageUrls into Standard path; quote via routeStandardImage
 * before debit (avoids "got 0" multi-ref credit error for paid users).
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

const GenerateSchema = z.object({
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(4000),
  imageUrl: z.string().url().optional().nullable(),
  maskUrl: z.string().url().optional().nullable(),
  /** Alias used by some clients; prefer maskImageUrl. */
  maskImageUrl: z.string().url().optional().nullable(),
  imageUrls: z.array(z.string().url()).max(10).optional().nullable(),
  /** Ordered extra references (primary is imageUrl). Client Image Studio sends this. */
  referenceImageUrls: z.array(z.string().url()).max(10).optional().nullable(),
  studioTier: z.enum(["standard", "pro", "premium"]).optional().nullable(),
  imageQuality: z.string().optional().nullable(),
  aspectRatio: z.string().optional().nullable(),
  strength: z.number().optional().nullable(),
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
  contextTags: z.array(z.string()).optional().nullable(),
  keepWatermark: z.boolean().optional().nullable(),
});
