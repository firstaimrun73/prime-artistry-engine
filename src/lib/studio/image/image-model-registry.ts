/**
 * IMAGE STUDIO — tier → model registry
 * Isolated from Video/Music so Image model changes cannot break other studios.
 *
 * Planning (PDF): Standard Kontext-dev, Pro Kontext-pro, Premium Kontext-max.
 * Production mapping uses models already wired in fal-request.ts until
 * live endpoint availability for planned names is verified.
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
};

export const IMAGE_MODEL_REGISTRY: Record<StudioTier, Record<ImageModelSlot, ImageModelEntry>> = {
  standard: {
    text_to_image: {
      modelId: "fal-ai/flux-pro/v1.1",
      label: "Flux Pro 1.1",
      capability: "Fast text → image",
      minimumPlan: "free",
    },
    image_edit: {
      modelId: "fal-ai/flux-pro/kontext",
      label: "Kontext",
      capability: "Reliable image edit",
      minimumPlan: "free",
    },
    image_edit_multi: {
      modelId: "fal-ai/flux-pro/kontext/max/multi",
      label: "Kontext Multi",
      capability: "Multi-reference edit",
      minimumPlan: "plus",
    },
    inpaint: {
      modelId: "fal-ai/flux-general/inpainting",
      label: "Inpaint",
      capability: "Mask removal / fill",
      minimumPlan: "free",
    },
    upscale: {
      modelId: "fal-ai/topaz/upscale/image",
      label: "Topaz Upscale",
      capability: "HD upscale",
      minimumPlan: "free",
    },
  },
  pro: {
    text_to_image: {
      modelId: "fal-ai/flux-pro/v1.1",
      label: "Flux Pro 1.1",
      capability: "Higher consistency text → image",
      minimumPlan: "pro",
    },
    image_edit: {
      modelId: "fal-ai/flux-pro/kontext",
      label: "Kontext Pro path",
      capability: "Stronger edit fidelity",
      minimumPlan: "pro",
    },
    image_edit_multi: {
      modelId: "fal-ai/flux-pro/kontext/max/multi",
      label: "Kontext Multi",
      capability: "Multi-reference Pro",
      minimumPlan: "pro",
    },
    inpaint: {
      modelId: "fal-ai/flux-general/inpainting",
      label: "Inpaint",
      capability: "Precise mask edit",
      minimumPlan: "pro",
    },
    upscale: {
      modelId: "fal-ai/topaz/upscale/image",
      label: "Topaz Upscale",
      capability: "2K path",
      minimumPlan: "pro",
    },
  },
  premium: {
    text_to_image: {
      modelId: "fal-ai/flux-pro/v1.1",
      label: "Flux Pro 1.1",
      capability: "Maximum quality text → image",
      minimumPlan: "studio",
    },
    image_edit: {
      modelId: "fal-ai/flux-pro/kontext",
      label: "Kontext Max path",
      capability: "Highest fidelity edit",
      minimumPlan: "studio",
    },
    image_edit_multi: {
      modelId: "fal-ai/flux-pro/kontext/max/multi",
      label: "Kontext Max Multi",
      capability: "Premium multi-reference",
      minimumPlan: "studio",
    },
    inpaint: {
      modelId: "fal-ai/flux-general/inpainting",
      label: "Inpaint",
      capability: "Premium mask edit",
      minimumPlan: "studio",
    },
    upscale: {
      modelId: "fal-ai/topaz/upscale/image",
      label: "Topaz Upscale",
      capability: "4K path",
      minimumPlan: "studio",
    },
  },
};

export function resolveImageModel(tier: StudioTier, slot: ImageModelSlot): ImageModelEntry {
  return IMAGE_MODEL_REGISTRY[tier][slot];
}

export function imageModelPublicLabel(tier: StudioTier, slot: ImageModelSlot): string {
  return IMAGE_MODEL_REGISTRY[tier][slot].label;
}
