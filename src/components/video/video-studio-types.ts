/** Video Studio V1 types — no Standard/Pro/Premium tiers. */

export type VideoMode = "text" | "image" | "video";

/** Base-model durations only (Kling 1.6 standard path). */
export type VideoStudioDuration = 5 | 10;

export type VideoStudioAspect = "16:9" | "9:16" | "1:1";

export type VideoStudioQuality = "720p" | "1080p";

export type VideoStudioSize = "small" | "medium" | "large";

export type VideoStudioResult = {
  outputUrl: string;
  mode: VideoMode;
  prompt: string;
  duration: VideoStudioDuration;
  aspect: VideoStudioAspect;
  quality: VideoStudioQuality;
  size: VideoStudioSize;
  soundRequested: boolean;
  creditsUsed: number;
  sourcePreview?: string | null;
};

export const VIDEO_STUDIO_DURATIONS: VideoStudioDuration[] = [5, 10];

export const VIDEO_STUDIO_ASPECTS: { id: VideoStudioAspect; label: string }[] = [
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "1:1", label: "1:1" },
];

export const VIDEO_STUDIO_QUALITIES: { id: VideoStudioQuality; label: string }[] = [
  { id: "720p", label: "720p" },
  { id: "1080p", label: "1080p" },
];

export const VIDEO_STUDIO_SIZES: { id: VideoStudioSize; label: string; quality: VideoStudioQuality }[] = [
  { id: "small", label: "Small", quality: "720p" },
  { id: "medium", label: "Medium", quality: "1080p" },
  { id: "large", label: "Large", quality: "1080p" },
];

export const VIDEO_GEN_STAGES = [
  { id: "analyse", label: "Analysing prompt" },
  { id: "prepare", label: "Preparing video" },
  { id: "frames", label: "Generating frames" },
  { id: "sound", label: "Audio path" },
  { id: "validate", label: "Validating" },
  { id: "finalize", label: "Finalizing" },
] as const;
