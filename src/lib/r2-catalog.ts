/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * Tiers: Standard/Premium for video; Standard/Premium/Ultra AI for image.
 */

import { R2_IMG_VIDEO_SAMPLES } from "./r2-img-video-samples";
export const R2_PUBLIC = "https://assets.motio2edit.com" as const;

export type R2Studio = "image" | "video" | "circle" | "auto-edit";
export type R2Feature =
  | "imagine"
  | "circle-remove"
  | "circle-add"
  | "image-generation"
  | "portrait"
  | "enhancement"
  | "video-generation"
  | "auto-edit";

export type HomepageCategory =
  | "samples"
  | "try-now"
  | "trend"
  | "video"
  | "music"
  | "demo";

export type SampleQualityTier = "Standard" | "Premium" | "Ultra AI";

export type R2Sample = {
  id: string;
  title: string;
  description: string;
  studio: R2Studio;
  feature: R2Feature;
  homepageCategory?: HomepageCategory;
  tryNowRoute?: string;
  url: string;
  beforeUrl?: string;
  afterUrl?: string;
  intermediateUrl?: string;
  width?: number;
  height?: number;
  aspectRatio: string;
  format: string;
  quality?: string;
  qualityTier?: SampleQualityTier;
  assetId?: string | null;
  fileSizeLabel?: string;
  label?: string;
  durationLabel?: string;
  hasAudio?: boolean;
  sortOrder: number;
  active: boolean;
  filename?: string;
};

const img = (name: string) => `${R2_PUBLIC}/samples/image-studio/${name}`;
const cir = (name: string) => `${R2_PUBLIC}/samples/circle-2edit/${name}`;
const media = (folder: string, name: string) =>
  `${R2_PUBLIC}/samples/${folder}/${name.split("/").map(encodeURIComponent).join("/")}`;

export const CIRCLE_REMOVE_GIZA = {
  before: cir("file_0000000091d081f585ff54de9335198f.png"),
  mark: cir("file_00000000ab9082089ae984430379abed.png"),
  after: cir("file_000000004e6481faa6caad771de9c84c.png"),
} as const;

export const CIRCLE_ADD_DEER = {
  before: img("IMG-20260903-WA0007.jpg"),
  after: img("IMG-20260903-WA0006.jpg"),
  assetId: "animal_deer" as const,
  width: 784,
  height: 1168,
  aspectRatio: "2:3",
} as const;

/** Pre-login demo + post-login discovery. Real size 704x1280. */
export const DEMO_VIDEO_SAMPLE: R2Sample = {
  id: "vid-demo-media4",
  title: "Motio2edit Demo Reel",
  description: "Official Motio2edit product demo reel showcasing image video and edit tools.",
  studio: "video",
  feature: "video-generation",
  homepageCategory: "demo",
  url: media("media_4", "Demo_Video.mp4"),
  filename: "Demo_Video.mp4",
  width: 704,
  height: 1280,
  aspectRatio: "9:16",
  format: "MP4",
  qualityTier: "Premium",
  hasAudio: true,
  sortOrder: 1,
  active: true,
};

export const R2_IMAGE_SAMPLES: R2Sample[] = [
  { id: "img-m6-statue-standard", title: "Museum Antelope Statue", description: "White antelope statue stands inside a classical marble museum hall.", studio: "image", feature: "image-generation", homepageCategory: "samples", url: media("media_6", "Statue_Standard.png"), filename: "Statue_Standard.png", width: 1024, height: 1024, aspectRatio: "1:1", format: "PNG", qualityTier: "Standard", sortOrder: 400, active: true },
];

export const R2_VIDEO_SAMPLES: R2Sample[] = [
  { id: "vid-m1-storm-bow", title: "Storm Ship Bridge", description: "Ship bridge faces stormy waves under a lightning filled sky.", studio: "video", feature: "video-generation", homepageCategory: "video", url: media("media_1", "Alone-sail_standard.mp4"), filename: "Alone-sail_standard.mp4", width: 768, height: 768, aspectRatio: "1:1", format: "MP4", qualityTier: "Standard", hasAudio: true, sortOrder: 100, active: true },
];

function dedupeByUrl(samples: R2Sample[]): R2Sample[] {
  const seenUrl = new Set<string>();
  const seenFile = new Set<string>();
  const out: R2Sample[] = [];
  for (const s of samples) {
    if (!s.active) continue;
    if (seenUrl.has(s.url)) continue;
    const fn = (s.filename || s.url.split("/").pop() || "").toLowerCase();
    if (fn && seenFile.has(fn)) continue;
    seenUrl.add(s.url);
    if (fn) seenFile.add(fn);
    out.push(s);
  }
  return out;
}

export function getActiveR2ImageSamples(): R2Sample[] {
  return dedupeByUrl(R2_IMAGE_SAMPLES).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveR2VideoSamples(): R2Sample[] {
  return dedupeByUrl([...R2_VIDEO_SAMPLES, ...R2_IMG_VIDEO_SAMPLES]).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getImagineOnlySamples(): R2Sample[] {
  return getActiveR2ImageSamples().filter(
    (s) => s.studio === "image" || s.studio === "circle",
  );
}

export function getMusicVideoSamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter((s) => s.homepageCategory === "music");
}

/** Authenticated homepage videos — includes Demo_Video. */
export function getVideoOnlySamples(): R2Sample[] {
  const base = getActiveR2VideoSamples().filter((s) => s.homepageCategory !== "music");
  return dedupeByUrl([DEMO_VIDEO_SAMPLE, ...base]).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllDiscoverSamples(): R2Sample[] {
  return dedupeByUrl([DEMO_VIDEO_SAMPLE, ...R2_IMAGE_SAMPLES, ...R2_VIDEO_SAMPLES, ...R2_IMG_VIDEO_SAMPLES]).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    R2_IMG_VIDEO_SAMPLES.find((s) => s.id === id) ??
    (DEMO_VIDEO_SAMPLE.id === id ? DEMO_VIDEO_SAMPLE : null)
  );
}

export function getDemoVideoSample(): R2Sample {
  return DEMO_VIDEO_SAMPLE;
}
