/**
 * Execute Premium (pro) T2I or single I2I.
 * Multi path remains in multi-image.ts / generate.functions.
 * Credits are NOT deducted here.
 */

import { quotePremiumCredits } from "./credits";
import { buildPremiumStep } from "./request";
import {
  validatePremiumImageRequest,
  type PremiumImageRequest,
} from "./validation";
import type { PremiumFalStep } from "./request";

export type PremiumExecuteResult = {
  outputUrl: string;
  mode: "text_to_image" | "image_to_image";
  model: string;
  quality: string;
  credits: number;
};

export type PremiumExecuteOptions = {
  falKey: string;
  runStep: (step: PremiumFalStep) => Promise<string>;
};

export async function executePremiumImage(
  raw: PremiumImageRequest,
  opts: PremiumExecuteOptions,
): Promise<PremiumExecuteResult> {
  const validated = validatePremiumImageRequest(raw);
  if (!validated.ok) {
    throw new Error(
      validated.error === "not_single"
        ? "Premium multi-reference must use the multi path."
        : validated.error,
    );
  }

  const quote = quotePremiumCredits({
    mode: validated.mode,
    quality: validated.quality,
  });

  const step = buildPremiumStep(validated);
  const outputUrl = await opts.runStep(step);
  if (!outputUrl || !outputUrl.startsWith("http")) {
    throw new Error("Premium generation returned no output. Credits not charged.");
  }

  return {
    outputUrl,
    mode: validated.mode,
    model: step.model,
    quality: validated.quality,
    credits: quote.credits,
  };
}