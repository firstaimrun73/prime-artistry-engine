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
  "Cinematic city street at night, neon reflections on wet asphalt",
  "Slow-motion ocean waves at sunset, golden light",
  "Cinematic product reveal on a minimal studio table",
  "Aerial mountain landscape at sunrise, soft fog in valleys",
  "Futuristic city walk, handheld, soft rain and reflections",
] as const;
