/**
 * Premium (studioTier "pro") multi-reference GPT Image 2 path only.
 * Does not touch Ultra (studioTier "premium"), T2I, or single I2I.
 */

import {
  buildGptImage2MultiStep,
  collectMultiReferenceUrls,
  normalizeGptImage2OutputClass,
  quoteGptImage2MultiCredits,
  GPT_IMAGE_2_PREMIUM_LIMITS,
  type GptImage2FalStep,
  type GptImage2OutputClass,
} from "@/lib/studio/image/gpt-image-2";

export type PremiumMultiInput = {
  prompt: string;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  imageQuality?: string | null;
  aspectRatio?: string | null;
};

export type PremiumMultiOk = {
  ok: true;
  prompt: string;
  imageUrls: string[];
  outputClass: GptImage2OutputClass;
  aspectRatio?: string;
  credits: number;
  breakdown: string;
  step: GptImage2FalStep;
};

export type PremiumMultiErr = { ok: false; error: string };

export type PremiumMultiResult = PremiumMultiOk | PremiumMultiErr;

/**
 * Validate + quote + build Premium multi GPT Image 2 request.
 * Returns error if not eligible (wrong image count, 2K ok, medium→low model quality).
 */
export function planPremiumMultiGptImage2(raw: PremiumMultiInput): PremiumMultiResult {
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt || prompt.length > GPT_IMAGE_2_PREMIUM_LIMITS.maxPromptChars) {
    return { ok: false, error: "Enter a prompt between 1 and 2000 characters." };
  }

  const imageUrls = collectMultiReferenceUrls(raw.imageUrl, raw.referenceImageUrls);
  const n = imageUrls.length;
  if (n < GPT_IMAGE_2_PREMIUM_LIMITS.minRefs) {
    return { ok: false, error: "not_multi" };
  }
  if (n > GPT_IMAGE_2_PREMIUM_LIMITS.maxRefs) {
    return {
      ok: false,
      error: `Premium Multiple Image accepts at most ${GPT_IMAGE_2_PREMIUM_LIMITS.maxRefs} images.`,
    };
  }

  const outputClass = normalizeGptImage2OutputClass("premium", raw.imageQuality);
  let quote;
  try {
    quote = quoteGptImage2MultiCredits({
      experience: "premium",
      referenceCount: n,
      outputClass,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid credit request." };
  }

  const aspect =
    raw.aspectRatio === "1:1" ||
    raw.aspectRatio === "4:3" ||
    raw.aspectRatio === "16:9" ||
    raw.aspectRatio === "9:16" ||
    raw.aspectRatio === "3:4"
      ? raw.aspectRatio
      : undefined;

  const step = buildGptImage2MultiStep({
    prompt,
    imageUrls,
    outputClass,
    aspectRatio: aspect,
    experience: "premium",
  });

  if (step.body.quality !== "low") {
    return { ok: false, error: "GPT Image 2 multi path must use quality low." };
  }

  return {
    ok: true,
    prompt,
    imageUrls,
    outputClass,
    aspectRatio: aspect,
    credits: quote.credits,
    breakdown: quote.breakdown,
    step,
  };
}

/** Whether generateMedia should take the Premium multi GPT branch. */
export function isPremiumMultiGptCandidate(opts: {
  studioTier?: string | null;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  maskImageUrl?: string | null;
  circleInstant?: boolean;
}): boolean {
  if (opts.studioTier !== "pro") return false;
  if (opts.maskImageUrl || opts.circleInstant) return false;
  const n = collectMultiReferenceUrls(opts.imageUrl, opts.referenceImageUrls).length;
  return n >= 2 && n <= 10;
}
