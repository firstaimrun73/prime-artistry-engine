import { buildTextToImageStep } from "../request-builders";
import type { StandardExecuteInput, StandardExecuteResult } from "../types";
import { quoteStandardCredits } from "../credits";

export async function handleTextToImage(
  input: StandardExecuteInput,
): Promise<StandardExecuteResult> {
  if (input.mode !== "text_to_image") {
    throw new Error("Handler mismatch: expected text_to_image");
  }
  const step = buildTextToImageStep(input);
  const outputUrl = await input.runStep(step);
  if (!outputUrl) throw new Error("Text → Image returned no output.");
  const quote = quoteStandardCredits({
    mode: "text_to_image",
    imageQuality: input.imageQuality,
  });
  return {
    outputUrl,
    mode: "text_to_image",
    model: step.model,
    credits: quote.credits,
  };
}
