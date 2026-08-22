/**
 * Standard Image Studio — shared types (backend only).
 * User-facing UI is unchanged; this module adapts to existing generateMedia inputs.
 */

export type StandardImageMode =
  | "text_to_image"
  | "image_to_image"
  | "multi_image_to_image"
  | "circle_to_remove";

/** SD / HD only where the model genuinely supports a size control (Text→Image). */
export type StandardImageQuality = "sd" | "hd";

export type StandardAspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "3:4";

export type StandardImageRequest = {
  prompt: string;
  /** Primary source image (I2I / multi base / circle original). */
  imageUrl?: string | null;
  /**
   * Extra reference images in UI order.
   * Index 0 = reference #1 … index 4 = reference #5.
   * Order must never be sorted or shuffled.
   */
  referenceImageUrls?: string[];
  /** Mask aligned to ORIGINAL image pixel dimensions (circle erase). */
  maskImageUrl?: string | null;
  aspectRatio?: StandardAspectRatio | null;
  /** Only applied for Text→Image (Schnell). I2I/multi do not invent HD premium. */
  imageQuality?: StandardImageQuality | null;
  strength?: number | null;
  circleInstant?: boolean;
};

export type StandardValidationOk = {
  ok: true;
  mode: StandardImageMode;
  prompt: string;
  imageUrl?: string;
  /** Ordered refs only (1–5). Empty for non-multi. */
  referenceImageUrls: string[];
  maskImageUrl?: string;
  aspectRatio?: StandardAspectRatio;
  imageQuality: StandardImageQuality;
  strength?: number;
};

export type StandardValidationErr = {
  ok: false;
  error: string;
};

export type StandardValidationResult = StandardValidationOk | StandardValidationErr;

export type StandardCreditQuote = {
  credits: number;
  mode: StandardImageMode;
  breakdown: string;
};

export type StandardFalStep = {
  label: string;
  model: string;
  body: Record<string, unknown>;
};

export type StandardExecuteInput = StandardValidationOk & {
  falKey: string;
  runStep: (step: StandardFalStep) => Promise<string>;
};

export type StandardExecuteResult = {
  outputUrl: string;
  mode: StandardImageMode;
  model: string;
  credits: number;
};
