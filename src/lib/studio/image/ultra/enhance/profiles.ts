/**
 * Ultra delivery enhancement profiles.
 * 4K/8K/8K Max use genuine upscale — not browser resize.
 */

import type { UltraQuality } from "../types";

export type EnhancementProfile = {
  id: string;
  needsUpscale: boolean;
  /** Topaz upscale_factor (1–4). */
  upscaleFactor: number;
  topazModel: string;
  sharpen: number;
  faceEnhancement: boolean;
  secondPassFactor?: number;
};

export function enhancementProfileFor(
  quality: UltraQuality,
): EnhancementProfile {
  switch (quality) {
    case "sd":
      return {
        id: "sd_passthrough",
        needsUpscale: false,
        upscaleFactor: 1,
        topazModel: "Standard V2",
        sharpen: 0,
        faceEnhancement: false,
      };
    case "hd":
      return {
        id: "hd_light",
        needsUpscale: false,
        upscaleFactor: 1,
        topazModel: "Standard V2",
        sharpen: 0.3,
        faceEnhancement: false,
      };
    case "2k":
      return {
        id: "2k_master",
        needsUpscale: false,
        upscaleFactor: 1,
        topazModel: "High Fidelity V2",
        sharpen: 0.4,
        faceEnhancement: false,
      };
    case "4k":
      return {
        id: "4k_upscale",
        needsUpscale: true,
        upscaleFactor: 2,
        topazModel: "High Fidelity V2",
        sharpen: 0.5,
        faceEnhancement: true,
      };
    case "8k":
      return {
        id: "8k_upscale",
        needsUpscale: true,
        upscaleFactor: 4,
        topazModel: "High Fidelity V2",
        sharpen: 0.55,
        faceEnhancement: true,
      };
    case "8k_max":
      return {
        id: "8k_max_maximum",
        needsUpscale: true,
        upscaleFactor: 4,
        topazModel: "High Fidelity V3",
        sharpen: 0.65,
        faceEnhancement: true,
      };
  }
}
