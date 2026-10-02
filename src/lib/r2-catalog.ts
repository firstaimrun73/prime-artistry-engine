/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * Includes media_6 uploads with Standard | Premium | Ultra AI labels.
 */

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
  | "music";

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
const vid = (name: string) => `${R2_PUBLIC}/samples/video/${encodeURIComponent(name)}`;
const cir = (name: string) => `${R2_PUBLIC}/samples/circle-2edit/${name}`;
const media6 = (name: string) =>
  `${R2_PUBLIC}/samples/media_6/${name.split("/").map(encodeURIComponent).join("/")}`;

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

/** Image samples — includes media_6 stills with quality labels. */
export const R2_IMAGE_SAMPLES: R2Sample[] = [
  {
    id: "img-m6-statue-standard",
    title: "Classical Statue",
    description: "Stone statue study in soft light.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media6("Statue_Standard.png"),
    filename: "Statue_Standard.png",
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "1.58 MB",
    label: "Image Studio",
    sortOrder: 400,
    active: true,
  },
  {
    id: "img-m6-violin-standard",
    title: "Violin Study",
    description: "Close instrumental detail of a violin.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media6("violin-standard.png"),
    filename: "violin-standard.png",
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "1.28 MB",
    label: "Image Studio",
    sortOrder: 410,
    active: true,
  },
  {
    id: "img-m6-music-banner",
    title: "Music Studio Banner",
    description: "Brand visual for Music Studio.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media6("Music_banner.png"),
    filename: "Music_banner.png",
    aspectRatio: "16:9",
    format: "PNG",
    qualityTier: "Premium",
    fileSizeLabel: "1.44 MB",
    label: "Music Studio",
    sortOrder: 420,
    active: true,
  },
  {
    id: "img-m6-yau",
    title: "Portrait Light Study",
    description: "Ultra AI portrait sample from media library.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: media6("yAuGCFx7G649vQi4FxOAs_epd6mEUT.png"),
    filename: "yAuGCFx7G649vQi4FxOAs_epd6mEUT.png",
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Ultra AI",
    fileSizeLabel: "2.42 MB",
    label: "Image Studio",
    sortOrder: 430,
    active: true,
  },
  {
    id: "img-m6-xcgr",
    title: "Editorial Frame",
    description: "Premium still from media library.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media6("xcGrPOM57xd6IeqIQROM4_eAGWfFZE.png"),
    filename: "xcGrPOM57xd6IeqIQROM4_eAGWfFZE.png",
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Premium",
    fileSizeLabel: "1.78 MB",
    label: "Image Studio",
    sortOrder: 440,
    active: true,
  },
  {
    id: "img-m6-vng",
    title: "Scene Still",
    description: "Standard quality still sample.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media6("vNgKSYwBt4mkvdcm-uDDz_9VpVdeTt.png"),
    filename: "vNgKSYwBt4mkvdcm-uDDz_9VpVdeTt.png",
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "1.59 MB",
    label: "Image Studio",
    sortOrder: 450,
    active: true,
  },
];

