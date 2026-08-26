/**
 * Standard Image Studio router — mode resolution + request dispatch.
 */

import { validateStandardImageRequest } from "./validation";
import { quoteStandardCredits } from "./credits";
import { buildStandardStep } from "./request-builders";
import type {
  StandardCreditQuote,
  StandardFalStep,
  StandardImageRequest,
  StandardValidationOk,
  StandardValidationResult,
} from "./types";

export function routeStandardImage(
  raw: StandardImageRequest,
): StandardValidationResult {
  return validateStandardImageRequest(raw);
}

export function quoteAfterValidation(ok: StandardValidationOk): StandardCreditQuote {
  const totalImages =
    ok.mode === "multi_image_to_image"
      ? (ok.imageUrl ? 1 : 0) + ok.referenceImageUrls.length
      : ok.referenceImageUrls.length;
  return quoteStandardCredits({
    mode: ok.mode,
    referenceCount: totalImages,
    imageQuality: ok.imageQuality,
  });
}

export function planStandardStep(ok: StandardValidationOk): StandardFalStep {
  return buildStandardStep(ok);
}

export {
  validateStandardImageRequest,
  quoteStandardCredits,
  buildStandardStep,
};
