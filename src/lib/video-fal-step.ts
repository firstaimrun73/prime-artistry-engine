/** Registry-driven fal video step builder (kept separate from fal-request image builders). */
import type { FalStep } from "./fal-request";
import type { VideoModelDef, VideoGenMode } from "./video-model-registry";

const FAL_BASE = "https://fal.run/";

type RouteLike = {
  model?: VideoModelDef;
  endpoint?: string;
  productMode?: string;
};

/**
 * Build a fal video step from the capability registry route (or legacy model/endpoint).
 * Accepts both generate.functions naming (durationSec, aspect, audio, route)
 * and legacy naming (durationSeconds, aspectRatio, generateAudio, model).
 */
export function buildVideoFromRegistry({
  model,
  endpoint: endpointOverride,
  route,
  prompt,
  imageUrl,
  videoUrl,
  durationSeconds,
  durationSec,
  aspectRatio,
  aspect,
  resolution,
  generateAudio,
  audio,
  negativePrompt,
  mode,
}: {
  model?: VideoModelDef;
  endpoint?: string;
  /** Preferred: full route from selectApprovedVideoRoute */
  route?: RouteLike;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  /** Alias used by generate.functions */
  durationSec?: number;
  aspectRatio?: string;
  /** Alias used by generate.functions */
  aspect?: string;
  resolution?: string;
  generateAudio?: boolean;
  /** Alias used by generate.functions */
  audio?: boolean;
  negativePrompt?: string;
  mode?: VideoGenMode;
}): FalStep {
  const resolvedModel = model ?? route?.model;
  let endpoint = endpointOverride ?? route?.endpoint;
  if (!endpoint && resolvedModel) {
    if (mode === "video" || videoUrl) endpoint = resolvedModel.videoEndpoint ?? undefined;
    else if (mode === "image" || imageUrl) endpoint = resolvedModel.imageEndpoint ?? undefined;
    else endpoint = resolvedModel.textEndpoint ?? undefined;
    if (!endpoint) {
      endpoint =
        resolvedModel.videoEndpoint ??
        resolvedModel.imageEndpoint ??
        resolvedModel.textEndpoint ??
        undefined;
    }
  }
  if (!endpoint) {
    throw new Error("No fal video endpoint resolved for the selected model.");
  }

  const durationSecondsResolved = durationSeconds ?? durationSec;
  const aspectRatioResolved = aspectRatio ?? aspect;
  const generateAudioResolved = generateAudio ?? audio;

  const body: Record<string, unknown> = { prompt };
  if (durationSecondsResolved != null) body.duration = String(durationSecondsResolved);
  if (aspectRatioResolved) body.aspect_ratio = aspectRatioResolved;
  if (resolution) {
    const r = resolution.toLowerCase();
    if (r === "4k" || r === "2160p") body.resolution = "4k";
    else if (r === "1080p" || r === "fhd") body.resolution = "1080p";
    else if (r === "720p" || r === "hd") body.resolution = "720p";
    else if (r === "480p" || r === "sd") body.resolution = "480p";
    else body.resolution = resolution;
  }
  if (generateAudioResolved != null) {
    if (resolvedModel?.audioParam === "audio") {
      body.audio = generateAudioResolved;
    } else {
      body.generate_audio = generateAudioResolved;
      body.audio = generateAudioResolved;
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
