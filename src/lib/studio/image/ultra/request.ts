/**
 * Build fal steps for Ultra AI generation (Flux 2 Pro / Seedream).
 * Never emit unsupported native 4K/8K for Seedream.
 */

import {
  ULTRA_FLUX_2_PRO_EDIT,
  ULTRA_FLUX_2_PRO_T2I,
  ULTRA_SEEDREAM_EDIT,
  seedreamImageSize,
  ultraMasterImageSize,
} from "./model";
import type { UltraFalStep, UltraValidationOk } from "./types";

export function buildUltraT2IStep(ok: UltraValidationOk): UltraFalStep {
  return {
    label: `ultra T2I flux-2-pro ${ok.quality}`,
    model: ULTRA_FLUX_2_PRO_T2I,
    body: {
      prompt: ok.prompt,
      image_size: ultraMasterImageSize(ok.quality, ok.aspectRatio),
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enable_safety_checker: true,
    },
  };
}

export function buildUltraI2IStep(ok: UltraValidationOk): UltraFalStep {
  if (ok.imageUrls.length !== 1) {
    throw new Error("Ultra single I2I requires exactly 1 image.");
  }
  return {
    label: `ultra I2I flux-2-pro/edit ${ok.quality}`,
    model: ULTRA_FLUX_2_PRO_EDIT,
    body: {
      prompt: ok.prompt,
      image_urls: ok.imageUrls,
      image_size: ultraMasterImageSize(ok.quality, ok.aspectRatio),
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      enable_safety_checker: true,
    },
  };
}

/**
 * Seedream multi — quality locked to provider-supported sizes only.
 * image_urls = [primary, ...refs] in product order.
 */
export function buildUltraMultiSeedreamStep(ok: UltraValidationOk): UltraFalStep {
  if (ok.imageUrls.length < 2 || ok.imageUrls.length > 10) {
    throw new Error("Ultra multi requires 2–10 images.");
  }
  return {
    label: `ultra multi seedream-5.0-pro ${ok.quality} x${ok.imageUrls.length}`,
    model: ULTRA_SEEDREAM_EDIT,
    body: {
      prompt: ok.prompt,
      image_urls: ok.imageUrls,
      image_size: seedreamImageSize(ok.quality),
      num_images: 1,
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}

export function buildUltraGenerationStep(ok: UltraValidationOk): UltraFalStep {
  switch (ok.mode) {
    case "text_to_image":
      return buildUltraT2IStep(ok);
    case "image_to_image":
      return buildUltraI2IStep(ok);
    case "multi_image":
      return buildUltraMultiSeedreamStep(ok);
    default: {
      const _e: never = ok.mode;
      throw new Error(`Unknown Ultra mode: ${String(_e)}`);
    }
  }
}

/** Assert Seedream body never carries fake 4k/8k size tokens. */
export function assertSeedreamBodySafe(body: Record<string, unknown>): void {
  const size = String(body.image_size ?? "");
  if (/4k|8k|4096|8192/i.test(size)) {
    throw new Error("Seedream must not receive native 4K/8K image_size parameters.");
  }
}
