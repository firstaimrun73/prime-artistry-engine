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
    a === "21:9" ||
    a === "3:2" ||
    a === "2:3"
  ) {
    return { aspect: a as UltraAspectRatio };
  }
  // Custom must NEVER silently become 16:9 (or any other preset).
  // Bare "custom" without dimensions is rejected — client should send explicit W:H.
  if (a === "custom") {
    return {
      aspect: "1:1",
      error:
        "Custom aspect requires an explicit ratio (for example 2.35:1 or 3:2). It cannot default to 16:9.",
    };
  }
  // Explicit numeric ratios (including 3:2 / 2:3 and free-form) are preserved for provider image_size.
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h)) {
      const known = [
        "1:1",
        "4:3",
        "16:9",
        "9:16",
        "3:4",
        "21:9",
        "3:2",
        "2:3",
      ] as const;
      const normalized = `${w}:${h}`;
      // Prefer canonical labels when exact match (integer forms).
      for (const k of known) {
        const [kw, kh] = k.split(":").map(Number);
        if (Math.abs(w / h - kw / kh) < 1e-6) {
          return { aspect: k as UltraAspectRatio };
        }
      }
      // Preserve free-form ratio as "W:H" — model maps to real pixel dimensions.
      return { aspect: normalized as UltraAspectRatio };
    }
  }
  return {
    aspect: "1:1",
    error: "Unsupported aspect ratio. Choose a preset or an explicit W:H custom ratio.",
  };
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
