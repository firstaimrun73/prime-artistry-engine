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

export function buildPremiumI2IStep(ok: PremiumValidationOk): PremiumFalStep {
  if (!ok.imageUrl || !ok.imageUrl.startsWith("https://")) {
    throw new Error("Premium I2I requires a valid HTTPS source image URL.");
  }
  const raw = ok.prompt.trim();
  const prompt =
    /\b(edit|enhance|sharpen|brighten|clear|fix|improve|make|change|remove|add)\b/i.test(raw)
      ? raw
      : `Edit this photo: ${raw}. Keep the same scene, layout, and subjects.`;

  return {
    label: `premium I2I kontext-pro ${ok.quality}`,
    model: PREMIUM_MODELS.imageToImage,
    body: {
      prompt,
      image_url: ok.imageUrl,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enhance_prompt: false,
    },
  };
}

export function buildPremiumStep(ok: PremiumValidationOk): PremiumFalStep {
  if (ok.mode === "text_to_image") return buildPremiumT2IStep(ok);
  return buildPremiumI2IStep(ok);
}
