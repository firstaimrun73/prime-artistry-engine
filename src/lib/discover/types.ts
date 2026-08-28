/**
 * Discover / inspiration catalog types.
 * Curated content only — not live user analytics.
 */

export type DiscoverTool =
  | "image"
  | "circle"
  | "auto-edit"
  | "video"
  | "music";

export type DiscoverCategory =
  | "featured"
  | "photos"
  | "edits"
  | "video"
  | "portrait"
  | "product"
  | "social"
  | "cinematic"
  | "circle"
  | "auto-edit"
  | "seasonal";

export type InputRequirement =
  | "text-only"
  | "image-required"
  | "image-optional"
  | "video-required"
  | "music-optional";

export type DiscoverItem = {
  /** Stable slug for /discover/$slug and sharing */
  id: string;
  title: string;
  description: string;
  category: DiscoverCategory;
  /** Primary tool this recipe opens */
  tool: DiscoverTool;
  /** Public preview image (Unsplash / local assets) */
  previewUrl: string;
  /** Optional video preview URL */
  previewVideoUrl?: string;
  /** User-facing reusable prompt only — never system/provider prompts */
  prompt: string;
  inputRequirement: InputRequirement;
  inputCount: number;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4";
  quality?: "standard" | "hd" | "2k" | "4k";
  durationSec?: 5 | 10;
  sound?: boolean;
  /** Estimated credits for UI hint only; server is authoritative */
  estimatedCredits?: number;
  badge: string;
  /** Style / effect label shown in UI */
  styleLabel?: string;
  /** Smart remove path in Image Editor */
  smartRemove?: boolean;
  /** Curation flags — not live trend scores */
  isFeatured?: boolean;
  isStaffPick?: boolean;
  isNew?: boolean;
  /** When false, show as unavailable rather than a fake CTA */
  available: boolean;
};

export type DiscoverSectionId =
  | "featured"
  | "photos"
  | "edits"
  | "video"
  | "portrait"
  | "product"
  | "social"
  | "cinematic"
  | "circle"
  | "auto-edit";

export type DiscoverSection = {
  id: DiscoverSectionId;
  label: string;
  emoji?: string;
  description?: string;
};
