// Client-safe output-quality tiers for the Image and Video editors.
//
// Shared by the editor UI and the server generate function so the credit
// price shown to the user always matches what the backend charges.

export type ImageQuality = "hd" | "2k" | "4k";
export type VideoResolution = "720p" | "1080p" | "4k";

export const IMAGE_QUALITY_OPTIONS: {
  id: ImageQuality;
  label: string;
  credits: number;
  /** Topaz upscale factor applied after the edit/generation (1 = no upscale). */
  upscaleFactor: number;
  hint: string;
}[] = [
  { id: "hd", label: "HD", credits: 25, upscaleFactor: 1, hint: "Standard resolution — fastest." },
  { id: "2k", label: "2K", credits: 40, upscaleFactor: 2, hint: "Topaz 2× upscale for extra detail." },
  { id: "4k", label: "4K", credits: 60, upscaleFactor: 4, hint: "Topaz 4× upscale — maximum detail." },
];

export function imageQualityCost(q: ImageQuality | undefined): number {
  return IMAGE_QUALITY_OPTIONS.find((o) => o.id === (q ?? "hd"))?.credits ?? 25;
}

export function imageUpscaleFactor(q: ImageQuality | undefined): number {
  return IMAGE_QUALITY_OPTIONS.find((o) => o.id === (q ?? "hd"))?.upscaleFactor ?? 1;
}

export const VIDEO_RESOLUTION_OPTIONS: {
  id: VideoResolution;
  label: string;
  /** Multiplier applied to the duration-based credit cost. */
  multiplier: number;
  /** Whether a Topaz video upscale pass runs after generation. */
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
