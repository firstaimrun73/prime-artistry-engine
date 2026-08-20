import { findPlan } from "@/lib/plans";
import { resolveWatermarkPolicy, policyRequiresStamp } from "./policy";
import { renderImageWatermark, fetchMediaBuffer } from "./image";
import { renderVideoWatermark } from "./video";
import {
  FINALIZED_PATH_MARKER,
  FINALIZED_VIDEO_MARKER,
  type FinalizeMediaInput,
  type FinalizeMediaResult,
  type WatermarkStudioTier,
} from "./types";

export const PREPARE_FAILED = "Could not prepare your media. Please try again.";

const VALID_TIERS: readonly WatermarkStudioTier[] = ["standard", "pro", "premium"] as const;

function experienceLabelFromTier(tier: WatermarkStudioTier): string {
  switch (tier) {
    case "pro":
      return "Premium";
    case "premium":
      return "VIP";
    case "standard":
    default:
      return "Standard";
  }
}

function normalizeStudioTier(raw: unknown): WatermarkStudioTier {
  if (typeof raw === "string" && (VALID_TIERS as readonly string[]).includes(raw)) {
    return raw as WatermarkStudioTier;
  }
  return "standard";
}

/**
 * Server-authoritative watermark line.
 * Plan display name from plans registry; Experience from validated internal id.
 * Never trusts client-supplied free-text watermark strings.
 */
export function resolveExperienceWatermarkLabel(
  studioTier: WatermarkStudioTier | undefined,
  planId: string | null | undefined,
): string {
  const tier = normalizeStudioTier(studioTier);
  const exp = experienceLabelFromTier(tier);
  const planName = findPlan(planId)?.name ?? (planId ? String(planId) : "Free");
  return `Motio2edit ${exp} — ${planName}`;
}

export async function finalizeMediaAsset(input: FinalizeMediaInput): Promise<FinalizeMediaResult> {
  const t0 = Date.now();
  const policy = resolveWatermarkPolicy({
    plan: input.plan,
    email: input.email,
    isAdmin: input.isAdmin,
    keepWatermark: input.keepWatermark,
    sourceUrl: input.sourceUrl,
    alreadyFinalizedHint: input.alreadyFinalizedHint,
  });
  console.log(
    "[WATERMARK_FINALIZE] policy=%s reason=%s media=%s alreadyFinalized=%s tier=%s",
    policy.mode,
    policy.reason,
    input.mediaKind,
    policy.alreadyFinalized,
    input.studioTier ?? "standard",
  );

  if (policy.alreadyFinalized && policyRequiresStamp(policy.mode)) {
    if (!input.sourceUrl) throw new Error(PREPARE_FAILED);
    return {
      finalUrl: input.sourceUrl,
      watermarked: true,
      mode: policy.mode,
      skippedAsFinalized: true,
      timings: { totalMs: Date.now() - t0 },
    };
  }
  if (!policyRequiresStamp(policy.mode)) {
    if (input.sourceUrl) {
      return {
        finalUrl: input.sourceUrl,
        watermarked: false,
        mode: "none",
        skippedAsFinalized: false,
        timings: { totalMs: Date.now() - t0 },
      };
    }
    throw new Error(PREPARE_FAILED);
  }

  let fetchMs: number | undefined;
  let buffer = input.sourceBuffer;
  if (!buffer) {
    if (!input.sourceUrl) throw new Error(PREPARE_FAILED);
    const tf = Date.now();
    try {
      buffer = await fetchMediaBuffer(input.sourceUrl);
    } catch (e) {
      console.error("[WATERMARK_FINALIZE] fetch failed:", e);
      throw new Error(PREPARE_FAILED);
    }
    fetchMs = Date.now() - tf;
  }

  const label =
    input.mediaKind === "image"
      ? resolveExperienceWatermarkLabel(input.studioTier, input.plan)
      : undefined;

  const tr = Date.now();
  let stamped: Buffer;
  try {
    stamped =
      input.mediaKind === "video"
        ? await renderVideoWatermark(buffer, policy.mode)
        : await renderImageWatermark(buffer, policy.mode, label);
  } catch (e) {
    console.error("[WATERMARK_FINALIZE] render failed:", e);
    throw new Error(PREPARE_FAILED);
  }
  const renderMs = Date.now() - tr;
  const ts = Date.now();
  const result = await storeAndSign({
    userId: input.userId,
    buffer: stamped,
    mediaKind: input.mediaKind,
    watermarked: true,
    mode: policy.mode,
  });
  const storeMs = Date.now() - ts;
  console.log(
    "[WATERMARK_FINALIZE] ok media=%s mode=%s label=%s fetchMs=%s renderMs=%s storeMs=%s totalMs=%s",
    input.mediaKind,
    policy.mode,
    label ?? "-",
    fetchMs ?? 0,
    renderMs,
    storeMs,
    Date.now() - t0,
  );
  return { ...result, timings: { fetchMs, renderMs, storeMs, totalMs: Date.now() - t0 } };
}

async function storeAndSign(opts: {
  userId: string;
  buffer: Buffer;
  mediaKind: "image" | "video";
  watermarked: boolean;
  mode: FinalizeMediaResult["mode"];
}): Promise<FinalizeMediaResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const marker = opts.mediaKind === "video" ? FINALIZED_VIDEO_MARKER : FINALIZED_PATH_MARKER;
  const ext = opts.mediaKind === "video" ? "mp4" : "jpg";
  const contentType = opts.mediaKind === "video" ? "video/mp4" : "image/jpeg";
  const path = `${opts.userId}/${marker}${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("uploads")
    .upload(path, opts.buffer, { contentType, upsert: true });
  if (upErr) {
    console.error("[WATERMARK_FINALIZE] upload failed:", upErr.message);
    throw new Error(PREPARE_FAILED);
  }
  const { data: signed, error: sErr } = await supabaseAdmin.storage
    .from("uploads")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (sErr || !signed?.signedUrl) {
    console.error("[WATERMARK_FINALIZE] signed URL failed:", sErr?.message);
    throw new Error(PREPARE_FAILED);
  }
  return {
    finalUrl: signed.signedUrl,
    watermarked: opts.watermarked,
    mode: opts.mode,
    storagePath: path,
    skippedAsFinalized: false,
  };
}
