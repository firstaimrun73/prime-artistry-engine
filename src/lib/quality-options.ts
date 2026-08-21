// Client-safe output-quality tiers for the Image and Video editors.
//
// Quality selects output resolution / upscale factor — NOT user price.
// Surface credits come from image-experience-credits.ts (experience + mode).
//
// SD/HD = generation path with no Topaz upscale.
// 2K/4K/8K = Topaz upscale after generation (existing pipeline).

export type ImageQuality = "sd" | "hd" | "2k" | "4k" | "8k";
export type VideoResolution = "720p" | "1080p" | "4k";

export const IMAGE_QUALITY_OPTIONS: {
  id: ImageQuality;
  label: string;
  /** @deprecated Do not show on quality chips. Kept for legacy callers only. */
  credits: number;
  /** Topaz upscale factor applied after the edit/generation (1 = no upscale). */
  upscaleFactor: number;
  hint: string;
}[] = [
  {
    id: "sd",
    label: "SD",
    credits: 0,
    upscaleFactor: 1,
    hint: "Standard definition — fast, no upscale.",
  },
  {
    id: "hd",
    label: "HD",
    credits: 0,
    upscaleFactor: 1,
    hint: "Full HD — sharp, no upscale.",
  },
  {
    id: "2k",
    label: "2K",
    credits: 0,
    upscaleFactor: 2,
    hint: "2K detail via upscale pipeline.",
  },
  {
    id: "4k",
    label: "4K",
    credits: 0,
    upscaleFactor: 4,
    hint: "4K detail via upscale pipeline.",
  },
  {
    id: "8k",
    label: "8K",
    credits: 0,
    upscaleFactor: 8,
    hint: "8K via upscale pipeline (Ultra AI · Studio plans).",
  },
];

/**
 * @deprecated Prefer computeImageExperienceCredits / estimateImageStudioCredits.
 * Kept so any residual callers do not break; returns 0 (quality is not priced).
 */
export function imageQualityCost(_q: ImageQuality | undefined): number {
  return 0;
}

export function imageUpscaleFactor(q: ImageQuality | undefined): number {
  return IMAGE_QUALITY_OPTIONS.find((o) => o.id === (q ?? "hd"))?.upscaleFactor ?? 1;
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
