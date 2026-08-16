/**
 * Multi-Image product types.
 * Distinct from:
 * - Primary gallery (sequential single-primary edits in the main editor)
 * - MultiImageInput reference strip (paid refs on the main editor)
 *
 * This module is the dedicated N-input / M-output feature surface.
 */

import type { ImageQuality } from "@/lib/quality-options";
import type { AspectRatio } from "@/lib/prompt-suggestions";

/** How many source images the user selected for one job. */
export type MultiImageInputCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** How many result images the user requested. */
export type MultiImageOutputCount = 1 | 2 | 3 | 4;

/**
 * Models the product may expose once FAL supports them.
 * Only ids that map to real repo endpoints should be selectable in UI.
 */
export type MultiImageModelId =
  | "kontext-single"
  | "kontext-multi";

export type MultiImageModelOption = {
  id: MultiImageModelId;
  label: string;
  description: string;
  /** Min primary+reference images required */
  minInputs: number;
  /** Max primary+reference images accepted by this model path today */
  maxInputs: number;
  /** Max outputs this model path can produce today (honest cap) */
  maxOutputsSupported: number;
  /** Whether this path is wired to generateMedia today */
  available: boolean;
};

export type MultiImageJobConfig = {
  /** Local previews / data URLs or https URLs — index 0 is primary */
  imageSources: string[];
  inputCount: number;
  outputCount: MultiImageOutputCount;
  modelId: MultiImageModelId;
  quality: ImageQuality;
  aspectRatio: AspectRatio;
  prompt: string;
};

/** Payload shape for the existing generateMedia server fn (subset). */
export type MultiImageGeneratePayload = {
  prompt: string;
  type: "image";
  imageUrl: string;
  sourceKind: "image";
  referenceImageUrls?: string[];
  imageQuality: ImageQuality;
  /** Requested outputs — backend may only honor 1 until multi-output is enabled */
  requestedOutputCount: MultiImageOutputCount;
};

export type MultiImageEligibility = {
  allowed: boolean;
  maxImages: number;
  reason?: string;
};
