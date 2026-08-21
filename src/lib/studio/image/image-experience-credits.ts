/**
 * Image Studio surface credits — authoritative for UI + server.
 *
 * Pricing is by experience + input mode, NOT by quality chip.
 * Internal ids: standard | pro | premium
 * User-facing: Standard | Premium | Ultra AI
 *
 * Ultra AI 8K (studio / business plans only): +10 credits.
 * Multi-image charge is per generation job, not per input image.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";
import type { ImageQuality } from "@/lib/quality-options";

export type ImageInputMode = "text_to_image" | "image_to_image" | "multi_image";

/** Base credits by experience × mode (product rule). */
export const IMAGE_EXPERIENCE_BASE_CREDITS: Record<
  StudioTier,
  Record<ImageInputMode, number>
> = {
  standard: {
    text_to_image: 25,
    image_to_image: 25,
    multi_image: 30,
  },
  pro: {
    text_to_image: 30,
    image_to_image: 30,
    multi_image: 35,
  },
  premium: {
    text_to_image: 30,
    image_to_image: 30,
    multi_image: 35,
  },
};

/** Plans allowed to use Ultra AI (premium) 8K path with +10 credits. */
const ULTRA_8K_PLANS = new Set(["studio", "business"]);

export const ULTRA_8K_EXTRA_CREDITS = 10;

export function resolveImageInputMode(opts: {
  hasSourceImage: boolean;
  referenceCount?: number;
}): ImageInputMode {
  const refs = opts.referenceCount ?? 0;
  if (opts.hasSourceImage && refs > 0) return "multi_image";
  if (opts.hasSourceImage) return "image_to_image";
  return "text_to_image";
}

export type ImageExperienceCreditInput = {
  studioTier?: StudioTier | null;
  hasSourceImage: boolean;
  /** Extra reference images (not counting primary). */
  referenceCount?: number;
  imageQuality?: ImageQuality | null;
  /** User plan id (free, lite, plus, pro, studio, business). */
  plan?: string | null;
  isAdmin?: boolean;
  /** Circle instant path keeps fixed product charge. */
  circleInstant?: boolean;
  circleInstantCredits?: number;
};

export type ImageExperienceCreditResult = {
  credits: number;
  mode: ImageInputMode;
  tier: StudioTier;
  baseCredits: number;
  ultra8kSurcharge: number;
  breakdown: string;
};

/**
 * Authoritative user credit charge for an Image Studio generation.
 * Quality does not change base credits (except approved Ultra 8K +10).
 * Reference image count does not multiply credits.
 */
export function computeImageExperienceCredits(
  input: ImageExperienceCreditInput,
): ImageExperienceCreditResult {
  if (input.circleInstant) {
    const c = input.circleInstantCredits ?? 35;
    return {
      credits: c,
      mode: "image_to_image",
      tier: input.studioTier ?? "standard",
      baseCredits: c,
      ultra8kSurcharge: 0,
      breakdown: `Circle remove ${c}`,
    };
  }

  const tier: StudioTier = input.studioTier ?? "standard";
  const mode = resolveImageInputMode({
    hasSourceImage: input.hasSourceImage,
    referenceCount: input.referenceCount,
  });
  const base = IMAGE_EXPERIENCE_BASE_CREDITS[tier][mode];

  let ultra8k = 0;
  if (
    tier === "premium" &&
    input.imageQuality === "8k" &&
    (input.isAdmin || ULTRA_8K_PLANS.has((input.plan ?? "").toLowerCase()))
  ) {
    ultra8k = ULTRA_8K_EXTRA_CREDITS;
  }

  const total = base + ultra8k;
  const expName = tier === "premium" ? "Ultra AI" : tier === "pro" ? "Premium" : "Standard";
  const modeName =
    mode === "multi_image"
      ? "Multi-image"
      : mode === "image_to_image"
        ? "Image→Image"
        : "Text→Image";

  return {
    credits: total,
    mode,
    tier,
    baseCredits: base,
    ultra8kSurcharge: ultra8k,
    breakdown:
      ultra8k > 0
        ? `${expName} ${modeName} ${base} + 8K ${ultra8k}`
        : `${expName} ${modeName} ${base}`,
  };
}

/** Client-safe estimate (same formula as server). */
export function estimateImageStudioCredits(
  input: Omit<ImageExperienceCreditInput, "circleInstant" | "circleInstantCredits">,
): number {
  return computeImageExperienceCredits(input).credits;
}
