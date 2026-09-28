/**
 * Ultra AI request validation — isolated from Standard/Premium.
 */

import { ULTRA_LIMITS } from "./model";
import type {
  UltraAspectRatio,
  UltraImageRequest,
  UltraMode,
  UltraQuality,
  UltraValidationResult,
} from "./types";

const HTTPS = /^https:\/\//i;

function isHttpsUrl(u: unknown): u is string {
  return typeof u === "string" && u.length > 8 && HTTPS.test(u) && u.length <= 15_000_000;
}

export function normalizeUltraQuality(raw: string | null | undefined): UltraQuality {
  const q = (raw ?? "sd").toLowerCase().replace(/\s+/g, "_");
  if (q === "8k_max" || q === "8kmax" || q === "8k-max") return "8k_max";
  if (q === "8k") return "8k";
  if (q === "4k") return "4k";
  if (q === "2k") return "2k";
  if (q === "hd") return "hd";
  return "sd";
}

export function normalizeUltraAspect(
  raw: string | null | undefined,
  quality: UltraQuality,
  imaxFlag?: boolean | null,
): { aspect: UltraAspectRatio; error?: string } {
  const a = (raw ?? "1:1").toLowerCase();
  // IMAX is true 1.43:1 cinema — only via explicit imax flag/aspect + 8k_max.
  // 21:9 is normal ultra-wide and must NOT be treated as IMAX.
  const wantsImax = imaxFlag === true || a === "imax";

  if (wantsImax) {
    if (quality !== "8k_max") {
      return {
        aspect: "1:1",
        error: "IMAX is only available with 8K Max quality.",
      };
    }
    return { aspect: "imax" };
  }

  if (
    a === "1:1" ||
    a === "4:3" ||
    a === "16:9" ||
    a === "9:16" ||
    a === "3:4" ||
    a === "21:9"
  ) {
    return { aspect: a as UltraAspectRatio };
  }
  // Custom: client may send "custom" — treat as 16:9 master; prompt should carry ratio intent.
  // True free-form W:H custom dims are applied when aspect is a numeric ratio like "2.35:1".
  if (a === "custom") {
    return { aspect: "16:9" };
  }
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0) {
      const r = w / h;
      // Map free ratio to nearest supported Ultra aspect for master generation.
      if (r > 2.1) return { aspect: "21:9" };
      if (r > 1.5) return { aspect: "16:9" };
      if (r > 1.2) return { aspect: "4:3" };
      if (r > 0.9) return { aspect: "1:1" };
      if (r > 0.7) return { aspect: "3:4" };
      return { aspect: "9:16" };
    }
  }
  return { aspect: "1:1" };
}

/**
 * Collect ordered https URLs: primary first, then refs (deduped).
 */
export function collectUltraImageUrls(
  imageUrl: string | null | undefined,
  referenceImageUrls: string[] | null | undefined,
): string[] {
  const out: string[] = [];
  if (isHttpsUrl(imageUrl)) out.push(imageUrl);
  if (Array.isArray(referenceImageUrls)) {
    for (const u of referenceImageUrls) {
      if (isHttpsUrl(u) && !out.includes(u)) out.push(u);
    }
  }
  return out;
}

export function validateUltraImageRequest(
  raw: UltraImageRequest,
): UltraValidationResult {
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt || prompt.length > ULTRA_LIMITS.maxPromptChars) {
    return {
      ok: false,
      error: `Enter a prompt between 1 and ${ULTRA_LIMITS.maxPromptChars} characters.`,
    };
  }

  const quality = normalizeUltraQuality(raw.imageQuality);
  const aspectResult = normalizeUltraAspect(raw.aspectRatio, quality, raw.imax);
  if (aspectResult.error) {
    return { ok: false, error: aspectResult.error };
  }

  const imageUrls = collectUltraImageUrls(raw.imageUrl, raw.referenceImageUrls);
  const n = imageUrls.length;

  if (n > ULTRA_LIMITS.maxMultiRefs) {
    return {
      ok: false,
      error: `Ultra AI accepts at most ${ULTRA_LIMITS.maxMultiRefs} images.`,
    };
  }

  let mode: UltraMode;
  if (n === 0) {
    mode = "text_to_image";
  } else if (n === 1) {
    mode = "image_to_image";
  } else {
    mode = "multi_image";
  }

  return {
    ok: true,
    mode,
    prompt,
    imageUrls,
    quality,
    aspectRatio: aspectResult.aspect,
    referenceCount: n,
  };
}

/** Candidate for Ultra multi Seedream path (studioTier premium + 2–10 images). */
export function isUltraMultiSeedreamCandidate(opts: {
  studioTier?: string | null;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  maskImageUrl?: string | null;
  circleInstant?: boolean;
}): boolean {
  if (opts.studioTier !== "premium") return false;
  if (opts.maskImageUrl || opts.circleInstant) return false;
  const n = collectUltraImageUrls(opts.imageUrl, opts.referenceImageUrls).length;
  return n >= 2 && n <= 10;
}

/** Any Ultra path (T2I / I2I / multi) when studioTier is premium. */
export function isUltraCandidate(opts: {
  studioTier?: string | null;
  maskImageUrl?: string | null;
  circleInstant?: boolean;
}): boolean {
  if (opts.studioTier !== "premium") return false;
  if (opts.maskImageUrl || opts.circleInstant) return false;
  return true;
}
