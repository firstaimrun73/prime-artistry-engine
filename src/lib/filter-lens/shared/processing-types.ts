/**
 * shared/processing-types.ts
 * Core types for filter/lens programmatic image processing.
 */

export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ToneCurvePoint {
  input: number;
  output: number;
}

export interface ChannelAdjustment {
  gain?: number;
  gamma?: number;
  offset?: number;
}

export interface SplitToningSettings {
  shadowsHue: number;
  shadowsSaturation: number;
  highlightsHue: number;
  highlightsSaturation: number;
  balance: number;
}

export interface ProcessingParameters {
  exposure?: number;
  brightness?: number;
  contrast?: number;
  highlights?: number;
  shadows?: number;
  temperature?: number;
  tint?: number;
  saturation?: number;
  vibrance?: number;
  gamma?: number;
  monochrome?: boolean;
  sepia?: number;
  fade?: number;
  grain?: number;
  vignette?: number;
  vignetteFeather?: number;
  splitToning?: SplitToningSettings;
  sharpening?: number;
  blur?: number;
  bloom?: number;
  clarity?: number;
  toneCurve?: ToneCurvePoint[];
  channelAdjustments?: {
    red?: ChannelAdjustment;
    green?: ChannelAdjustment;
    blue?: ChannelAdjustment;
  };
  denoise?: number;
  microcontrast?: number;
  dynamicRange?: number;
  starSeparation?: number;
  atmosphere?: number;
  /** Posterize to N levels per channel (2–16). Strong graphic look. */
  posterizeLevels?: number;
  /** Edge/sketch mix 0–100. */
  edgeAmount?: number;
  /** Pixel block size in px (2–24). */
  pixelSize?: number;
  /** Soft blur for dreamy/oil base 0–100. */
  softBlur?: number;
  /** Duotone: map luminance to two RGB colors. */
  duotone?: { shadow: [number, number, number]; highlight: [number, number, number] };
  /** Stylization preset applied after grading. */
  style?: 'none' | 'sketch' | 'comic' | 'oil' | 'watercolor' | 'neon';
}

export type ProcessingProfile = ProcessingParameters;

export interface ProcessOptions {
  intensity: number;
  mode?: 'preview' | 'full';
  previewMaxDimension?: number;
  seed?: number;
  chunkRows?: number;
  isCancelled?: () => boolean;
}

export interface ProcessResult {
  image: RGBAImage;
  cancelled: boolean;
  isPreview: boolean;
}
