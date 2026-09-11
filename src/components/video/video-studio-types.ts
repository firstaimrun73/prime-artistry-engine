/** Video Studio UI + backend-ready contracts. Capability registry is authoritative. */

export type VideoMode = "text" | "image" | "video";
export type VideoStudioDuration = 5 | 10 | 15;
export type VideoStudioAspect = "16:9" | "9:16" | "1:1";
export type VideoStudioQuality = "480p" | "720p" | "1080p";
export type VideoStudioSize = "small" | "medium" | "large";
export type VideoStudioTier = "standard" | "premium";

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

export const VIDEO_PROMPT_SUGGESTIONS = [
  "Cinematic product reveal",
  "Portrait walking through neon city",
  "Slow-motion fashion sequence",
  "Aerial landscape reveal",
  "Luxury commercial",
  "Dynamic sports moment",
  "Anime-inspired action scene",
  "Cinematic travel sequence",
  "Futuristic city flythrough",
  "Minimal product advertisement",
] as const;
