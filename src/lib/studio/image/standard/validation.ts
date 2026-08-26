/**
 * Validate Standard Image Studio requests before any fal.ai call.
 * Reject invalid inputs; never reorder multi-image references.
 *
 * Multi (GPT Image 2): total images = primary + refs must be 2–5.
 * 1 total image → image_to_image (Kontext). 0 → text_to_image.
 */

import type { StandardImageRequest, StandardValidationResult } from "./types";

const HTTPS = /^https:\/\//i;

function isHttpsUrl(u: unknown): u is string {
  return typeof u === "string" && u.length > 8 && HTTPS.test(u) && u.length <= 15_000_000;
}

/**
 * Preserve upload order. Filter invalid slots without reordering valid ones.
 * Cap at 5 extra refs (product max for Standard multi extras).
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

  const rawQ = String(raw.imageQuality ?? "").toLowerCase();
  if ((rawQ === "2k" || rawQ === "4k" || rawQ === "8k") && imageUrl && referenceImageUrls.length > 0) {
    return { ok: false, error: "Standard multi-reference supports SD and HD only (not 2K)." };
  }

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

  const totalImages = (imageUrl ? 1 : 0) + referenceImageUrls.length;

  if (imageUrl && totalImages >= 2) {
    if (totalImages > 5) {
      return { ok: false, error: "Standard Multiple Image accepts at most 5 images." };
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
