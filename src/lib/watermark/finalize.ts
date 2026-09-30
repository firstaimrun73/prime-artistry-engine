import { findPlan } from "@/lib/plans";
import { resolveWatermarkPolicy, policyRequiresStamp } from "./policy";
import { renderImageWatermark, fetchMediaBuffer } from "./image";
import { renderVideoWatermark } from "./video";
import {
  type FinalizeMediaInput,
  type FinalizeMediaResult,
  type WatermarkStudioTier,
  type WatermarkBrand,
} from "./types";
import { WATERMARK_BRAND_TEXT } from "@/lib/watermark-config";

export const PREPARE_FAILED = "Could not prepare your media. Please try again.";

const VALID_TIERS: readonly WatermarkStudioTier[] = ["standard", "pro", "premium"] as const;

/** Avoid huge data URLs for video; images stay under a safe in-memory ceiling. */
const MAX_DATA_URL_BYTES = 12 * 1024 * 1024;

function experienceLabelFromTier(tier: WatermarkStudioTier): string {
  switch (tier) {
    case "pro":
      return "Premium";
    case "premium":
      return "Ultra AI";
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

export function resolveExperienceWatermarkLabel(
  studioTier: WatermarkStudioTier | undefined,
  planId: string | null | undefined,
): string {
  const plan = (planId ?? "free").toLowerCase();
  if (plan === "free" || plan === "") return WATERMARK_BRAND_TEXT;

  const tier = normalizeStudioTier(studioTier);
  const exp = experienceLabelFromTier(tier);
  if (tier === "standard") return WATERMARK_BRAND_TEXT;
  const planName = findPlan(planId)?.name;
  if (planName && planName.length <= 12) return `${WATERMARK_BRAND_TEXT} · ${exp}`;
  return `${WATERMARK_BRAND_TEXT} · ${exp}`;
}

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

/**
 * Watermark finalize — NO permanent copy to R2 / Blob / Supabase Storage.
 * Clean (no stamp): return provider/fal source URL.
 * Stamped: return ephemeral data URL for download/display only.
 */
export async function finalizeMediaAsset(input: FinalizeMediaInput): Promise<FinalizeMediaResult> {
  const t0 = Date.now();
  const brand: WatermarkBrand = input.watermarkBrand === "circle" ? "circle" : "generic";
  const policy = resolveWatermarkPolicy({
    plan: input.plan,
    email: input.email,
    isAdmin: input.isAdmin,
    keepWatermark: input.keepWatermark,
    sourceUrl: input.sourceUrl,
    alreadyFinalizedHint: input.alreadyFinalizedHint,
  });
  console.log(
    "[WATERMARK_FINALIZE] policy=%s reason=%s media=%s brand=%s alreadyFinalized=%s",
    policy.mode,
    policy.reason,
    input.mediaKind,
    brand,
    policy.alreadyFinalized,
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

  // No stamp required — return provider URL as-is (no Motio2edit storage).
  if (!policyRequiresStamp(policy.mode)) {
    if (!input.sourceUrl) throw new Error(PREPARE_FAILED);
    return {
      finalUrl: input.sourceUrl,
      watermarked: false,
      mode: "none",
      skippedAsFinalized: false,
      timings: { totalMs: Date.now() - t0 },
    };
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
    input.mediaKind === "image" && brand === "generic"
      ? resolveExperienceWatermarkLabel(input.studioTier, input.plan)
      : undefined;

  const tr = Date.now();
  let stamped: Buffer;
  try {
    stamped =
      input.mediaKind === "video"
        ? await renderVideoWatermark(buffer, policy.mode)
        : await renderImageWatermark(
            buffer,
            policy.mode,
            label,
            brand,
            policy.reason === "free_plan_forced",
          );
  } catch (e) {
    console.error("[WATERMARK_FINALIZE] render failed:", e);
    throw new Error(PREPARE_FAILED);
  }
  const renderMs = Date.now() - tr;

  const contentType = input.mediaKind === "video" ? "video/mp4" : "image/jpeg";
  if (stamped.length > MAX_DATA_URL_BYTES) {
    // Refuse permanent storage; fall back to source URL for oversized payloads.
    console.warn(
      "[WATERMARK_FINALIZE] stamped media too large for ephemeral data URL (%s bytes); returning source",
      stamped.length,
    );
    if (!input.sourceUrl) throw new Error(PREPARE_FAILED);
    return {
      finalUrl: input.sourceUrl,
      watermarked: false,
      mode: policy.mode,
      skippedAsFinalized: false,
      timings: { fetchMs, renderMs, storeMs: 0, totalMs: Date.now() - t0 },
    };
  }

  const finalUrl = bufferToDataUrl(stamped, contentType);
  console.log(
    "[WATERMARK_FINALIZE] ok media=%s mode=%s ephemeral=data-url fetchMs=%s renderMs=%s totalMs=%s",
    input.mediaKind,
    policy.mode,
    fetchMs ?? 0,
    renderMs,
    Date.now() - t0,
  );
  return {
    finalUrl,
    watermarked: true,
    mode: policy.mode,
    skippedAsFinalized: false,
    timings: { fetchMs, renderMs, storeMs: 0, totalMs: Date.now() - t0 },
  };
}
