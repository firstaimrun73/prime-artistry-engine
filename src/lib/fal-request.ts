// Pure request-builder for fal.ai image workflows.
// Kept framework-free so it can be unit-tested without network or auth.

export type ImageWorkflow = "text-to-image" | "image-to-image";

export type BuildFalRequestInput = {
  prompt: string;
  /** Data URI or public URL of the uploaded source image (image-to-image only). */
  imageUrl?: string | null;
};

export type FalRequest = {
  workflow: ImageWorkflow;
  /** Model identifier (also the fal.run endpoint path). */
  model: string;
  endpoint: string;
  body: Record<string, unknown>;
};

// Model selection — see the chat summary for rationale:
//  • Text → Image:  FLUX1.1 [pro] — top-tier prompt following & fidelity.
//  • Image → Image: FLUX.1 Kontext [pro] — instruction editing that preserves
//    the original image and applies ONLY the requested modifications. This is
//    what powers enhancement, background removal, and style transfer.
export const TEXT_TO_IMAGE_MODEL = "fal-ai/flux-pro/v1.1";
export const IMAGE_TO_IMAGE_MODEL = "fal-ai/flux-pro/kontext";

const FAL_BASE = "https://fal.run/";

export function buildFalRequest({ prompt, imageUrl }: BuildFalRequestInput): FalRequest {
  if (imageUrl) {
    return {
      workflow: "image-to-image",
      model: IMAGE_TO_IMAGE_MODEL,
      endpoint: `${FAL_BASE}${IMAGE_TO_IMAGE_MODEL}`,
      body: {
        prompt,
        image_url: imageUrl,
        // Kontext preserves the input by default; these keep output faithful.
        num_images: 1,
        guidance_scale: 3.5,
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
      output_format: "png",
      enable_safety_checker: true,
    },
  };
}
