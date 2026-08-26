// types.ts — shared types for the Circle2Edit crop engine

export type Size = { width: number; height: number };

export type Point = { x: number; y: number };

/** Axis-aligned rect in pixel space (natural or rotated). */
export type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 0 = 0°, 1 = 90° CW, 2 = 180°, 3 = 270° CW */
export type Rotation90 = 0 | 1 | 2 | 3;

export type CropAspectRatio =
  | "free"
  | "original"
  | "1:1"
  | "4:5"
  | "5:4"
  | "3:4"
  | "4:3"
  | "16:9"
  | "9:16"
  | "2:3"
  | "3:2";

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export interface CropState {
  /** Crop rect always in ROTATED space (relative to rotated natural bounds). */
  crop: PixelRect;
  rotation: Rotation90;
  zoom: number;
  /** Translation of the image in workspace CSS px. */
  translation: Point;
  aspectRatio: CropAspectRatio;
  showGrid: boolean;
}

export interface CropResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  objectUrl: string;
  format: OutputFormat;
}

export interface CropExportOptions {
  format?: OutputFormat;
  /** 0–1, only applied for lossy formats (jpeg/webp). */
  quality?: number;
  fileName?: string;
}

export type CropErrorCode =
  | "DECODE_FAILED"
  | "UNSUPPORTED_FORMAT"
  | "ZERO_SIZED_CROP"
  | "INVALID_CROP"
  | "CANVAS_TOO_LARGE"
  | "MEMORY_FAILURE"
  | "EXPORT_FAILED";

export interface CropError {
  code: CropErrorCode;
  message: string;
  cause?: unknown;
}

export interface CropEngineProps {
  /** File, Blob, or URL/data-URL string. */
  source: File | Blob | string;
  initialAspectRatio?: CropAspectRatio;
  /** Display-only credit balance; never deducted here. */
  creditBalance?: number;
  onApply: (result: CropResult) => void;
  onCancel: () => void;
  onError?: (error: CropError) => void;
  /** Fires once after successful decode with natural (post-EXIF) size. */
  onImageReady?: (size: Size) => void;
}
