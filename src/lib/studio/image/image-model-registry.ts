/**
 * IMAGE STUDIO — experience → model registry
 * Isolated from Video/Music.
 *
 * User-facing: Standard | Premium | Ultra AI
 * Internal ids: standard | pro | premium
 *
 * Model IDs use endpoints already wired in fal-request.ts unless noted.
 * Provider cost targets (internal, not user credits):
 *   Standard I2I ≤ ~$0.02–0.04 (verified path: Kontext Pro @ ~$0.04/image)
 *   Premium I2I  ~$0.02–0.04
 *   Ultra AI I2I ≈ $0.04 (Kontext Pro — not Kontext Max @ ~$0.08)
 *
 * T2I shares flux-pro/v1.1 across experiences (product rule).
 * Multi uses kontext/max/multi (only multi-ref path currently integrated).
 * Do not invent unverified fal endpoints here.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";

export type ImageModelSlot =
  | "text_to_image"
  | "image_edit"
  | "image_edit_multi"
  | "inpaint"
  | "upscale";

export type ImageModelEntry = {
  modelId: string;
  label: string;
  capability: string;
  minimumPlan: "free" | "plus" | "pro" | "studio";
  /** Approximate provider USD target (documentation / guardrails). */
  providerTargetUsd?: number;
  /** Native aspect support notes for router. */
  nativeAspects?: Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "*">;
};

/** Shared T2I — basic flux across all experiences. */
const T2I: ImageModelEntry = {
  modelId: "fal-ai/flux-pro/v1.1",
  label: "Flux Pro 1.1",
  capability: "Text → image",
  minimumPlan: "free",
  providerTargetUsd: 0.05,
  nativeAspects: ["*"],
};

const INPAINT: ImageModelEntry = {
  modelId: "fal-ai/flux-general/inpainting",
  label: "Inpaint",
  capability: "Mask removal / fill",
  minimumPlan: "free",
  nativeAspects: ["*"],
};

const UPSCALE: ImageModelEntry = {
  modelId: "fal-ai/topaz/upscale/image",
  label: "Topaz Upscale",
  capability: "Resolution upscale",
  minimumPlan: "free",
};

/**
 * Edit model: Kontext Pro (~$0.04/image) is the verified high-quality path.
 * Standard/Premium/Ultra share this verified endpoint until a cheaper
 * Standard-only model is verified end-to-end in this codebase.
 * Ultra does NOT use Kontext Max (~$0.08).
 */
const KONTEXT_PRO: ImageModelEntry = {
  modelId: "fal-ai/flux-pro/kontext",
  label: "Kontext Pro",
  capability: "High-quality image edit",
  minimumPlan: "free",
  providerTargetUsd: 0.04,
  nativeAspects: ["*"],
};

const KONTEXT_MULTI: ImageModelEntry = {
  modelId: "fal-ai/flux-pro/kontext/max/multi",
  label: "Kontext Multi",
  capability: "Multi-reference edit (up to 9 refs)",
  minimumPlan: "plus",
  providerTargetUsd: 0.05,
  nativeAspects: ["*"],
};

export const IMAGE_MODEL_REGISTRY: Record<
  StudioTier,
  Record<ImageModelSlot, ImageModelEntry>
> = {
  standard: {
    text_to_image: { ...T2I, capability: "Fast text → image" },
    image_edit: {
      ...KONTEXT_PRO,
      label: "Kontext Pro",
      capability: "Reliable edit (verified path)",
    },
    image_edit_multi: {
      ...KONTEXT_MULTI,
      capability: "Multi-reference (plan-gated)",
      minimumPlan: "plus",
    },
    inpaint: INPAINT,
    upscale: { ...UPSCALE, capability: "HD path" },
  },
  pro: {
    text_to_image: { ...T2I, capability: "Text → image", minimumPlan: "free" },
    image_edit: {
      ...KONTEXT_PRO,
      label: "Kontext Pro",
      capability: "Stronger edit fidelity",
      minimumPlan: "free",
    },
    image_edit_multi: {
      ...KONTEXT_MULTI,
      capability: "Multi-reference Premium",
      minimumPlan: "plus",
    },
    inpaint: INPAINT,
    upscale: { ...UPSCALE, capability: "2K–8K upscale path" },
  },
  premium: {
    text_to_image: { ...T2I, capability: "Text → image", minimumPlan: "free" },
    image_edit: {
      ...KONTEXT_PRO,
      label: "Kontext Pro",
      capability: "Ultra AI edit intelligence (~$0.04 target)",
      minimumPlan: "free",
    },
    image_edit_multi: {
      ...KONTEXT_MULTI,
      label: "Kontext Multi",
      capability: "Ultra multi-reference",
      minimumPlan: "plus",
    },
    inpaint: INPAINT,
    upscale: { ...UPSCALE, capability: "4K–8K upscale path" },
  },
};

export function resolveImageModel(tier: StudioTier, slot: ImageModelSlot): ImageModelEntry {
  return IMAGE_MODEL_REGISTRY[tier][slot];
}

export function imageModelPublicLabel(tier: StudioTier, slot: ImageModelSlot): string {
  return IMAGE_MODEL_REGISTRY[tier][slot].label;
}

/** Slot for generate path given inputs. */
export function resolveImageModelSlot(opts: {
  hasSourceImage: boolean;
  hasMask?: boolean;
  referenceCount?: number;
}): ImageModelSlot {
  if (opts.hasMask) return "inpaint";
  if (opts.hasSourceImage && (opts.referenceCount ?? 0) > 0) return "image_edit_multi";
  if (opts.hasSourceImage) return "image_edit";
  return "text_to_image";
}
