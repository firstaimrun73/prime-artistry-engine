import { buildImageToImageStep, isStandardEnhanceIntent } from "../request-builders";
import type { StandardExecuteInput, StandardExecuteResult } from "../types";
import { quoteStandardCredits } from "../credits";

/**
 * Always sends the real source image_url to Kontext.
 * Never falls back to text-to-image. Never returns the original as the result.
 */
export async function handleImageToImage(
  input: StandardExecuteInput,
): Promise<StandardExecuteResult> {
  if (input.mode !== "image_to_image") {
    throw new Error("Handler mismatch: expected image_to_image");
  }
  if (!input.imageUrl) {
    throw new Error("Image → Image requires a source image.");
  }
  const step = buildImageToImageStep(input);
  const outputUrl = await input.runStep(step);
  if (!outputUrl) throw new Error("Image → Image returned no output.");
  if (outputUrl === input.imageUrl) {
    throw new Error("Image → Image returned the original image. Credits not charged.");
  }
  const quote = quoteStandardCredits({ mode: "image_to_image", imageQuality: input.imageQuality });
  const promptSent = typeof step.body.prompt === "string" ? step.body.prompt : input.prompt;
  return {
    outputUrl,
    mode: "image_to_image",
    model: step.model,
    credits: quote.credits,
    historyMeta: {
      source: "standard-image-studio",
      mode: "image_to_image",
      model: step.model,
      experienceLabel: "Standard",
      promptHead: promptSent.slice(0, 280),
      enhanceIntent: isStandardEnhanceIntent(input.prompt),
      imageUrlPresent: true,
    },
  };
}
