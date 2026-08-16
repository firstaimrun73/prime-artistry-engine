import type { AspectRatio } from "@/lib/prompt-suggestions";
import type { ImageQuality, VideoResolution } from "@/lib/quality-options";
import type { VideoDuration, VideoAspectRatio } from "@/lib/video-options";

export type GenState = "idle" | "analyzing" | "loading" | "success" | "blocked";

/** One uploaded image slot in the multi-image strip. */
export type GalleryItem = {
  id: string;
  preview: string;
  dataUrl: string | null;
  file: File | null;
};

export type QuickStyle = { emoji: string; label: string; prompt: string };

// Re-exported so consumers of editor types don't need to reach into
// unrelated lib files just to type editor state.
export type { AspectRatio, ImageQuality, VideoResolution, VideoDuration, VideoAspectRatio };