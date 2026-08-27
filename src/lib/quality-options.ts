// Client-safe output-quality tiers for the Image and Video editors.
//
// Quality selects output resolution / upscale factor — NOT user price.
// Surface credits come from experience quote helpers.
//
// SD/HD = generation path with no Topaz upscale.
// 2K/4K/8K = Topaz upscale after generation (existing pipeline).
//
// Dimension labels match ultraDeliveryDimensions long-side targets
// (src/lib/studio/image/ultra/model.ts) for 1:1 reference display.

export type ImageQuality = "sd" | "hd" | "2k" | "4k" | "8k";
export type VideoResolution = "720p" | "1080p" | "4k";

/** Long-side targets used for UI labels (aligned with Ultra delivery map). */
export const IMAGE_QUALITY_LONG_SIDE: Record<ImageQuality, number> = {
  sd: 512,
  hd: 1024,
  "2k": 1440,
  "4k": 2160,
  "8k": 4320,
};

export function imageQualityDimensionLabel(q: ImageQuality, aspect = "1:1"): string {
  const long = IMAGE_QUALITY_LONG_SIDE[q];
  const ar = aspect === "imax" ? "21:9" : aspect;
  const map: Record<string, [number, number]> = {
    "1:1": [long, long],
    "4:3": [long, Math.round((long * 3) / 4)],
    "3:4": [Math.round((long * 3) / 4), long],
    "16:9": [long, Math.round((long * 9) / 16)],
    "9:16": [Math.round((long * 9) / 16), long],
    "21:9": [long, Math.round((long * 9) / 21)],
  };
  const [w, h] = map[ar] ?? map["1:1"];
  return `${w} × ${h}`;
}

export const IMAGE_QUALITY_OPTIONS: {
  id: ImageQuality;
  label: string;
  /** Short title under the chip (e.g. Standard Definition). */
  title: string;
  /** @deprecated Do not show on quality chips. Kept for legacy callers only. */
  credits: number;
  /** Topaz upscale factor applied after the edit/generation (1 = no upscale). */
  upscaleFactor: number;
  hint: string;
}[] = [
  {
    id: "sd",
    label: "SD",
    title: "Standard Definition",
    credits: 0,
    upscaleFactor: 1,
    hint: `Fast · ${imageQualityDimensionLabel("sd")} (1:1)`,
  },
  {
    id: "hd",
    label: "HD",
    title: "High Definition",
    credits: 0,
    upscaleFactor: 1,
    hint: `Higher detail · ${imageQualityDimensionLabel("hd")} (1:1)`,
  },
  {
    id: "2k",
    label: "2K",
    title: "2K",
    credits: 0,
    upscaleFactor: 2,
    hint: `2K delivery · ${imageQualityDimensionLabel("2k")} (1:1)`,
  },
  {
    id: "4k",
    label: "4K",
    title: "4K",
    credits: 0,
    upscaleFactor: 4,
    hint: `4K delivery · ${imageQualityDimensionLabel("4k")} (1:1)`,
  },
  {
    id: "8k",
    label: "8K",
    title: "8K",
    credits: 0,
    upscaleFactor: 8,
    hint: `8K delivery · ${imageQualityDimensionLabel("8k")} (1:1)`,
  },
];

/**
 * @deprecated Prefer experience quote helpers.
 * Kept so any residual callers do not break; returns 0 (quality is not priced here).
 */
export function imageQualityCost(_q: ImageQuality | undefined): number {
  return 0;
}

export function imageUpscaleFactor(q: ImageQuality | undefined): number {
  return IMAGE_QUALITY_OPTIONS.find((o) => o.id === (q ?? "sd"))?.upscaleFactor ?? 1;
}

export const VIDEO_RESOLUTION_OPTIONS: {
  id: VideoResolution;
  label: string;
  multiplier: number;
  upscale: boolean;
  hint: string;
}[] = [
  { id: "720p", label: "720p", multiplier: 0.8, upscale: false, hint: "Fast, lower cost." },
  { id: "1080p", label: "1080p", multiplier: 1, upscale: false, hint: "Full HD — recommended." },
  { id: "4k", label: "4K", multiplier: 1.6, upscale: true, hint: "Topaz upscale pass for maximum sharpness." },
];

export function videoResolutionMultiplier(r: VideoResolution | undefined): number {
  return VIDEO_RESOLUTION_OPTIONS.find((o) => o.id === (r ?? "1080p"))?.multiplier ?? 1;
}

export function videoResolutionUpscales(r: VideoResolution | undefined): boolean {
  return VIDEO_RESOLUTION_OPTIONS.find((o) => o.id === (r ?? "1080p"))?.upscale ?? false;
}
