/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * Do not invent filenames. Do not use Unsplash for these entries.
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

/** Homepage discovery category — explicit only; do not infer from feature alone */
export type HomepageCategory =
  | "samples"
  | "try-now"
  | "trend"
  | "before-after"
  | "new"
  | "popular"
  | "featured"
  | "inspiration"
  | "video"
  | "music";

export type R2Sample = {
  id: string;
  title: string;
  description: string;
  studio: R2Studio;
  feature: R2Feature;
  /** Explicit homepage category. Defaults to samples for images / video for videos. */
  homepageCategory?: HomepageCategory;
  /** Real studio route for TRY NOW cards only */
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
};

const img = (name: string) => `${R2_PUBLIC}/samples/image-studio/${name}`;
const vid = (name: string) => `${R2_PUBLIC}/samples/video/${name}`;
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
    homepageCategory: "trend",
    url: img("3F_Tc0vT1g0V5JYhA3RAp.png"),
    width: 1600,
    height: 1200,
    aspectRatio: "4:3",
    format: "PNG",
    quality: "High",
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
    url: img("file_0000000000cc81fa86915dca20ae5d72.png"),
    width: 1499,
    height: 1049,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
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
    url: img("file_0000000012708211a41f45bc2940893a.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "2.21 MB",
    label: "Image Studio",
    sortOrder: 3,
    active: true,
  },
  {
    id: "img-peacock-final",
    title: "Peacock cityscape",
    description: "Full-colour peacock integrated into a wet city street at sunset.",
    studio: "image",
    feature: "image-generation",
    url: img("file_00000000234c82088edca4a78fe13fe9.png"),
    width: 1254,
    height: 1254,
    aspectRatio: "1:1",
    format: "PNG",
    quality: "High",
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
    url: img("file_0000000039b482069b96b2d43e05a3be.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
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
    url: img("BKM9xW1knxqG07FllyyPF.png"),
    width: 704,
    height: 944,
    aspectRatio: "11:15",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "803.7 kB",
    label: "Image Studio",
    sortOrder: 6,
    active: true,
  },
  {
    id: "img-fashion-tall",
    title: "Editorial fashion",
    description: "Tall editorial frame with strong subject presence.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "trend",
    url: img("H9hV_GxLVXAD_eQrKM7MK.png"),
    width: 1200,
    height: 1600,
    aspectRatio: "3:4",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "2.23 MB",
    label: "Image Studio",
    sortOrder: 7,
    active: true,
  },
  {
    id: "img-square-detail",
    title: "Square detail study",
    description: "High-resolution square generation for social and print.",
    studio: "image",
    feature: "image-generation",
    url: img("WYmIb-cK7FGW-CLbvZoYB.png"),
    width: 2048,
    height: 2048,
    aspectRatio: "1:1",
    format: "PNG",
    quality: "Ultra",
    fileSizeLabel: "3.42 MB",
    label: "Image Studio",
    sortOrder: 8,
    active: true,
  },
  {
    id: "img-landscape-a",
    title: "Golden landscape",
    description: "Wide natural landscape with balanced exposure.",
    studio: "image",
    feature: "image-generation",
    url: img("file_0000000045dc8209ba455a694f339832.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "2.65 MB",
    label: "Image Studio",
    sortOrder: 9,
    active: true,
  },
  {
    id: "img-landscape-b",
    title: "Coastal light",
    description: "Seaside atmosphere with layered depth.",
    studio: "image",
    feature: "image-generation",
    url: img("file_00000000483c8206bf252418131277ae.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "2.46 MB",
    label: "Image Studio",
    sortOrder: 10,
    active: true,
  },
  {
    id: "img-wide-cinematic",
    title: "Cinematic wide",
    description: "Widescreen still suitable for thumbnails and hero frames.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "trend",
    url: img("JNAxa2b4OCiSvBFg3sNO0_dAODEa8l.png"),
    width: 1024,
    height: 576,
    aspectRatio: "16:9",
    format: "PNG",
    quality: "High",
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
    url: img("M4wsUG3TjuqM_K50IXT4S_8VLXCl8F.png"),
    width: 576,
    height: 1024,
    aspectRatio: "9:16",
    format: "PNG",
    quality: "High",
    fileSizeLabel: "966.8 kB",
    label: "Image Studio",
    sortOrder: 12,
    active: true,
  },
  {
    id: "img-wa0010",
    title: "Warm still",
    description: "Everyday photographic still from Image Studio.",
    studio: "image",
    feature: "image-generation",
    url: img("IMG-20260711-WA0010.jpg"),
    aspectRatio: "3:4",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 13,
    active: true,
  },
  {
    id: "img-230101",
    title: "Evening frame",
    description: "Vertical photographic composition.",
    studio: "image",
    feature: "image-generation",
    url: img("IMG_20260903_230101.jpg"),
    aspectRatio: "3:4",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 14,
    active: true,
  },
  {
    id: "img-222049",
    title: "Street light",
    description: "Urban still with natural colour.",
    studio: "image",
    feature: "image-generation",
    url: img("IMG_20260904_222049.jpg"),
    aspectRatio: "3:4",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 15,
    active: true,
  },
  {
    id: "img-wwvr",
    title: "Horizon study",
    description: "Wide environmental still.",
    studio: "image",
    feature: "image-generation",
    url: img("WWvr9qel7CjvgVp0HzJtM.jpg"),
    aspectRatio: "3:2",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 16,
    active: true,
  },
  {
    id: "img-wk1cg",
    title: "Quiet detail",
    description: "Close environmental frame.",
    studio: "image",
    feature: "image-generation",
    url: img("Wk1cgQpX2qJQQE_wcS5Du.jpg"),
    aspectRatio: "3:4",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 17,
    active: true,
  },
  {
    id: "img-alfd",
    title: "Soft colour",
    description: "Gentle colour study from Image Studio.",
    studio: "image",
    feature: "image-generation",
    url: img("aLfd5AieQ8uc6ntdUaTZX_Jio09RJG.jpg"),
    aspectRatio: "3:4",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 18,
    active: true,
  },
  {
    id: "img-file-4fb4",
    title: "Open field",
    description: "Landscape generation sample.",
    studio: "image",
    feature: "image-generation",
    url: img("file_000000004fb48208ae6536fd4f4c1457.png"),
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 19,
    active: true,
  },
  {
    id: "img-file-5020",
    title: "Atmospheric still",
    description: "Generated atmospheric scene.",
    studio: "image",
    feature: "image-generation",
    url: img("file_0000000050208211a62053c5d548c946.png"),
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 20,
    active: true,
  },
  {
    id: "img-deer-add",
    title: "Add a deer",
    description: "Circle 2edit Add — forest clearing, deer placed with matched light.",
    studio: "circle",
    feature: "circle-add",
    homepageCategory: "try-now",
    tryNowRoute: "/studio/image/circle-remove?mode=add&from=home",
    url: CIRCLE_ADD_DEER.after,
    beforeUrl: CIRCLE_ADD_DEER.before,
    afterUrl: CIRCLE_ADD_DEER.after,
    width: 784,
    height: 1168,
    aspectRatio: "2:3",
    format: "JPEG",
    quality: "High",
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
    tryNowRoute: "/studio/image/circle-remove?mode=remove&from=home",
    url: CIRCLE_REMOVE_GIZA.after,
    beforeUrl: CIRCLE_REMOVE_GIZA.before,
    intermediateUrl: CIRCLE_REMOVE_GIZA.mark,
    afterUrl: CIRCLE_REMOVE_GIZA.after,
    aspectRatio: "1:1",
    format: "PNG",
    quality: "High",
    label: "Circle to Remove",
    sortOrder: 101,
    active: true,
  },
];

export const R2_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "vid-mountains-sun",
    title: "Mountains & sun",
    description: "Mountain vista with sun and ambient air motion — Watch Demo source.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260904_015459.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~14s",
    hasAudio: true,
    sortOrder: 0,
    active: true,
  },
  {
    id: "vid-001",
    title: "Cinematic motion 1",
    description: "Motio2edit Video Studio sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260831_005156.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 1,
    active: true,
  },
  {
    id: "vid-002",
    title: "Cinematic motion 2",
    description: "Motio2edit Video Studio sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260831_005653.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 2,
    active: true,
  },
  {
    id: "vid-003",
    title: "Cinematic motion 3",
    description: "Motio2edit Video Studio sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260904_015459.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 3,
    active: false,
  },
  {
    id: "vid-minimax-1",
    title: "Minimax motion",
    description: "Generated video sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("FvqkmmA0-CWpisklacI7v_minimax-h3.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 4,
    active: true,
  },
  {
    id: "vid-minimax-2",
    title: "Minimax motion B",
    description: "Generated video sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("GK7zgoY3v5k41taWDWqY-_minimax-h3.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 5,
    active: true,
  },
  {
    id: "vid-minimax-3",
    title: "Minimax motion C",
    description: "Generated video sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("P3l2PNIS1nSRhgSrmV-Rh_minimax-h3.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 6,
    active: true,
  },
  {
    id: "vid-output",
    title: "Studio output",
    description: "Video Studio export sample.",
    studio: "video",
    feature: "video-generation",
    url: vid("IgKXDxT5M9nXeMaDcRzXy_output.mp4"),
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 7,
    active: true,
  },
];

export const HOMEPAGE_WATCH_DEMO = {
  url: vid("VID_20260904_015459.mp4"),
  poster: CIRCLE_REMOVE_GIZA.before,
  title: "Mountains & sun",
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

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    null
  );
}
