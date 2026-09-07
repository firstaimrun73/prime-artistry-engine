/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * TRY NOW = actionable tools (Circle). TREND reserved — not on random generations.
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

export const R2_IMAGE_SAMPLES: R2Sample[] = [
  {
    id: "img-portrait-bw",
    title: "Portrait study",
    description: "Black-and-white portrait with soft bokeh.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: img("3F_Tc0vT1g0V5JYhA3RAp.png"),
    width: 1600,
    height: 1200,
    aspectRatio: "4:3",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "1.52 MB",
    label: "Image Studio",
    sortOrder: 1,
    active: true,
  },
  {
    id: "img-christ-redeemer",
    title: "Christ the Redeemer",
    description: "Dramatic sunset over Rio — image generation.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_0000000000cc81fa86915dca20ae5d72.png"),
    width: 1499,
    height: 1049,
    aspectRatio: "3:2",
    format: "PNG",
    qualityTier: "Premium",
    fileSizeLabel: "2.22 MB",
    label: "Generated",
    sortOrder: 2,
    active: true,
  },
  {
    id: "img-butterfly",
    title: "Butterfly on zinnia",
    description: "Macro wildlife detail with natural bokeh.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_0000000012708211a41f45bc2940893a.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "2.21 MB",
    label: "Image Studio",
    sortOrder: 3,
    active: true,
  },
  {
    id: "img-peacock-final",
    title: "Peacock cityscape",
    description: "Full-colour peacock on a wet city street at sunset.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_00000000234c82088edca4a78fe13fe9.png"),
    width: 1254,
    height: 1254,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Ultra AI",
    fileSizeLabel: "3.41 MB",
    label: "Image Studio",
    sortOrder: 4,
    active: true,
  },
  {
    id: "img-horses-barn",
    title: "Barn horses",
    description: "Golden-hour stable scene with natural light.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_0000000039b482069b96b2d43e05a3be.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "3.08 MB",
    label: "Image Studio",
    sortOrder: 5,
    active: true,
  },
  {
    id: "img-portrait-soft",
    title: "Soft portrait",
    description: "Vertical portrait study with gentle lighting.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: img("BKM9xW1knxqG07FllyyPF.png"),
    width: 704,
    height: 944,
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "1.1 MB",
    label: "Image Studio",
    sortOrder: 6,
    active: true,
  },
  {
    id: "img-fashion-tall",
    title: "Editorial fashion",
    description: "Tall fashion frame for stories and lookbooks.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("M4wsUG3TjuqM_K50IXT4S_8VLXCl8F.png"),
    width: 576,
    height: 1024,
    aspectRatio: "9:16",
    format: "PNG",
    qualityTier: "Premium",
    fileSizeLabel: "966.8 kB",
    label: "Image Studio",
    sortOrder: 7,
    active: true,
  },
  {
    id: "img-square-detail",
    title: "Square detail study",
    description: "Balanced square composition for feed cards.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_00000000234c82088edca4a78fe13fe9.png"),
    width: 1254,
    height: 1254,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "3.41 MB",
    label: "Image Studio",
    sortOrder: 8,
    active: true,
  },
  {
    id: "img-landscape-a",
    title: "Golden landscape",
    description: "Warm landscape with layered depth.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_00000000483c8206bf252418131277ae.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "2.65 MB",
    label: "Image Studio",
    sortOrder: 9,
    active: true,
  },
  {
    id: "img-landscape-b",
    title: "Coastal light",
    description: "Seaside atmosphere with soft horizon light.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("file_00000000483c8206bf252418131277ae.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "4:3",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "2.46 MB",
    label: "Image Studio",
    sortOrder: 10,
    active: true,
  },
  {
    id: "img-wide-cinematic",
    title: "Cinematic wide",
    description: "Widescreen still for hero frames and thumbnails.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("JNAxa2b4OCiSvBFg3sNO0_dAODEa8l.png"),
    width: 1024,
    height: 576,
    aspectRatio: "16:9",
    format: "PNG",
    qualityTier: "Premium",
    fileSizeLabel: "1.03 MB",
    label: "Image Studio",
    sortOrder: 11,
    active: true,
  },
  {
    id: "img-vertical-story",
    title: "Vertical story frame",
    description: "Tall composition for stories and reels stills.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: img("M4wsUG3TjuqM_K50IXT4S_8VLXCl8F.png"),
    width: 576,
    height: 1024,
    aspectRatio: "9:16",
    format: "PNG",
    qualityTier: "Standard",
    fileSizeLabel: "966.8 kB",
    label: "Image Studio",
    sortOrder: 12,
    active: true,
  },
  {
    id: "img-deer-add",
    title: "Add a deer",
    description: "Circle 2edit Add — forest clearing, deer matched to light.",
    studio: "circle",
    feature: "circle-add",
    homepageCategory: "try-now",
    tryNowRoute: "/studio/image/circle-remove",
    url: CIRCLE_ADD_DEER.after,
    beforeUrl: CIRCLE_ADD_DEER.before,
    afterUrl: CIRCLE_ADD_DEER.after,
    width: 784,
    height: 1168,
    aspectRatio: "2:3",
    format: "JPEG",
    qualityTier: "Premium",
    assetId: "animal_deer",
    label: "Circle to Add",
    sortOrder: 100,
    active: true,
  },
  {
    id: "img-giza-remove",
    title: "Remove crowd at Giza",
    description: "Circle 2edit Remove — tourists cleared from the pyramid scene.",
    studio: "circle",
    feature: "circle-remove",
    homepageCategory: "try-now",
    tryNowRoute: "/studio/image/circle-remove",
    url: CIRCLE_REMOVE_GIZA.after,
    beforeUrl: CIRCLE_REMOVE_GIZA.before,
    intermediateUrl: CIRCLE_REMOVE_GIZA.mark,
    afterUrl: CIRCLE_REMOVE_GIZA.after,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    label: "Circle to Remove",
    sortOrder: 101,
    active: true,
  },
];

