/**
 * VIDEO STUDIO — tier → model registry
 * Isolated from Image/Music. Uses models already in fal-request TEXT_TO_VIDEO_MODELS.
 *
 * PDF planning: Standard Wan 2.5, Pro Kling 2.5 Turbo, Premium Veo 3.1.
 * Current production uses Kling v1.6 / v2.1 tiers already wired — swap after live verify.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";
import type { VideoModelTier } from "@/lib/video-options";

export type VideoModelSlot = "text_to_video" | "image_to_video" | "video_enhance";

export type VideoModelEntry = {
  modelId: string;
  label: string;
  capability: string;
  falTier: VideoModelTier;
  minimumPlan: "plus" | "pro" | "studio";
};

export const VIDEO_MODEL_REGISTRY: Record<StudioTier, Record<VideoModelSlot, VideoModelEntry>> = {
  standard: {
    text_to_video: {
      modelId: "fal-ai/kling-video/v1.6/standard/text-to-video",
      label: "Kling Standard",
      capability: "Fast text → video",
      falTier: "standard",
      minimumPlan: "plus",
    },
    image_to_video: {
      modelId: "fal-ai/kling-video/v1.6/standard/image-to-video",
      label: "Kling Standard",
      capability: "Image → video",
      falTier: "standard",
      minimumPlan: "plus",
    },
    video_enhance: {
      modelId: "fal-ai/topaz/upscale/video",
      label: "Topaz Enhance",
      capability: "Video enhance / upscale",
      falTier: "standard",
      minimumPlan: "plus",
    },
  },
  pro: {
    text_to_video: {
      modelId: "fal-ai/kling-video/v1.6/pro/text-to-video",
      label: "Kling Pro",
      capability: "Higher motion quality",
      falTier: "pro",
      minimumPlan: "pro",
    },
    image_to_video: {
      modelId: "fal-ai/kling-video/v1.6/pro/image-to-video",
      label: "Kling Pro",
      capability: "Stronger image → video",
      falTier: "pro",
      minimumPlan: "pro",
    },
    video_enhance: {
      modelId: "fal-ai/topaz/upscale/video",
      label: "Topaz Enhance",
      capability: "Pro enhance path",
      falTier: "pro",
      minimumPlan: "pro",
    },
  },
  premium: {
    text_to_video: {
      modelId: "fal-ai/kling-video/v2.1/master/text-to-video",
      label: "Kling Master",
      capability: "Maximum motion quality",
      falTier: "master",
      minimumPlan: "studio",
    },
    image_to_video: {
      modelId: "fal-ai/kling-video/v2.1/master/image-to-video",
      label: "Kling Master",
      capability: "Premium image → video",
      falTier: "master",
      minimumPlan: "studio",
    },
    video_enhance: {
      modelId: "fal-ai/topaz/upscale/video",
      label: "Topaz Enhance",
      capability: "Premium enhance path",
      falTier: "master",
      minimumPlan: "studio",
    },
  },
};

export function resolveVideoModel(tier: StudioTier, slot: VideoModelSlot): VideoModelEntry {
  return VIDEO_MODEL_REGISTRY[tier][slot];
}

export function videoModelPublicLabel(tier: StudioTier, slot: VideoModelSlot): string {
  return VIDEO_MODEL_REGISTRY[tier][slot].label;
}

export function studioTierToFalVideoTier(tier: StudioTier): VideoModelTier {
  return VIDEO_MODEL_REGISTRY[tier].text_to_video.falTier;
}
