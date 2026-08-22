import { buildCircleRemoveStep } from "../request-builders";
import type { StandardExecuteInput, StandardExecuteResult } from "../types";
import { quoteStandardCredits } from "../credits";

/**
 * Uses fal-ai/flux-pro/v1/erase with original image + mask at original pixel size.
 * Does not overwrite the original upload; returns a new output URL only.
 */
export async function handleCircleToRemove(
  input: StandardExecuteInput,
): Promise<StandardExecuteResult> {
  if (input.mode !== "circle_to_remove") {
    throw new Error("Handler mismatch: expected circle_to_remove");
  }
  if (!input.imageUrl || !input.maskImageUrl) {
    throw new Error("Circle remove requires original image and mask.");
  }
  const step = buildCircleRemoveStep(input);
  if (step.body.image_url !== input.imageUrl || step.body.mask_url !== input.maskImageUrl) {
    throw new Error("Circle remove request lost original image or mask.");
  }
  const outputUrl = await input.runStep(step);
  if (!outputUrl) throw new Error("Circle remove returned no output.");
  if (outputUrl === input.imageUrl) {
    throw new Error("Circle remove returned the original image. Credits not charged.");
  }
  const quote = quoteStandardCredits({ mode: "circle_to_remove" });
  return {
    outputUrl,
    mode: "circle_to_remove",
    model: step.model,
    credits: quote.credits,
  };
}
