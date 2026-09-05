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
    title: "Smiling woman, black-and-white",
    description: "Black-and-white close-up of a young woman smiling outdoors with soft circular bokeh behind her.",
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
    title: "Christ the Redeemer at sunset",
    description: "Aerial view of the Rio statue with arms open above the city as the sun sets in orange cloud.",
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
    title: "Painted lady on pink zinnia",
    description: "Close-up of a painted lady butterfly feeding on a pink zinnia with soft green-pink bokeh.",
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
    title: "Peacock on wet neon street",
    description: "Blue peacock with open train standing on a rain-slick city street under a vivid sunset sky.",
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
    title: "Horses under open wooden barn",
    description: "Several horses standing and feeding under a long open-air wooden barn at golden hour.",
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
    id: "img-portrait-soft",
    title: "Angel girl with flower hairpins",
    description: "Anime-style girl in a white lace dress with feathered wings and plumeria in her hair against a teal wall.",
    studio: "image",
    feature: "portrait",
    url: img("BKM9xW1knxqG07FllyyPF.png"),
    width: 704,
    height: 944,
    aspectRatio: "11:15",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 6,
    active: true,
  },
  {
    id: "img-fashion-tall",
    title: "Spaghetti plate with lemon and sauces",
    description: "Overhead plate of noodles with fried pieces, yellow berries, halved lemon, tomato, and two side sauces on wood.",
    studio: "image",
    feature: "image-generation",
    url: img("H9hV_GxLVXAD_eQrKM7MK.png"),
    width: 1200,
    height: 1600,
    aspectRatio: "3:4",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 7,
    active: true,
  },
  {
    id: "img-square-detail",
    title: "Bride with white roses and companion",
    description: "Studio portrait of a seated bride in lace holding white roses, embraced by a standing woman in beige.",
    studio: "image",
    feature: "image-generation",
    url: img("WYmIb-cK7FGW-CLbvZoYB.png"),
    width: 2048,
    height: 2048,
    aspectRatio: "1:1",
    format: "PNG",
    quality: "Ultra",
    label: "Image Studio",
    sortOrder: 8,
    active: true,
  },
  {
    id: "img-landscape-a",
    title: "White horse feeding in open barn",
    description: "Dappled white horse at a wooden rail eating hay inside a sunlit open-air stable.",
    studio: "image",
    feature: "image-generation",
    url: img("file_0000000045dc8209ba455a694f339832.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 9,
    active: true,
  },
  {
    id: "img-landscape-b",
    title: "Fox in wheat field at purple dusk",
    description: "A red fox sitting alone in a golden wheat field under a purple-pink evening sky and distant hills.",
    studio: "image",
    feature: "image-generation",
    url: img("file_00000000483c8206bf252418131277ae.png"),
    width: 1536,
    height: 1024,
    aspectRatio: "3:2",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 10,
    active: true,
  },
  {
    id: "img-wide-cinematic",
    title: "Viking on dragon-prow longship",
    description: "Woman in fur and chainmail standing at the carved prow of a longship on a misty fjord at low sun.",
    studio: "image",
    feature: "image-generation",
    url: img("JNAxa2b4OCiSvBFg3sNO0_dAODEa8l.png"),
    width: 1024,
    height: 576,
    aspectRatio: "16:9",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 11,
    active: true,
  },
  {
    id: "img-vertical-story",
    title: "Elderly woman in kimono under sakura",
    description: "Older woman in a pale pink kimono seated on a wooden veranda as cherry petals fall, pagoda in the mist beyond.",
    studio: "image",
    feature: "image-generation",
    url: img("M4wsUG3TjuqM_K50IXT4S_8VLXCl8F.png"),
    width: 576,
    height: 1024,
    aspectRatio: "9:16",
    format: "PNG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 12,
    active: true,
  },
  {
    id: "img-wa0010",
    title: "Pixel aviator with goggles",
    description: "Pixel-art portrait of a pilot in a leather helmet and goggles against a peach sky.",
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
    title: "Cat on alley brick wall",
    description: "Orange-and-white cat walking along a high brick wall above a dumpster in a city alley.",
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
    title: "Gold-leaf mythical creature mural",
    description: "Aged gold-and-blue mural showing dragons, a phoenix, a winged sphinx, and a bull among clouds.",
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
    title: "Black radial sun glyph",
    description: "Minimal black graphic of a twelve-ray sun with a dotted center on a white field.",
    studio: "image",
    feature: "image-generation",
    url: img("WWvr9qel7CjvgVp0HzJtM.jpg"),
    aspectRatio: "1:1",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 16,
    active: true,
  },
  {
    id: "img-wk1cg",
    title: "Wedding couple on the lawn",
    description: "Bride in a white gown and groom in a black tuxedo walking hand-in-hand across a grassy field.",
    studio: "image",
    feature: "image-generation",
    url: img("Wk1cgQpX2qJQQE_wcS5Du.jpg"),
    aspectRatio: "1:1",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 17,
    active: true,
  },
  {
    id: "img-alfd",
    title: "Crystal chandelier",
    description: "Large crystal chandelier with candle bulbs glowing against a dark coffered ceiling.",
    studio: "image",
    feature: "image-generation",
    url: img("aLfd5AieQ8uc6ntdUaTZX_Jio09RJG.jpg"),
    aspectRatio: "1:1",
    format: "JPEG",
    quality: "High",
    label: "Image Studio",
    sortOrder: 18,
    active: true,
  },
  {
    id: "img-file-4fb4",
    title: "1990s world peak infographic",
    description: "Vintage-styled world map poster titled The World at Its Peak — 1990s with decade statistics.",
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
    title: "1928 Ford Model A on museum floor",
    description: "Black 1928 Ford Model A with cream wire wheels displayed in a museum next to a period poster.",
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
    title: "Framed vintage family portrait",
    description: "A cracked sepia family photograph in a wooden frame on a table, lit by a shaft of light.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260904_015459.mp4"),
    width: 1280,
    height: 704,
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
    title: "Maple leaf on a forest stream",
    description: "A single orange maple leaf floats on still water among rocks and green forest canopy.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260831_005156.mp4"),
    width: 480,
    height: 710,
    aspectRatio: "2:3",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~6s",
    hasAudio: true,
    sortOrder: 1,
    active: true,
  },
  {
    id: "vid-002",
    title: "Rocket launch at sunset",
    description: "A white Saturn-class rocket lifts off from the pad with bright engine flame under a sunset sky.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260831_005653.mp4"),
    width: 472,
    height: 854,
    aspectRatio: "9:16",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~6s",
    hasAudio: true,
    sortOrder: 2,
    active: true,
  },
  {
    id: "vid-003",
    title: "Framed vintage family portrait",
    description: "Duplicate of family photo sample — kept inactive.",
    studio: "video",
    feature: "video-generation",
    url: vid("VID_20260904_015459.mp4"),
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    sortOrder: 3,
    active: false,
  },
  {
    id: "vid-minimax-1",
    title: "Humpty Dumpty on a brick wall",
    description: "3D cartoon egg character sits smiling on a brick wall with colorful birds and village houses behind.",
    studio: "video",
    feature: "video-generation",
    url: vid("FvqkmmA0-CWpisklacI7v_minimax-h3.mp4"),
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 4,
    active: true,
  },
  {
    id: "vid-minimax-2",
    title: "Earth from orbit under the Milky Way",
    description: "Curved blue Earth limb with clouds, bright sun flare, and the Milky Way across dark space.",
    studio: "video",
    feature: "video-generation",
    url: vid("GK7zgoY3v5k41taWDWqY-_minimax-h3.mp4"),
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~5s",
    hasAudio: true,
    sortOrder: 5,
    active: true,
  },
  {
    id: "vid-minimax-3",
    title: "Detective with stopwatch in neon city",
    description: "Man in trench coat and flat cap holds a pocket watch while a glowing energy ring opens on a rainy city street.",
    studio: "video",
    feature: "video-generation",
    url: vid("P3l2PNIS1nSRhgSrmV-Rh_minimax-h3.mp4"),
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 6,
    active: true,
  },
  {
    id: "vid-output",
    title: "Village well at dusk",
    description: "Ink-wash style Chinese village scene with people around a brick well, thatched roofs, and birds overhead.",
    studio: "video",
    feature: "video-generation",
    url: vid("IgKXDxT5M9nXeMaDcRzXy_output.mp4"),
    width: 1280,
    height: 704,
    aspectRatio: "16:9",
    format: "MP4",
    quality: "HD",
    label: "Video Studio",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 7,
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

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    null
  );
}
