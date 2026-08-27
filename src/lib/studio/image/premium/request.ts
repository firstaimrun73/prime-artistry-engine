/**
 * Premium (pro) fal request builders — T2I + single I2I only.
 */

import { PREMIUM_MODELS, premiumFlux2ProImageSize } from "./models";
import type { PremiumValidationOk } from "./validation";

export type PremiumFalStep = {
  label: string;
  model: string;
  body: Record<string, unknown>;
};

export function buildPremiumT2IStep(ok: PremiumValidationOk): PremiumFalStep {
  return {
    label: `premium T2I flux-2-pro ${ok.quality}`,
    model: PREMIUM_MODELS.textToImage,
    body: {
      prompt: ok.prompt,
      image_size: premiumFlux2ProImageSize(ok.quality, ok.aspectRatio),
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enable_safety_checker: true,
    },
  };
}

export function resolvePremiumI2IStrength(
  prompt: string,
  provided?: number | null,
): number {
  if (typeof provided === "number" && provided >= 0.01 && provided <= 1) {
    return provided;
  }
  const p = prompt.toLowerCase();
  if (
    /\b(sharp|sharper|bright|brighter|clear|clearer|enhance|cleaner|upscale|denoise|noise|detail|quality|fix lighting|color balance|more detail)\b/.test(
      p,
    )
  ) {
    return 0.4;
  }
  if (
    /\b(replace|transform into|change into|convert to|in the style of|as a|turn into|make it a)\b/.test(
      p,
    )
  ) {
    return 0.72;
  }
  return 0.55;
}

export function buildPremiumI2IStep(ok: PremiumValidationOk): PremiumFalStep {
  if (!ok.imageUrl || !ok.imageUrl.startsWith("https://")) {
    throw new Error("Premium I2I requires a valid HTTPS source image URL.");
  }
  const strength = resolvePremiumI2IStrength(ok.prompt, ok.strength);
  const prompt = ok.prompt.trim().toLowerCase().startsWith("edit ")
    ? ok.prompt
    : `Edit the provided photo in place. ${ok.prompt}`;
  return {
    label: `premium I2I flux-dev ${ok.quality} s=${strength}`,
    model: PREMIUM_MODELS.imageToImage,
    body: {
      prompt,
      image_url: ok.imageUrl,
      strength,
      num_inference_steps: ok.quality === "2k" ? 32 : ok.quality === "hd" ? 28 : 20,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
    },
  };
}

export function buildPremiumStep(ok: PremiumValidationOk): PremiumFalStep {
  if (ok.mode === "text_to_image") return buildPremiumT2IStep(ok);
  return buildPremiumI2IStep(ok);
}
