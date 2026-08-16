/**
 * Map Multi-Image job config → existing generateMedia input.
 * Does not call FAL directly; does not invent endpoints.
 */

import type { MultiImageGeneratePayload, MultiImageJobConfig } from "./types";
import { pickDefaultModel, resolveExecutableOutputCount } from "./config";

export type BuildMultiImageRequestResult =
  | { ok: true; payload: MultiImageGeneratePayload; warnings: string[] }
  | { ok: false; error: string };

/**
 * Primary = first https URL; remaining https URLs become referenceImageUrls.
 * Caller must upload data:/blob: sources to storage before calling this.
 */
export function buildMultiImageGeneratePayload(
  config: MultiImageJobConfig,
  uploadedHttpsUrls: string[],
): BuildMultiImageRequestResult {
  const warnings: string[] = [];
  const urls = uploadedHttpsUrls.filter((u) => typeof u === "string" && u.startsWith("https://"));

  if (urls.length === 0) {
    return { ok: false, error: "Upload at least one image and ensure it is available as an https URL." };
  }

  if (!config.prompt.trim()) {
    return { ok: false, error: "Enter a prompt describing how the images should be combined or edited." };
  }

  const model = pickDefaultModel(urls.length);
  if (config.modelId === "kontext-multi" && urls.length < 2) {
    warnings.push("Kontext Multi needs 2+ images; falling back to single-image Kontext.");
  }

  const executableOutputs = resolveExecutableOutputCount(config.outputCount, model.id);
  if (config.outputCount > executableOutputs) {
    warnings.push(
      `Requested ${config.outputCount} outputs; current model path only produces ${executableOutputs}.`,
    );
  }

  const primary = urls[0];
  const refs = urls.slice(1);

  const payload: MultiImageGeneratePayload = {
    prompt: config.prompt.trim().slice(0, 2000),
    type: "image",
    imageUrl: primary,
    sourceKind: "image",
    referenceImageUrls: refs.length > 0 ? refs : undefined,
    imageQuality: config.quality,
    requestedOutputCount: executableOutputs,
  };

  // aspectRatio is only used by text-to-image in generateMedia today;
  // multi-image always has imageUrl so aspect is UI-only until backend supports it.
  if (config.aspectRatio) {
    warnings.push(
      "Aspect ratio is shown for product completeness; current image-edit path keeps source framing.",
    );
  }

  return { ok: true, payload, warnings };
}
