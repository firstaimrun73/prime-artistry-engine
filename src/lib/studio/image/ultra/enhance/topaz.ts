/**
 * Topaz Precision adapter for Ultra enhancement.
 * Max factor 4 per call — never invent 8× single-shot.
 */

import { ULTRA_TOPAZ_PRECISION } from "../model";
import type { EnhancementProfile } from "./profiles";

export type UltraEnhanceStep = {
  label: string;
  model: string;
  body: Record<string, unknown>;
};

export function buildTopazPrecisionStep(opts: {
  imageUrl: string;
  profile: EnhancementProfile;
  factor?: number;
}): UltraEnhanceStep {
  const factor = Math.min(4, Math.max(1, opts.factor ?? opts.profile.upscaleFactor));
  return {
    label: `ultra enhance ${opts.profile.id} ${factor}x`,
    model: ULTRA_TOPAZ_PRECISION,
    body: {
      image_url: opts.imageUrl,
      model: opts.profile.topazModel,
      upscale_factor: factor,
      output_format: "png",
      subject_detection: "All",
      face_enhancement: opts.profile.faceEnhancement,
      face_enhancement_strength: opts.profile.faceEnhancement ? 0.8 : 0,
      sharpen: opts.profile.sharpen,
    },
  };
}
