// Pure request-builder for fal.ai image workflows.
// Kept framework-free so it can be unit-tested without network or auth.

export type ImageWorkflow = "text-to-image" | "image-to-image";

export type BuildFalRequestInput = {
  prompt: string;
  /** Data URI or public URL of the uploaded source image (image-to-image only). */
  imageUrl?: string | null;
  /**
   * Edit strength for image-to-image (0.1 – 1). Higher = more visible changes.
   * Maps to a higher guidance_scale so requested edits are clearly applied.
   * Defaults to a strong-but-faithful value.
   */
  strength?: number;
};

export type FalRequest = {
  workflow: ImageWorkflow;
  /** Model identifier (also the fal.run endpoint path). */
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
};

// Model selection — rationale:
//  • Text → Image:  FLUX1.1 [pro] — top-tier prompt following & fidelity.
//  • Image → Image: FLUX.1 Kontext [pro] — instruction editing that preserves
//    the original image and applies ONLY the requested modifications. This is
//    what powers enhancement, restoration, background changes, object edits,
//    and style transfer.
export const TEXT_TO_IMAGE_MODEL = "fal-ai/flux-pro/v1.1";
export const IMAGE_TO_IMAGE_MODEL = "fal-ai/flux-pro/kontext";

const FAL_BASE = "https://fal.run/";

// Kontext guidance: 3.5 (default) barely changes the image, which is the
// "enhancement produces no visible change" bug. We scale guidance with the
// requested strength so edits are clearly visible while staying faithful.
const MIN_GUIDANCE = 3.5;
const MAX_GUIDANCE = 8;

export function buildFalRequest({ prompt, imageUrl, strength = 0.7 }: BuildFalRequestInput): FalRequest {
  if (imageUrl) {
    const s = Math.min(1, Math.max(0.1, strength));
    const guidance_scale = Number((MIN_GUIDANCE + (MAX_GUIDANCE - MIN_GUIDANCE) * s).toFixed(2));
    return {
      workflow: "image-to-image",
      model: IMAGE_TO_IMAGE_MODEL,
      endpoint: `${FAL_BASE}${IMAGE_TO_IMAGE_MODEL}`,
      body: {
        prompt,
        image_url: imageUrl,
        num_images: 1,
        // Stronger guidance => visible, intentional edits (fixes "no change").
        guidance_scale,
        num_inference_steps: 40,
        safety_tolerance: "2",
        output_format: "png",
      },
    };
  }

  return {
    workflow: "text-to-image",
    model: TEXT_TO_IMAGE_MODEL,
    endpoint: `${FAL_BASE}${TEXT_TO_IMAGE_MODEL}`,
    body: {
      prompt,
      image_size: "square_hd",
      num_images: 1,
      // Higher steps + guidance => better prompt adherence and detail.
      num_inference_steps: 40,
      guidance_scale: 4.5,
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}
