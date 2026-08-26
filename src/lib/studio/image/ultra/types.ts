/**
 * Ultra AI Image Studio — isolated types.
 * studioTier "premium" = Ultra AI (user-facing).
 * Does not share pricing/model semantics with Standard or Premium (pro).
 */

export type UltraQuality = "sd" | "hd" | "2k" | "4k" | "8k" | "8k_max";

export type UltraAspectRatio =
  | "1:1"
  | "4:3"
  | "16:9"
  | "9:16"
  | "3:4"
  | "imax";

export type UltraMode = "text_to_image" | "image_to_image" | "multi_image";

export type UltraImageRequest = {
  prompt: string;
  imageUrl?: string | null;
  referenceImageUrls?: string[] | null;
  imageQuality?: string | null;
  aspectRatio?: string | null;
  /** Explicit IMAX flag from client; only valid with 8k_max. */
  imax?: boolean | null;
};

export type UltraValidationOk = {
  ok: true;
  mode: UltraMode;
  prompt: string;
  imageUrls: string[];
  quality: UltraQuality;
  aspectRatio: UltraAspectRatio;
  referenceCount: number;
};

export type UltraValidationErr = { ok: false; error: string };

export type UltraValidationResult = UltraValidationOk | UltraValidationErr;

export type UltraCreditQuote = {
  credits: number;
  mode: UltraMode;
  quality: UltraQuality;
  referenceCount: number;
  breakdown: string;
};

export type UltraProviderCostEstimate = {
  generationUsd: number;
  referenceUsd: number;
  enhancementUsd: number;
  totalUsd: number;
  breakdown: string;
};

export type UltraFalStep = {
  label: string;
  model: string;
  body: Record<string, unknown>;
};

export type UltraExecuteResult = {
  outputUrl: string;
  mode: UltraMode;
  model: string;
  quality: UltraQuality;
  aspectRatio: UltraAspectRatio;
  referenceCount: number;
  credits: number;
  estimatedProviderCostUsd: number;
  enhancementModel?: string;
  outputWidth?: number;
  outputHeight?: number;
  enhancementProfile?: string;
};
