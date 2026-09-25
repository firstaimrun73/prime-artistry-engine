/** Cropmix shared types — Crop + Collage */

export type CropmixMode = "picker" | "crop" | "collage" | "output";

export type AspectPresetId =
  | "free" | "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "4:5" | "3:2" | "2:3" | "custom";

export type CropGeometry = {
  x: number; y: number; w: number; h: number;
  straighten: number; rotate90: number; flipH: boolean; flipV: boolean;
  aspectId: AspectPresetId; customW: number; customH: number;
};

export type CollageTier = "common" | "ai_plus";
export type CollageStyleId =
  | "normal-grid" | "clean-editorial" | "comic-page" | "storyboard" | "film-strip"
  | "magazine" | "polaroid-memory" | "dynamic-diagonal" | "mosaic" | "hero-supporting";

export type CollageStyle = {
  id: CollageStyleId; name: string; tier: CollageTier;
  cellCount: { min: number; max: number }; layoutFn: string;
  defaults: { gutter: number; border: number; cornerRadius: number; background: string };
  capabilities: { gutter?: boolean; border?: boolean; cornerRadius?: boolean; background?: boolean };
  safeZones: boolean; description: string;
};

export type CollageCell = { photoId: string; fit: "fit" | "fill"; offsetX: number; offsetY: number; zoom: number };
export type CollageCustomize = { gutter?: number; border?: number; cornerRadius?: number; background?: string; safeZones?: boolean };
export type CollageCanvasRatio = "original" | "1:1" | "4:5" | "3:4" | "4:3" | "9:16" | "16:9";

export type PhotoSlot = {
  id: string; previewUrl: string; sourceUrl: string; width: number; height: number;
  storagePath?: string; signedUrl?: string;
};

export const CROPMIX_AI_PLUS_CREDITS = 10 as const;
export const CROPMIX_VOLT = "#C6FF3D" as const;
export const CROPMIX_VOLT_END = "#8FE000" as const;
export const CROPMIX_INK = "#0B0B18" as const;
export const CROPMIX_TIMEOUT_MS = 90_000 as const;
