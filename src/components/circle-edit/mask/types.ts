/**
 * Circle2Edit Mask Engine — shared types
 *
 * Mask semantics (authoritative):
 *   BLACK (R=G=B=0, A=255) = unselected
 *   WHITE (R=G=B=255, A=255) = selected
 *
 * Working mask uses alpha channel during painting for soft edges;
 * export binarizes to hard B/W PNG at natural resolution.
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** Drawing tool — circle is a separate filled-ellipse gesture */
export type MaskTool = "brush" | "erase" | "circle";

export type BrushSettings = {
  /** Brush diameter in SCREEN CSS pixels */
  sizePx: number;
  /** 0–100 */
  opacity: number;
  /** 0–100; 100 = hard edge */
  hardness: number;
  /** Soft falloff radius in screen px beyond size */
  featherPx: number;
};

export type MaskEngineProps = {
  open: boolean;
  imageUrl: string | null;
  initialTool?: MaskTool;
  onCancel: () => void;
  /** Called with natural-resolution B/W PNG data URL */
  onApply: (maskDataUrl: string) => void;
  /** Optional: label for apply button */
  applyLabel?: string;
};

export type MaskErrorCode =
  | "EMPTY_MASK"
  | "DIMENSION_MISMATCH"
  | "EXPORT_FAILED"
  | "DECODE_FAILED";

export type MaskError = {
  code: MaskErrorCode;
  message: string;
};
