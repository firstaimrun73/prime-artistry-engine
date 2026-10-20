/**
 * Legacy generateMedia mask branch → StandardImageRequest.
 *
 * Circle routing (validation.ts):
 *   mask + circleInstant truthy  → circle_to_remove (fal-ai/flux-pro/v1/erase)
 *   mask + !circleInstant        → circle_to_add   (fal-ai/flux-pro/v1/fill)
 *
 * The old call passed mode: "remove" and falKey inside the request via `as any`.
 * executeStandardImage ignores free-form mode and expects falKey in options.
 * Default circleInstant=true preserves the historical erase intent of the
 * mask-only fallback when the client omits circleInstant.
 */
import type { StandardImageRequest } from "./types";

export type LegacyMaskEditInput = {
  prompt: string;
  imageUrl: string;
  /** HTTPS mask URL (GenerateSchema maskUrl / maskImageUrl). */
  maskUrl: string;
  /**
   * When true or omitted → erase (remove).
   * When explicitly false → inpaint add (caller must still supply a valid add prompt).
   */
  circleInstant?: boolean | null;
};

export function buildLegacyMaskEditRequest(input: LegacyMaskEditInput): StandardImageRequest {
  if (!input.imageUrl?.startsWith("https://")) {
    throw new Error("Mask edit requires an HTTPS source image.");
  }
  if (!input.maskUrl?.startsWith("https://")) {
    throw new Error("Mask edit requires an HTTPS mask image.");
  }
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) {
    throw new Error("Mask edit requires a prompt.");
  }
  return {
    prompt,
    imageUrl: input.imageUrl,
    maskImageUrl: input.maskUrl,
    // Omitted / null / undefined → remove (erase). Explicit false → add.
    circleInstant: input.circleInstant === false ? false : true,
  };
}