/** Video samples — media_6 uploads with Standard | Premium | Ultra AI. */
export const R2_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "vid-m6-tron-racing",
    title: "Tron Racing",
    description: "Neon light-cycle race through a digital grid.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("tron-racing_premium.mp4"),
    filename: "tron-racing_premium.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "19.86 MB",
    hasAudio: true,
    sortOrder: 200,
    active: true,
  },
  {
    id: "vid-m6-ocean-explore",
    title: "Ocean Explore",
    description: "Underwater exploration through coral and open sea.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("ocean-explore_premium.mp4"),
    filename: "ocean-explore_premium.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "17.19 MB",
    hasAudio: true,
    sortOrder: 210,
    active: true,
  },
  {
    id: "vid-m6-truck-journey",
    title: "Truck Journey",
    description: "Long-haul truck on an open highway.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("Truck-journey_standard.mp4"),
    filename: "Truck-journey_standard.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "39.52 MB",
    hasAudio: true,
    sortOrder: 220,
    active: true,
  },
  {
    id: "vid-m6-mom-son-story",
    title: "Mom Love to Son Story",
    description: "Warm mother-and-son story moment.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("Mom-love-to-son-story_standard.mp4"),
    filename: "Mom-love-to-son-story_standard.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "34.4 MB",
    hasAudio: true,
    sortOrder: 230,
    active: true,
  },
  {
    id: "vid-m6-romeo-juliet",
    title: "Romeo & Juliet Love Story",
    description: "Classic romantic retelling in motion.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("RomeoJulietlovestory_Standard.mp4"),
    filename: "RomeoJulietlovestory_Standard.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "8.35 MB",
    hasAudio: true,
    sortOrder: 240,
    active: true,
  },
  {
    id: "vid-m6-water-scarcity",
    title: "World After Water Scarcity",
    description: "Cinematic man in a drought-scarred future.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("world-after-scarcity-of-water-Man_Standard.mp4"),
    filename: "world-after-scarcity-of-water-Man_Standard.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "8.71 MB",
    hasAudio: true,
    sortOrder: 250,
    active: true,
  },
  {
    id: "vid-m6-minimax-q8j",
    title: "Cinematic Motion Clip",
    description: "High-detail MiniMax H3 sample generation.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("q8jY1kF2MpltmH8xxCpE6_minimax-h3.mp4"),
    filename: "q8jY1kF2MpltmH8xxCpE6_minimax-h3.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Ultra AI",
    fileSizeLabel: "20.18 MB",
    hasAudio: true,
    sortOrder: 260,
    active: true,
  },
  {
    id: "vid-m6-minimax-qct",
    title: "Narrative Motion Clip",
    description: "MiniMax H3 story-style sample.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("qCTb0eUmdxhN2ildI9qk5_minimax-h3.mp4"),
    filename: "qCTb0eUmdxhN2ildI9qk5_minimax-h3.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Ultra AI",
    fileSizeLabel: "13.55 MB",
    hasAudio: true,
    sortOrder: 270,
    active: true,
  },
  {
    id: "vid-m6-minimax-xfuy",
    title: "Dynamic Scene Clip",
    description: "MiniMax H3 dynamic scene sample.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("xfUyYfQS2cVkMAgkS2aNA_minimax-h3.mp4"),
    filename: "xfUyYfQS2cVkMAgkS2aNA_minimax-h3.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "22.71 MB",
    hasAudio: true,
    sortOrder: 280,
    active: true,
  },
  {
    id: "vid-m6-output-umw",
    title: "Generated Output Sample",
    description: "Motio2edit video studio output sample.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media6("uMW_jLw1Z3e_aeNPO9J3g_output.mp4"),
    filename: "uMW_jLw1Z3e_aeNPO9J3g_output.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "11.12 MB",
    hasAudio: true,
    sortOrder: 290,
    active: true,
  },
  {
    id: "vid-m6-music-banner-clip",
    title: "Instrumental Stage Performance",
    description: "Music Studio–style performance sample for the homepage music row.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: media6("Sr58OYuksiNmGUAfA8fwz_minimax-h3.mp4"),
    filename: "Sr58OYuksiNmGUAfA8fwz_minimax-h3.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "19.07 MB",
    hasAudio: true,
    sortOrder: 300,
    active: true,
  },
  {
    id: "vid-m6-music-cello-style",
    title: "Expressive Performance",
    description: "Performance clip for Music Studio homepage samples.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: media6("mu_cw6FFSrZ0lP_JYvyoE_minimax-h3.mp4"),
    filename: "mu_cw6FFSrZ0lP_JYvyoE_minimax-h3.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "19.59 MB",
    hasAudio: true,
    sortOrder: 310,
    active: true,
  },
];

export const HOMEPAGE_WATCH_DEMO = {
  url: media6("tron-racing_premium.mp4"),
  poster: media6("Music_banner.png"),
  title: "Tron Racing",
} as const;

export function getActiveR2ImageSamples(): R2Sample[] {
  return R2_IMAGE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveR2VideoSamples(): R2Sample[] {
  return R2_VIDEO_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getImagineOnlySamples(): R2Sample[] {
  return getActiveR2ImageSamples().filter(
    (s) => s.studio === "image" || s.studio === "circle",
  );
}

export function getMusicVideoSamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter((s) => s.homepageCategory === "music");
}

export function getVideoOnlySamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter((s) => s.homepageCategory !== "music");
}

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    null
  );
}
