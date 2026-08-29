/**
 * IMAGE STUDIO — experience → model registry
 * Isolated from Video/Music.
 *
 * User-facing: Standard | Premium | Ultra AI
 * Internal ids: standard | pro | premium
 */

import type { StudioTier } from "@/lib/studio/studio-tier";

export type ImageModelSlot =
  | "text_to_image"
  | "image_edit"
  | "image_edit_multi"
  | "inpaint"
  | "upscale"
  | "circle_remove"
  | "circle_add";

export type ImageModelEntry = {
  modelId: string;
  label: string;
  capability: string;
  minimumPlan: "free" | "plus" | "pro" | "studio";
  providerTargetUsd?: number;
  nativeAspects?: Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "*">;
};

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

/** Circle 2edit Remove — product model id (runtime Remove path unchanged this pass). */
export const CIRCLE_REMOVE_MODEL: ImageModelEntry = {
  modelId: "fal-ai/flux-pro/v1/erase",
  label: "Circle Remove",
  capability: "Object erase via mask",
  minimumPlan: "free",
  nativeAspects: ["*"],
};

/** Circle 2edit Add — Standard registry entry for inpaint insert. */
export const CIRCLE_ADD_MODEL: ImageModelEntry = {
  modelId: "fal-ai/flux-general/inpainting",
  label: "Circle Add",
  capability: "Object insert via mask inpaint",
  minimumPlan: "plus",
  providerTargetUsd: 0.075,
  nativeAspects: ["*"],
};

const UPSCALE: ImageModelEntry = {
  modelId: "fal-ai/topaz/upscale/image",
  label: "Topaz Upscale",
  capability: "Resolution upscale",
  minimumPlan: "free",
};

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
    upscale: UPSCALE,
    circle_remove: CIRCLE_REMOVE_MODEL,
    circle_add: CIRCLE_ADD_MODEL,
  },
  pro: {
    text_to_image: T2I,
    image_edit: KONTEXT_PRO,
    image_edit_multi: KONTEXT_MULTI,
    inpaint: INPAINT,
    upscale: UPSCALE,
    circle_remove: CIRCLE_REMOVE_MODEL,
    circle_add: CIRCLE_ADD_MODEL,
  },
  premium: {
    text_to_image: T2I,
    image_edit: KONTEXT_PRO,
    image_edit_multi: KONTEXT_MULTI,
    inpaint: INPAINT,
    upscale: UPSCALE,
    circle_remove: CIRCLE_REMOVE_MODEL,
    circle_add: CIRCLE_ADD_MODEL,
  },
};

export function resolveImageModelSlot(opts: {
  hasMask?: boolean;
  hasSource?: boolean;
  multiRef?: boolean;
  circleInstant?: boolean | null;
}): ImageModelSlot {
  if (opts.hasMask && opts.circleInstant === true) return "circle_remove";
  if (opts.hasMask && opts.circleInstant === false) return "circle_add";
  if (opts.hasMask) return "inpaint";
  if (opts.multiRef) return "image_edit_multi";
  if (opts.hasSource) return "image_edit";
  return "text_to_image";
}
