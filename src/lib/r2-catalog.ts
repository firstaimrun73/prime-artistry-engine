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

export type R2Sample = {
  id: string;
  title: string;
  description: string;
  studio: R2Studio;
  feature: R2Feature;
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
    url: img("3F_Tc0vT1g0V5JYhA3RAp.png"),
    width: 1600,
    height: 1200,
    aspectRatio: "4:3",
    format: "PNG",
    quality: "High",
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
    label: "Image Studio",
    sortOrder: 5,
    active: true,
  },
  {
    id: "img-deer-add",
    title: "Add a deer",
    description: "Circle 2edit Add — forest clearing, deer placed with matched light.",
    studio: "circle",
    feature: "circle-add",
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
    sortOrder: 10,
    active: true,
  },
  {
    id: "img-giza-remove",
    title: "Remove crowd at Giza",
    description: "Circle 2edit Remove — tourists cleared from the pyramid scene.",
    studio: "circle",
    feature: "circle-remove",
    url: CIRCLE_REMOVE_GIZA.after,
    beforeUrl: CIRCLE_REMOVE_GIZA.before,
    intermediateUrl: CIRCLE_REMOVE_GIZA.mark,
    afterUrl: CIRCLE_REMOVE_GIZA.after,
    aspectRatio: "1:1",
    format: "PNG",
    quality: "High",
    label: "Circle to Remove",
    sortOrder: 11,
    active: true,
  },
];

export const R2_VIDEO_SAMPLES: R2Sample[] = [
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
    active: true,
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
];

export const HOMEPAGE_WATCH_DEMO = {
  url: vid("VID_20260904_015459.mp4"),
  poster: CIRCLE_REMOVE_GIZA.before,
} as const;

export function getActiveR2ImageSamples(): R2Sample[] {
  return R2_IMAGE_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveR2VideoSamples(): R2Sample[] {
  return R2_VIDEO_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    null
  );
}