export const R2_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "vid-drums-gmmf",
    title: "Percussionist Playing Drums",
    description: "Close-up mallets on large drumheads.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("GmMFQAQNiO-b4sH6l4B5d_output.mp4"),
    filename: "GmMFQAQNiO-b4sH6l4B5d_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "11.58 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 10,
    active: true,
  },
  {
    id: "vid-blue-door",
    title: "Blue Front Door",
    description: "Centered residential blue door and brick steps.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("OgbL2zVOn7BDYLZ_Bg-ZQ_output.mp4"),
    filename: "OgbL2zVOn7BDYLZ_Bg-ZQ_output.mp4",
    width: 704,
    height: 1280,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "5.67 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 20,
    active: true,
  },
  {
    id: "vid-drums-jkf-1",
    title: "Percussionist Playing Drums",
    description: "Close-up drum performance — separate asset.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("j-kfKDF5tia8aZ-NNSC_t_minimax-h3 (1).mp4"),
    filename: "j-kfKDF5tia8aZ-NNSC_t_minimax-h3 (1).mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "9.90 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 30,
    active: true,
  },
  {
    id: "vid-piano",
    title: "Classical Piano Performance",
    description: "Hands on a full keyboard, warm low light.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("PUuq6ppSzSH2isSVtMtEz_output.mp4"),
    filename: "PUuq6ppSzSH2isSVtMtEz_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "5.21 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 40,
    active: true,
  },
  {
    id: "vid-drums-jkf",
    title: "Percussionist Playing Drums",
    description: "Distinct drum clip from the (1) variant.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("j-kfKDF5tia8aZ-NNSC_t_minimax-h3.mp4"),
    filename: "j-kfKDF5tia8aZ-NNSC_t_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "9.90 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 50,
    active: true,
  },
  {
    id: "vid-cello",
    title: "Cellist Playing Cello",
    description: "Warm cello body and bow on a dark backdrop.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("O2feS16zc2aUFEkYaizyX_minimax-h3.mp4"),
    filename: "O2feS16zc2aUFEkYaizyX_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "15.02 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 60,
    active: true,
  },
  {
    id: "vid-cello-close",
    title: "Close-Up Cello Bowing",
    description: "Vertical tight frame of bridge, f-holes and bowing.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "music",
    url: vid("jRC_AIFXAuaCvSzix_KUx_minimax-h3.mp4"),
    filename: "jRC_AIFXAuaCvSzix_KUx_minimax-h3.mp4",
    width: 768,
    height: 1344,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "13.79 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 70,
    active: true,
  },
  {
    id: "vid-arcade",
    title: "Retro Arcade Maze Game",
    description: "Glowing blue maze, yellow player, score HUD.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("7c8ARBCvewFiK2bIH2oei_minimax-h3.mp4"),
    filename: "7c8ARBCvewFiK2bIH2oei_minimax-h3.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    fileSizeLabel: "10.79 MB",
    durationLabel: "15s",
    hasAudio: true,
    sortOrder: 80,
    active: true,
  },
  {
    id: "vid-train",
    title: "Mountain Valley Train Journey",
    description: "Passenger train through a mountain valley.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("Vk6vjid5W4TV0Lg26akd0_output.mp4"),
    filename: "Vk6vjid5W4TV0Lg26akd0_output.mp4",
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    fileSizeLabel: "6.69 MB",
    durationLabel: "10s",
    hasAudio: true,
    sortOrder: 90,
    active: true,
  },
  {
    id: "vid-olive-suit",
    title: "Woman in Olive Business Suit",
    description: "Street walk in tailored olive suit.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: vid("JWCQ8WCQFF-QlXPuzMRyD_output.mp4"),
    filename: "JWCQ8WCQFF-QlXPuzMRyD_output.mp4",
    width: 800,
    height: 1088,
    aspectRatio: "3:4",
    format: "MP4",
    qualityTier: "Standard",
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

export function getAllDiscoverSamples(): R2Sample[] {
  return [...getActiveR2ImageSamples(), ...getActiveR2VideoSamples()].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
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
