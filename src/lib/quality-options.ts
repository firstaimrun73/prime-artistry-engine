// Client-safe output-quality tiers for the Image and Video editors.
// Quality selects output resolution / upscale factor — NOT user price.

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

/**
 * Pixel dimensions from quality long-side + aspect ratio.
 * IMAX is 1.43:1 (not 21:9).
 */
export function imageQualityDimensions(
  q: ImageQuality,
  aspect: string = "1:1",
): { w: number; h: number } {
  const long = IMAGE_QUALITY_LONG_SIDE[q];
  switch (aspect) {
    case "4:3":
      return { w: long, h: Math.round((long * 3) / 4) };
    case "3:4":
      return { w: Math.round((long * 3) / 4), h: long };
    case "16:9":
      return { w: long, h: Math.round((long * 9) / 16) };
    case "9:16":
      return { w: Math.round((long * 9) / 16), h: long };
    case "imax": {
      // 1.43:1 — long side is width
      return { w: long, h: Math.round(long / 1.43) };
    }
    case "1:1":
    default:
      return { w: long, h: long };
  }
}

export function imageQualityDimensionLabel(q: ImageQuality, aspect = "1:1"): string {
  const { w, h } = imageQualityDimensions(q, aspect);
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
    hint: "Standard Definition · up to 512px",
  },
  {
    id: "hd",
    label: "HD",
    title: "High Definition",
    credits: 0,
    upscaleFactor: 1,
    hint: "High Definition · up to 1024px",
  },
  {
    id: "2k",
    label: "2K",
    title: "2K Resolution",
    credits: 0,
    upscaleFactor: 2,
    hint: "2K · up to 1440px long side",
  },
  {
    id: "4k",
    label: "4K",
    title: "4K Resolution",
    credits: 0,
    upscaleFactor: 4,
    hint: "4K · up to 2160px long side",
  },
  {
    id: "8k",
    label: "8K",
    title: "8K Resolution",
    credits: 0,
    upscaleFactor: 8,
    hint: "8K · up to 4320px long side",
  },
];

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
