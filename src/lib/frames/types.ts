/** Frames Studio — shared types (deterministic composition, not AI generation). */

export type FrameCategory = "classic" | "modern" | "wood" | "luxury" | "photo";

export type FrameDefinition = {
  id: string;
  name: string;
  category: FrameCategory;
  borderColor: string;
  matColor?: string;
  borderWidth: number;
  matWidth: number;
  cornerRadius: number;
  shadow: number;
  accentColor?: string;
  enabled: boolean;
};

export type GlassId =
  | "none"
  | "clear"
  | "soft"
  | "frosted"
  | "matte"
  | "gloss"
  | "museum"
  | "reflective"
  | "tinted";

export type GlassDefinition = {
  id: GlassId;
  name: string;
  opacity: number;
  frost: number;
  reflection: number;
  tint?: string;
  enabled: boolean;
};

export type AspectRatioId =
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "4:3"
  | "3:2"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9"
  | "1.43:1"
  | "custom";

export type AspectRatioDefinition = {
  id: AspectRatioId;
  label: string;
  value: number | null;
};

export type FitMode = "contain" | "cover" | "crop";

export type FinishBackground = "white" | "black" | "soft-gray" | "warm" | "transparent";

export type FramesComposeOptions = {
  frameId: string;
  glassId: GlassId;
  ratioId: AspectRatioId;
  fit: FitMode;
  background: FinishBackground;
  frameThickness: number;
  glassIntensity: number;
  reflection: number;
  shadowIntensity: number;
  padding: number;
  maxEdge?: number;
};

export type FramesQuote = {
  credits: number;
  free: boolean;
  label: string;
};
