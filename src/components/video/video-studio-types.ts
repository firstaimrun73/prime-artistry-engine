/** Video Studio shared types and prompt suggestions. */

export type VideoMode = "text" | "image" | "video";

export type VideoStudioResult = {
  outputUrl: string;
  mode: VideoMode;
  prompt: string;
  duration: 5 | 10 | 15;
  aspect: "16:9" | "9:16" | "1:1";
  quality: "480p" | "720p" | "1080p";
  size: "small" | "medium" | "large";
  soundRequested: boolean;
  creditsUsed: number;
  sourcePreview?: string | null;
};

export const VIDEO_PROMPT_SUGGESTIONS = [
  "Cinematic drone shot over misty mountains at sunrise",
  "Slow orbit around a neon-lit city street at night",
  "Product hero shot with soft studio lighting and gentle push-in",
  "Documentary handheld walk through a busy market",
  "Abstract fluid motion, vibrant colors, seamless loop",
] as const;
