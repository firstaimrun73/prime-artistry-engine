/**
 * Execute Standard Image Studio end-to-end for one request.
 * Validate → quote → fal → verify URL. Credits are NOT deducted here.
 */

import { routeStandardImage, quoteAfterValidation } from "./router";
import { runStandardFalStep } from "./fal-client";
import { handleTextToImage } from "./handlers/text-to-image";
import { handleImageToImage } from "./handlers/image-to-image";
import { handleMultiImageToImage } from "./handlers/multi-image-to-image";
import { handleCircleToRemove } from "./handlers/circle-to-remove";
import { handleCircleToAdd } from "./handlers/circle-to-add";
import type {
  StandardExecuteResult,
  StandardFalStep,
  StandardImageRequest,
} from "./types";

export type ExecuteStandardOptions = {
  falKey: string;
  /** Optional override for tests. */
  runStep?: (step: StandardFalStep) => Promise<string>;
};

export async function executeStandardImage(
  raw: StandardImageRequest,
  opts: ExecuteStandardOptions,
): Promise<StandardExecuteResult> {
  const validated = routeStandardImage(raw);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const quote = quoteAfterValidation(validated);
  const runStep =
    opts.runStep ??
    ((step: StandardFalStep) => runStandardFalStep(step, opts.falKey));

  const input = { ...validated, falKey: opts.falKey, runStep };

  let result: StandardExecuteResult;
  switch (validated.mode) {
    case "text_to_image":
      result = await handleTextToImage(input);
      break;
    case "image_to_image":
      result = await handleImageToImage(input);
      break;
    case "multi_image_to_image":
      result = await handleMultiImageToImage(input);
      break;
    case "circle_to_remove":
      result = await handleCircleToRemove(input);
      break;
    case "circle_to_add":
      result = await handleCircleToAdd(input);
      break;
    default: {
      const _e: never = validated.mode;
      throw new Error(`Unhandled Standard mode: ${String(_e)}`);
    }
  }

  if (!result.outputUrl || !result.outputUrl.startsWith("http")) {
    throw new Error("Standard generation returned no output URL. Credits not charged.");
  }

  // Ensure quoted credits match handler (authoritative quote)
  return { ...result, credits: quote.credits };
}
