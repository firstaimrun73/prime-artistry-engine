/**
 * Build fal body for openai/gpt-image-2/edit multi-reference path.
 * quality is always "low". Prompt is the user prompt (trimmed, not expanded).
 */

import {
  GPT_IMAGE_2_EDIT_MODEL,
  GPT_IMAGE_2_QUALITY,
  gptImage2ImageSize,
  type GptImage2OutputClass,
} from "./model";

export type GptImage2FalStep = {
  label: string;
  model: typeof GPT_IMAGE_2_EDIT_MODEL;
  body: {
    prompt: string;
    image_urls: string[];
    quality: typeof GPT_IMAGE_2_QUALITY;
    num_images: 1;
    output_format: "png";
    image_size: string;
  };
};

/**
 * @param imageUrls Ordered list of https image URLs (length >= 2). Product primary first.
 */
export function buildGptImage2MultiStep(opts: {
  prompt: string;
  imageUrls: string[];
  outputClass: GptImage2OutputClass;
  aspectRatio?: string | null;
  experience: "standard" | "premium";
}): GptImage2FalStep {
  const urls = opts.imageUrls.filter((u) => typeof u === "string" && u.startsWith("https://"));
  if (urls.length < 2) {
    throw new Error("GPT Image 2 multi path requires at least 2 reference images.");
  }
  const prompt = opts.prompt.trim();
  if (!prompt) throw new Error("Prompt is required.");
  if (prompt.length > 2000) {
    throw new Error("Prompt must be at most 2000 characters.");
  }

  return {
    label: `${opts.experience} multi GPT Image 2 LOW x${urls.length}`,
    model: GPT_IMAGE_2_EDIT_MODEL,
    body: {
      prompt,
      image_urls: urls,
      quality: GPT_IMAGE_2_QUALITY,
      num_images: 1,
      output_format: "png",
      image_size: gptImage2ImageSize(opts.outputClass, opts.aspectRatio),
    },
  };
}
