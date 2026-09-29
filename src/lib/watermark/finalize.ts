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
  type WatermarkBrand,
} from "./types";
import { WATERMARK_BRAND_TEXT } from "@/lib/watermark-config";

export const PREPARE_FAILED = "Could not prepare your media. Please try again.";

const VALID_TIERS: readonly WatermarkStudioTier[] = ["standard", "pro", "premium"] as const;

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

/**
 * Primary watermark label. Keep short so the pill stays large and readable.
 */
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

function prefersPrivateR2(plan: string | null | undefined, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  const p = (plan ?? "free").toLowerCase();
  return p !== "free" && p !== "";
}

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
  if (!policyRequiresStamp(policy.mode)) {
    // Paid/Admin clean path: still persist master to private store when possible
    if (input.sourceUrl) {
      try {
        const stored = await storeCleanMaster({
          userId: input.userId,
          sourceUrl: input.sourceUrl,
          sourceBuffer: input.sourceBuffer,
          mediaKind: input.mediaKind,
          plan: input.plan,
          isAdmin: input.isAdmin,
        });
        if (stored) {
          return {
            finalUrl: stored.finalUrl,
            watermarked: false,
            mode: "none",
            storagePath: stored.storagePath,
            skippedAsFinalized: false,
            timings: { totalMs: Date.now() - t0 },
          };
        }
      } catch (e) {
        console.warn("[WATERMARK_FINALIZE] clean master store skipped:", e);
      }
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
    input.mediaKind === "image" && brand === "generic"
      ? resolveExperienceWatermarkLabel(input.studioTier, input.plan)
      : undefined;

  const tr = Date.now();
  let stamped: Buffer;
  try {
    stamped =
      input.mediaKind === "video"
        ? await renderVideoWatermark(buffer, policy.mode)
        : await renderImageWatermark(buffer, policy.mode, label, brand, policy.reason === "free_plan_forced");
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
    plan: input.plan,
    isAdmin: input.isAdmin,
  });
  const storeMs = Date.now() - ts;
  console.log(
    "[WATERMARK_FINALIZE] ok media=%s mode=%s brand=%s fetchMs=%s renderMs=%s storeMs=%s totalMs=%s",
    input.mediaKind,
    policy.mode,
    brand,
    fetchMs ?? 0,
    renderMs,
    storeMs,
    Date.now() - t0,
  );
  return { ...result, timings: { fetchMs, renderMs, storeMs, totalMs: Date.now() - t0 } };
}

async function storeCleanMaster(opts: {
  userId: string;
  sourceUrl: string;
  sourceBuffer?: Buffer;
  mediaKind: "image" | "video";
  plan: string | null | undefined;
  isAdmin?: boolean;
}): Promise<{ finalUrl: string; storagePath: string } | null> {
  let buffer = opts.sourceBuffer;
  if (!buffer) {
    try {
      buffer = await fetchMediaBuffer(opts.sourceUrl);
    } catch {
      return null;
    }
  }
  const stored = await storeAndSign({
    userId: opts.userId,
    buffer,
    mediaKind: opts.mediaKind,
    watermarked: false,
    mode: "none",
    plan: opts.plan,
    isAdmin: opts.isAdmin,
  });
  if (!stored.storagePath) return null;
  return { finalUrl: stored.finalUrl, storagePath: stored.storagePath };
}

async function storeAndSign(opts: {
  userId: string;
  buffer: Buffer;
  mediaKind: "image" | "video";
  watermarked: boolean;
  mode: FinalizeMediaResult["mode"];
  plan?: string | null;
  isAdmin?: boolean;
}): Promise<FinalizeMediaResult> {
  const marker = opts.mediaKind === "video" ? FINALIZED_VIDEO_MARKER : FINALIZED_PATH_MARKER;
  const ext = opts.mediaKind === "video" ? "mp4" : "jpg";
  const contentType = opts.mediaKind === "video" ? "video/mp4" : "image/jpeg";
  const key = `users/${opts.userId}/outputs/${marker}${Date.now()}.${ext}`;
  const useR2 = prefersPrivateR2(opts.plan, opts.isAdmin);

  // PAID / ADMIN → private user-media R2 (motio2edit-user-media)
  if (useR2) {
    try {
      const {
        isPrivateR2Configured,
        privateR2PutObject,
        privateR2SignedGetUrl,
      } = await import("@/lib/private-history-storage.server");
      if (isPrivateR2Configured()) {
        await privateR2PutObject({ key, body: opts.buffer, contentType });
        const url = await privateR2SignedGetUrl(key);
        if (url) {
          return {
            finalUrl: url,
            watermarked: opts.watermarked,
            mode: opts.mode,
            storagePath: key,
            skippedAsFinalized: false,
          };
        }
      }
    } catch (e) {
      console.warn("[WATERMARK_FINALIZE] private R2 store failed:", e);
    }
  }

  // FREE → private Vercel Blob (or R2 failed for paid)
  try {
    const { isPrivateBlobConfigured, privateBlobPutObject } = await import(
      "@/lib/private-history-storage.server"
    );
    if (isPrivateBlobConfigured()) {
      const { url } = await privateBlobPutObject({
        pathname: key,
        body: opts.buffer,
        contentType,
      });
      if (url) {
        return {
          finalUrl: url,
          watermarked: opts.watermarked,
          mode: opts.mode,
          storagePath: key,
          skippedAsFinalized: false,
        };
      }
    }
  } catch (e) {
    console.warn("[WATERMARK_FINALIZE] private Blob store failed:", e);
  }

  // Last resort for paid if Blob missing: try R2 even when plan routing preferred Blob
  if (!useR2) {
    try {
      const {
        isPrivateR2Configured,
        privateR2PutObject,
        privateR2SignedGetUrl,
      } = await import("@/lib/private-history-storage.server");
      if (isPrivateR2Configured()) {
        await privateR2PutObject({ key, body: opts.buffer, contentType });
        const url = await privateR2SignedGetUrl(key);
        if (url) {
          return {
            finalUrl: url,
            watermarked: opts.watermarked,
            mode: opts.mode,
            storagePath: key,
            skippedAsFinalized: false,
          };
        }
      }
    } catch (e) {
      console.warn("[WATERMARK_FINALIZE] fallback R2 failed:", e);
    }
  }

  // Fallback: Supabase storage (legacy)
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
