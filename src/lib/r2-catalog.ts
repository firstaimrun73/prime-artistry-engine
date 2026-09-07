/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * Do not invent filenames. Do not use Unsplash for these entries.
 * Titles/descriptions describe the actual media content (visual inspection).
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
  assetId?: string | null;
  fileSizeLabel?: string;
  label?: string;
  durationLabel?: string;
  hasAudio?: boolean;
  sortOrder: number;
  active: boolean;
  /** Exact source filename when provided by asset library. */
  filename?: string;
};

const img = (name: string) => `${R2_PUBLIC}/samples/image-studio/${name}`;
const vid = (name: string) => `${R2_PUBLIC}/samples/video/${encodeURIComponent(name)}`;
const cir = (name: string) => `${R2_PUBLIC}/samples/circle-2edit/${name}`;

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

export const R2_IMAGE_SAMPLES: R2Sample[] = /*__IMAGES__*/ [];

/**
 * Homepage video library — 10 discrete assets (including two similar drum files).
 * Instrumental performance clips → homepageCategory: "music".
 */
export const R2_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "vid-drums-gmmf",
    title: "Percussionist Playing Drums",
    description:
      "Close-up of mallets striking large drumheads; hands and hardware in warm low light.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("GmMFQAQNiO-b4sH6l4B5d_output.mp4"),
    filename: "GmMFQAQNiO-b4sH6l4B5d_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "11.58 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 10,
    active: true,
  },
  {
    id: "vid-blue-door",
    title: "Blue Front Door",
    description:
      "Centered residential entrance with blue door, brick steps and walkway.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("OgbL2zVOn7BDYLZ_Bg-ZQ_output.mp4"),
    filename: "OgbL2zVOn7BDYLZ_Bg-ZQ_output.mp4",
    width: 704,
    height: 1280,
    aspectRatio: "9:16",
    format: "MP4",
    fileSizeLabel: "5.67 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 20,
    active: true,
  },
  {
    id: "vid-drums-jkf-1",
    title: "Percussionist Playing Drums",
    description:
      "Close-up drum performance with soft mallets; separate asset from GmMF clip.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("j-kfKDF5tia8aZ-NNSC_t_minimax-h3 (1).mp4"),
    filename: "j-kfKDF5tia8aZ-NNSC_t_minimax-h3 (1).mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "9.90 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 30,
    active: true,
  },
  {
    id: "vid-piano",
    title: "Classical Piano Performance",
    description:
      "Close-up of hands on a full keyboard under warm low-key lighting.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("PUuq6ppSzSH2isSVtMtEz_output.mp4"),
    filename: "PUuq6ppSzSH2isSVtMtEz_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "5.21 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 40,
    active: true,
  },
  {
    id: "vid-drums-jkf",
    title: "Percussionist Playing Drums",
    description:
      "Close-up mallets on large drums; distinct file from the (1) variant.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("j-kfKDF5tia8aZ-NNSC_t_minimax-h3.mp4"),
    filename: "j-kfKDF5tia8aZ-NNSC_t_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "9.90 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 50,
    active: true,
  },
  {
    id: "vid-cello",
    title: "Cellist Playing Cello",
    description:
      "Warm wooden cello body with bow drawn across the strings on a dark backdrop.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("O2feS16zc2aUFEkYaizyX_minimax-h3.mp4"),
    filename: "O2feS16zc2aUFEkYaizyX_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "15.02 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 60,
    active: true,
  },
  {
    id: "vid-cello-close",
    title: "Close-Up Cello Bowing",
    description:
      "Vertical tight frame of cello bridge, f-holes and continuous bowing.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("jRC_AIFXAuaCvSzix_KUx_minimax-h3.mp4"),
    filename: "jRC_AIFXAuaCvSzix_KUx_minimax-h3.mp4",
    width: 768,
    height: 1344,
    aspectRatio: "9:16",
    format: "MP4",
    fileSizeLabel: "13.79 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 70,
    active: true,
  },
  {
    id: "vid-arcade",
    title: "Retro Arcade Maze Game",
    description:
      "Glowing blue maze with yellow player, colored ghosts and score HUD.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("7c8ARBCvewFiK2bIH2oei_minimax-h3.mp4"),
    filename: "7c8ARBCvewFiK2bIH2oei_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "10.79 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 80,
    active: true,
  },
  {
    id: "vid-train",
    title: "Mountain Valley Train Journey",
    description:
      "Passenger train moving through a wide mountain valley under cloudy daylight.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("Vk6vjid5W4TV0Lg26akd0_output.mp4"),
    filename: "Vk6vjid5W4TV0Lg26akd0_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    fileSizeLabel: "6.69 MB",
    durationLabel: "10s",
    hasAudio: true,
    sortOrder: 90,
    active: true,
  },
  {
    id: "vid-olive-suit",
    title: "Woman in Olive Business Suit",
    description:
      "Vertical street walk toward camera in a tailored olive suit and white shirt.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("JWCQ8WCQFF-QlXPuzMRyD_output.mp4"),
    filename: "JWCQ8WCQFF-QlXPuzMRyD_output.mp4",
    width: 800,
    height: 1088,
    aspectRatio: "3:4",
    format: "MP4",
    fileSizeLabel: "3.63 MB",
    durationLabel: "5s",
    hasAudio: true,
    sortOrder: 100,
    active: true,
  },
];

export const HOMEPAGE_WATCH_DEMO = {
  url: vid("VID_20260904_015459.mp4"),
  poster: CIRCLE_REMOVE_GIZA.before,
  title: "Framed vintage family portrait",
} as const;

export function getActiveR2ImageSamples(): R2Sample[] {
  return R2_IMAGE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveR2VideoSamples(): R2Sample[] {
  return R2_VIDEO_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getImagineOnlySamples(): R2Sample[] {
  return getActiveR2ImageSamples().filter(
    (s) => s.studio === "image" && s.feature !== "circle-add" && s.feature !== "circle-remove",
  );
}

export function getMusicVideoSamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter((s) => s.homepageCategory === "music");
}

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    null
  );
}
