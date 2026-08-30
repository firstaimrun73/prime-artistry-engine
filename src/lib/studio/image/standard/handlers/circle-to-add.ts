import { buildCircleAddStep } from "../request-builders";
import type { StandardExecuteInput, StandardExecuteResult } from "../types";
import { quoteStandardCredits } from "../credits";

/**
 * Uses fal-ai/flux-pro/v1/fill with original image + mask.
 * WHITE = edit region, BLACK = preserve (same polarity as Remove's erase mask).
 * Do not touch the Remove handler.
 */
export async function handleCircleToAdd(
  input: StandardExecuteInput,
): Promise<StandardExecuteResult> {
  if (input.mode !== "circle_to_add") {
    throw new Error("Handler mismatch: expected circle_to_add");
  }
  if (!input.imageUrl || !input.maskImageUrl) {
    throw new Error("Circle add requires original image and mask.");
  }
  const step = buildCircleAddStep(input);
  if (step.body.image_url !== input.imageUrl || step.body.mask_url !== input.maskImageUrl) {
    throw new Error("Circle add request lost original image or mask.");
  }
  const outputUrl = await input.runStep(step);
  if (!outputUrl) throw new Error("Circle add returned no output.");
  if (outputUrl === input.imageUrl) {
    throw new Error("Circle add returned the original image. Credits not charged.");
  }
  const quote = quoteStandardCredits({ mode: "circle_to_add" });
  return {
    outputUrl,
    mode: "circle_to_add",
    model: step.model,
    credits: quote.credits,
  };
}
