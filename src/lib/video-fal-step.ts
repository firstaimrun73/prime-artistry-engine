/** Registry-driven fal video step builder (kept separate from fal-request image builders). */
import type { FalStep } from "./fal-request";

const FAL_BASE = "https://fal.run/";

export function buildVideoFromRegistry({
  endpoint,
  prompt,
  imageUrl,
  videoUrl,
  durationSeconds,
  aspectRatio,
  resolution,
  generateAudio,
  negativePrompt,
}: {
  endpoint: string;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
}): FalStep {
  const body: Record<string, unknown> = { prompt };
  if (durationSeconds != null) body.duration = String(durationSeconds);
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (resolution) body.resolution = resolution;
  if (generateAudio != null) {
    body.generate_audio = generateAudio;
    body.audio = generateAudio;
  }
  if (negativePrompt) body.negative_prompt = negativePrompt;
  if (imageUrl) {
    body.image_url = imageUrl;
    body.start_image_url = imageUrl;
  }
  if (videoUrl) body.video_url = videoUrl;
  return {
    label: `video (${endpoint})`,
    model: endpoint,
    endpoint: `${FAL_BASE}${endpoint}`,
    outputKind: "video",
    body,
  };
}
