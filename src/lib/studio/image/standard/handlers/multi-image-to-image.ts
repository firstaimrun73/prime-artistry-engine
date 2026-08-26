import { buildMultiImageStep } from "../request-builders";
import type { StandardExecuteInput, StandardExecuteResult } from "../types";
import { quoteStandardCredits } from "../credits";

/**
 * Preserves reference order: [base, ref#1, ref#2, …].
 * Requires 2–5 total images (base + refs). GPT Image 2 LOW only.
 */
export async function handleMultiImageToImage(
  input: StandardExecuteInput,
): Promise<StandardExecuteResult> {
  if (input.mode !== "multi_image_to_image") {
    throw new Error("Handler mismatch: expected multi_image_to_image");
  }
  const n = input.referenceImageUrls.length;
  const total = 1 + n;
  if (total < 2 || total > 5) {
    throw new Error("Multiple Image requires 2–5 total images.");
  }
  if (!input.imageUrl) {
    throw new Error("Multiple Image requires a base image.");
  }
  const step = buildMultiImageStep(input);
  const urls = step.body.image_urls as string[] | undefined;
  if (!urls || urls[0] !== input.imageUrl) {
    throw new Error("Multi-image request lost base image order.");
  }
  for (let i = 0; i < n; i++) {
    if (urls[i + 1] !== input.referenceImageUrls[i]) {
      throw new Error("Multi-image reference order was altered. Credits not charged.");
    }
  }
  if (step.body.quality !== "low") {
    throw new Error("GPT Image 2 multi path must use quality low. Credits not charged.");
  }
  const outputUrl = await input.runStep(step);
  if (!outputUrl) throw new Error("Multiple Image returned no output.");
  if (outputUrl === input.imageUrl) {
    throw new Error("Multiple Image returned the original image. Credits not charged.");
  }
  const quote = quoteStandardCredits({
    mode: "multi_image_to_image",
    referenceCount: total,
    imageQuality: input.imageQuality,
  });
  return {
    outputUrl,
    mode: "multi_image_to_image",
    model: step.model,
    credits: quote.credits,
  };
}
