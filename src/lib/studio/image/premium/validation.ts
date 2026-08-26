/**
 * Premium (pro) T2I / single-I2I validation.
 * Multi is handled exclusively by multi-image.ts.
 */

import type { PremiumQuality } from "./models";
import type { PremiumMode } from "./credits";

export type PremiumImageRequest = {
  prompt: string;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  imageQuality?: string | null;
  aspectRatio?: string | null;
  strength?: number | null;
};

export type PremiumValidationOk = {
  ok: true;
  mode: PremiumMode;
  prompt: string;
  imageUrl?: string;
  quality: PremiumQuality;
  aspectRatio?: string;
  strength?: number;
};

export type PremiumValidationErr = { ok: false; error: string };

export type PremiumValidationResult = PremiumValidationOk | PremiumValidationErr;

function isHttps(u: unknown): u is string {
  return typeof u === "string" && u.startsWith("https://") && u.length > 8 && u.length <= 15_000_000;
}

export function normalizePremiumQuality(raw: string | null | undefined): PremiumQuality {
  const q = String(raw ?? "").toLowerCase();
  if (q === "2k") return "2k";
  if (q === "hd") return "hd";
  return "sd"; // default SD — never silently upgrade to HD/2K
}

/**
 * Validate Premium T2I (0 images) or single I2I (exactly 1 image).
 * 2+ images must use planPremiumMultiGptImage2 instead.
 */
export function validatePremiumImageRequest(
  raw: PremiumImageRequest,
): PremiumValidationResult {
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt || prompt.length > 2000) {
    return { ok: false, error: "Enter a prompt between 1 and 2000 characters." };
  }

  const imageUrl = isHttps(raw.imageUrl) ? raw.imageUrl : undefined;
  const extraRefs = Array.isArray(raw.referenceImageUrls)
    ? raw.referenceImageUrls.filter(isHttps)
    : [];

  if (extraRefs.length > 0 && !imageUrl) {
    return {
      ok: false,
      error: "Premium Text → Image does not accept reference images without a base image.",
    };
  }

  const total = (imageUrl ? 1 : 0) + extraRefs.length;
  if (total >= 2) {
    return {
      ok: false,
      error: "not_single", // caller should use multi path
    };
  }

  const quality = normalizePremiumQuality(raw.imageQuality);
  const aspect =
    raw.aspectRatio === "1:1" ||
    raw.aspectRatio === "4:3" ||
    raw.aspectRatio === "16:9" ||
    raw.aspectRatio === "9:16" ||
    raw.aspectRatio === "3:4"
      ? raw.aspectRatio
      : undefined;

  if (imageUrl) {
    return {
      ok: true,
      mode: "image_to_image",
      prompt,
      imageUrl,
      quality,
      aspectRatio: aspect,
      strength: typeof raw.strength === "number" ? raw.strength : undefined,
    };
  }

  return {
    ok: true,
    mode: "text_to_image",
    prompt,
    quality,
    aspectRatio: aspect,
  };
}

/** Premium candidate for T2I / single I2I (not multi, not ultra, not circle). */
export function isPremiumSingleCandidate(opts: {
  studioTier?: string | null;
  maskImageUrl?: string | null;
  circleInstant?: boolean;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
}): boolean {
  if (opts.studioTier !== "pro") return false;
  if (opts.maskImageUrl || opts.circleInstant) return false;
  const refs = Array.isArray(opts.referenceImageUrls)
    ? opts.referenceImageUrls.filter((u) => typeof u === "string" && u.startsWith("https://"))
    : [];
  const hasPrimary =
    typeof opts.imageUrl === "string" && opts.imageUrl.startsWith("https://");
  const total = (hasPrimary ? 1 : 0) + refs.length;
  return total <= 1;
}