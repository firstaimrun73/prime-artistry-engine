/** Registry-driven fal video step builder (kept separate from fal-request image builders). */
import type { FalStep } from "./fal-request";
import type { VideoModelDef, VideoGenMode } from "./video-model-registry";

const FAL_BASE = "https://fal.run/";

export function buildVideoFromRegistry({
  model,
  endpoint: endpointOverride,
  prompt,
  imageUrl,
  videoUrl,
  durationSeconds,
  aspectRatio,
  resolution,
  generateAudio,
  negativePrompt,
  mode,
}: {
  model?: VideoModelDef;
  endpoint?: string;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
  mode?: VideoGenMode;
}): FalStep {
  let endpoint = endpointOverride;
  if (!endpoint && model) {
    if (mode === "video" || videoUrl) endpoint = model.videoEndpoint ?? undefined;
    else if (mode === "image" || imageUrl) endpoint = model.imageEndpoint ?? undefined;
    else endpoint = model.textEndpoint ?? undefined;
    if (!endpoint) {
      endpoint =
        model.videoEndpoint ??
        model.imageEndpoint ??
        model.textEndpoint ??
        undefined;
    }
  }
  if (!endpoint) {
    throw new Error("No fal video endpoint resolved for the selected model.");
  }

  const body: Record<string, unknown> = { prompt };
  if (durationSeconds != null) body.duration = String(durationSeconds);
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (resolution) {
    const r = resolution.toLowerCase();
    if (r === "4k" || r === "2160p") body.resolution = "4k";
    else if (r === "1080p" || r === "hd") body.resolution = "1080p";
    else if (r === "720p" || r === "sd") body.resolution = "720p";
    else body.resolution = resolution;
  }
  if (generateAudio != null) {
    if (model?.audioParam === "audio") {
      body.audio = generateAudio;
    } else {
      body.generate_audio = generateAudio;
      body.audio = generateAudio;
    }
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
