/**
 * Imagine gallery samples — public R2 assets only (no Unsplash).
 * No generation prompts exposed in UI.
 */
import {
  getActiveR2ImageSamples,
  type R2Sample,
} from "@/lib/r2-catalog";

export type ImagineSample = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  r2Key?: string;
  aspectRatio: string;
  quality: string;
  generationMode: string;
  buildDuration?: string;
  width?: number;
  height?: number;
  format?: string;
  studio?: string;
  feature?: string;
  sortOrder: number;
  active: boolean;
};

function fromR2(s: R2Sample): ImagineSample {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    imageUrl: s.url,
    aspectRatio: s.aspectRatio,
    quality: s.quality ?? "High",
    generationMode: s.label ?? "Image Studio",
    width: s.width,
    height: s.height,
    format: s.format,
    studio: s.studio,
    feature: s.feature,
    sortOrder: s.sortOrder,
    active: s.active,
  };
}

export function getActiveImagineSamples(): ImagineSample[] {
  return getActiveR2ImageSamples()
    .filter((s) => s.studio === "image" || s.feature === "imagine" || s.feature === "image-generation" || s.feature === "portrait")
    .map(fromR2)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveImagineMediaUrl(sample: ImagineSample): string {
  return sample.imageUrl;
}

export function getImagineSampleById(id: string): ImagineSample | null {
  return getActiveImagineSamples().find((s) => s.id === id) ?? null;
}
