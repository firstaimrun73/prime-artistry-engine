/**
 * Validate Standard Image Studio requests before any fal.ai call.
 * Reject invalid inputs; never reorder multi-image references.
 */

import type { StandardImageRequest, StandardValidationResult } from "./types";

const HTTPS = /^https:\/\//i;

function isHttpsUrl(u: unknown): u is string {
  return typeof u === "string" && u.length > 8 && HTTPS.test(u) && u.length <= 15_000_000;
}

/**
 * Preserve upload order. Filter invalid slots without reordering valid ones.
 * Does not sort. Does not move later refs earlier.
 */
export function normalizeOrderedRefs(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (const u of urls) {
    if (isHttpsUrl(u)) out.push(u);
    if (out.length >= 5) break;
  }
  return out;
}

export function validateStandardImageRequest(
  raw: StandardImageRequest,
): StandardValidationResult {
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt || prompt.length > 2000) {
    return { ok: false, error: "Enter a prompt between 1 and 2000 characters." };
  }

  const imageUrl = isHttpsUrl(raw.imageUrl) ? raw.imageUrl : undefined;
  const maskImageUrl = isHttpsUrl(raw.maskImageUrl) ? raw.maskImageUrl : undefined;
  const referenceImageUrls = normalizeOrderedRefs(raw.referenceImageUrls ?? []);

  const quality =
    raw.imageQuality === "hd" || raw.imageQuality === "sd" ? raw.imageQuality : "sd";

  const aspect =
    raw.aspectRatio === "1:1" ||
    raw.aspectRatio === "4:3" ||
    raw.aspectRatio === "16:9" ||
    raw.aspectRatio === "9:16" ||
    raw.aspectRatio === "3:4"
      ? raw.aspectRatio
      : undefined;

  // Circle to Remove — original + mask aligned to original pixels
  if (maskImageUrl || raw.circleInstant) {
    if (!imageUrl) {
      return { ok: false, error: "Circle remove requires the original source image." };
    }
    if (!maskImageUrl) {
      return { ok: false, error: "Circle remove requires a mask matched to the original image size." };
    }
    return {
      ok: true,
      mode: "circle_to_remove",
      prompt,
      imageUrl,
      referenceImageUrls: [],
      maskImageUrl,
      aspectRatio: aspect,
      imageQuality: quality,
      strength: typeof raw.strength === "number" ? raw.strength : undefined,
    };
  }

  // Multi-image: base + 1–5 refs (reject 0 extra when caller intended multi via refs array length rules)
  if (imageUrl && referenceImageUrls.length > 0) {
    if (referenceImageUrls.length > 5) {
      return { ok: false, error: "Multiple Image accepts at most 5 reference images." };
    }
    return {
      ok: true,
      mode: "multi_image_to_image",
      prompt,
      imageUrl,
      referenceImageUrls,
      aspectRatio: aspect,
      imageQuality: quality,
      strength: typeof raw.strength === "number" ? raw.strength : undefined,
    };
  }

  // Image → Image
  if (imageUrl) {
    return {
      ok: true,
      mode: "image_to_image",
      prompt,
      imageUrl,
      referenceImageUrls: [],
      aspectRatio: aspect,
      imageQuality: quality,
      strength: typeof raw.strength === "number" ? raw.strength : undefined,
    };
  }

  // Text → Image
  if (referenceImageUrls.length > 0) {
    return { ok: false, error: "Text → Image does not accept reference images without a base image." };
  }

  return {
    ok: true,
    mode: "text_to_image",
    prompt,
    referenceImageUrls: [],
    aspectRatio: aspect,
    imageQuality: quality,
  };
}
