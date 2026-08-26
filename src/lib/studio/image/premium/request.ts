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
  if (!ok.imageUrl) {
    throw new Error("Premium I2I requires a source image.");
  }
  const strength =
    typeof ok.strength === "number" && ok.strength >= 0.01 && ok.strength <= 1
      ? ok.strength
      : 0.85;
  return {
    label: `premium I2I flux-dev ${ok.quality}`,
    model: PREMIUM_MODELS.imageToImage,
    body: {
      prompt: ok.prompt,
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