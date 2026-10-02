/**
 * Central R2 sample catalog — production public URLs only.
 * Domain: https://assets.motio2edit.com
 * Titles/descriptions from visual inspection. Every description is EXACTLY 10 words.
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

/** Pre-login demo only — not in authenticated discovery gallery. */
export const DEMO_VIDEO_SAMPLE: R2Sample = {
  id: "vid-demo-media4",
  title: "Motio2edit Demo Reel",
  description: "Official Motio2edit product demo reel for the pre-login homepage only.",
  studio: "video",
  feature: "video-generation",
  homepageCategory: "demo",
  url: media("media_4", "Demo_Video.mp4"),
  filename: "Demo_Video.mp4",
  aspectRatio: "16:9",
  format: "MP4",
  qualityTier: "Premium",
  hasAudio: true,
  sortOrder: 1,
  active: true,
};

export const R2_IMAGE_SAMPLES: R2Sample[] = [
  {
    id: "img-m6-statue-standard",
    title: "Museum Antelope Statue",
    description: "White antelope statue stands inside a classical marble museum hall.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "Statue_Standard.png"),
    filename: "Statue_Standard.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 400,
    active: true,
  },
  {
    id: "img-m6-violin-standard",
    title: "Studio Violin and Bow",
    description: "Wooden violin and bow rest against a dark studio backdrop.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "violin-standard.png"),
    filename: "violin-standard.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 410,
    active: true,
  },
  {
    id: "img-m6-jungle-door",
    title: "Door in the Jungle",
    description: "A wooden door stands alone amid dense tropical jungle foliage.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "yAuGCFx7G649vQi4FxOAs_epd6mEUT.png"),
    filename: "yAuGCFx7G649vQi4FxOAs_epd6mEUT.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Ultra AI",
    sortOrder: 430,
    active: true,
  },
  {
    id: "img-m6-arctic-smiles",
    title: "Arctic Mountain Smile",
    description: "Woman smiles on icy plain before a sharp snowy peak.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: media("media_6", "vNgKSYwBt4mkvdcm-uDDz_9VpVdeTt.png"),
    filename: "vNgKSYwBt4mkvdcm-uDDz_9VpVdeTt.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 450,
    active: true,
  },
  {
    id: "img-m6-neon-bike",
    title: "Neon City Bicycle",
    description: "A neon bicycle floats above a rainy cyberpunk city street.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "qKWRqmccQzbRkqqkcupsd_hWmiOPAu.png"),
    filename: "qKWRqmccQzbRkqqkcupsd_hWmiOPAu.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Premium",
    sortOrder: 460,
    active: true,
  },
  {
    id: "img-m6-spacewalk",
    title: "Earth Orbit Spacewalk",
    description: "An astronaut floats in space with the glowing Earth behind.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "w1pcYswbXbt1l7BC9ikID_5XbprD0B.png"),
    filename: "w1pcYswbXbt1l7BC9ikID_5XbprD0B.png",
    width: 768,
    height: 1024,
    aspectRatio: "3:4",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 490,
    active: true,
  },
  {
    id: "img-m6-sandcastle",
    title: "Beach Sandcastle Towers",
    description: "Elaborate sandcastle towers rise high on a sunny beach shoreline.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "eJUc8XRUjc-6nt1t0r7N2_hOYEG2r0.png"),
    filename: "eJUc8XRUjc-6nt1t0r7N2_hOYEG2r0.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Premium",
    sortOrder: 500,
    active: true,
  },
  {
    id: "img-m6-color-grid",
    title: "Color Block Grid",
    description: "Bright geometric color blocks form an abstract painted grid pattern.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "S2BsFD6zTY2WAUTFn7nXd_bshYNJCt.png"),
    filename: "S2BsFD6zTY2WAUTFn7nXd_bshYNJCt.png",
    width: 576,
    height: 1024,
    aspectRatio: "9:16",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 570,
    active: true,
  },
  {
    id: "img-m6-music-banner",
    title: "Orchestra Cello Showcase",
    description: "Cello violin and french horn stand under soft studio lights.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "Music_banner.png"),
    filename: "Music_banner.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 580,
    active: true,
  },
  {
    id: "img-m6-classical-gods",
    title: "Classical Gods Panel",
    description: "Six classical mythic figures pose in an ornate manuscript panel.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "8-J0_uZQjwu_jmNNrwppi_4ePqbCCj.png"),
    filename: "8-J0_uZQjwu_jmNNrwppi_4ePqbCCj.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 590,
    active: true,
  },
  {
    id: "img-m6-gem-necklace",
    title: "Gemstone Gold Necklace",
    description: "Colorful gemstone necklace rests gently on a woman soft collarbone.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "Mtz710p3tt9lGpUhspvkj_5XXEbO29.png"),
    filename: "Mtz710p3tt9lGpUhspvkj_5XXEbO29.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 600,
    active: true,
  },
  {
    id: "img-m6-red-robot",
    title: "Motio2edit Red Robot",
    description: "Red armored robot stands proudly with Motio2edit logo on chest.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "RflS7VE1gG7gXhSI8439N_WNLBGd1t.png"),
    filename: "RflS7VE1gG7gXhSI8439N_WNLBGd1t.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 610,
    active: true,
  },
  {
    id: "img-m6-milky-way-sleep",
    title: "Sleeping Under Stars",
    description: "Woman sleeps outdoors beneath a bright glowing milky way sky.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: media("media_6", "XFpXNpEV1WfXZipkAbpzQ_ROLvh95W.png"),
    filename: "XFpXNpEV1WfXZipkAbpzQ_ROLvh95W.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 620,
    active: true,
  },
  {
    id: "img-m6-green-watch",
    title: "Green Dial Watch",
    description: "Silver wristwatch with green dial rests on a dark stone.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "YD3Z4uVofOFstNeBhxSHY_bfPHQ1aq.png"),
    filename: "YD3Z4uVofOFstNeBhxSHY_bfPHQ1aq.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 630,
    active: true,
  },
  {
    id: "img-m6-moon-horse",
    title: "Moonlight Horse Ride",
    description: "Rider sits on a brown horse under a full moon.",
    studio: "image",
    feature: "portrait",
    homepageCategory: "samples",
    url: media("media_6", "quKTv9BZOFzcEiJKhwxHj_dEWyAda5.png"),
    filename: "quKTv9BZOFzcEiJKhwxHj_dEWyAda5.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 640,
    active: true,
  },
  {
    id: "img-m6-iagos-jet",
    title: "IAGOS Airliner Flight",
    description: "White passenger jet banks over the coast under blue sky.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "s5o7V3KUEgWrNrSi5Heux_PVxByRmd.png"),
    filename: "s5o7V3KUEgWrNrSi5Heux_PVxByRmd.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 650,
    active: true,
  },
  {
    id: "img-m6-dreamcatcher",
    title: "Forest Dreamcatcher Hands",
    description: "Hands hold a feathered dreamcatcher in a quiet sunlit forest.",
    studio: "image",
    feature: "image-generation",
    homepageCategory: "samples",
    url: media("media_6", "xcGrPOM57xd6IeqIQROM4_eAGWfFZE.png"),
    filename: "xcGrPOM57xd6IeqIQROM4_eAGWfFZE.png",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    format: "PNG",
    qualityTier: "Standard",
    sortOrder: 660,
    active: true,
  },
];

export const R2_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "vid-m1-storm-bow",
    title: "Storm Ship Bridge",
    description: "Ship bridge faces stormy waves under a lightning filled sky.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_1", "Alone-sail_standard.mp4"),
    filename: "Alone-sail_standard.mp4",
    width: 768,
    height: 768,
    aspectRatio: "1:1",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 100,
    active: true,
  },
  {
    id: "vid-m1-alien-dunes",
    title: "Astronaut on Alien Dunes",
    description: "Astronaut stands on alien dunes beside a glowing crystal formation.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_1", "An-life-on-another-planet_premium.mp4"),
    filename: "An-life-on-another-planet_premium.mp4",
    width: 768,
    height: 1344,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Premium",
    hasAudio: true,
    sortOrder: 110,
    active: true,
  },
  {
    id: "vid-m2-abandoned-city",
    title: "Abandoned City Aerial",
    description: "Empty apartment towers line a deserted overgrown tree lined street.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_2", "Abandoned-City_standard.mp4"),
    filename: "Abandoned-City_standard.mp4",
    width: 704,
    height: 1280,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 120,
    active: true,
  },
  {
    id: "vid-m2-airship-city",
    title: "Airship Over Skyline",
    description: "A Motio2edit airship flies over the city skyline at sunset.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_2", "Airship-1920s_standard.mp4"),
    filename: "Airship-1920s_standard.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 130,
    active: true,
  },
  {
    id: "vid-m3-farm-tractor",
    title: "Farm Tractor Hills",
    description: "A farmer drives a green tractor across hills among livestock.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_3", "Alien-from-planet_Standard.mp4"),
    filename: "Alien-from-planet_Standard.mp4",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 140,
    active: true,
  },
  {
    id: "vid-m4-dino-lab",
    title: "Lab Tyrannosaurus",
    description: "A tyrannosaurus stands inside the Motio2edit lab under circular lights.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_4", "Dinosaur_Standard.mp4"),
    filename: "Dinosaur_Standard.mp4",
    width: 768,
    height: 1344,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 150,
    active: true,
  },
  {
    id: "vid-m4-mountain-hiker",
    title: "Mountain Path Hiker",
    description: "Hiker climbs rocky mountain path under a warm sunset sky.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_4", "HikersLife_standard.mp4"),
    filename: "HikersLife_standard.mp4",
    width: 1440,
    height: 1440,
    aspectRatio: "1:1",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 160,
    active: true,
  },
  {
    id: "vid-m4-forest-warrior",
    title: "Forest Armored Warrior",
    description: "Armored warrior woman holds a sword in a sunlit forest.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_4", "HLAHFATYQIey8FLk8LOE6_4PNRF7tc.mp4"),
    filename: "HLAHFATYQIey8FLk8LOE6_4PNRF7tc.mp4",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 165,
    active: true,
  },
  {
    id: "vid-m4-empire-ape",
    title: "Empire State Ape",
    description: "A giant ape grips the Empire State Building at dusk.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_4", "kingkongOnempirestatebuildingscene_standard.mp4"),
    filename: "kingkongOnempirestatebuildingscene_standard.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 170,
    active: true,
  },
  {
    id: "vid-m4-fun-portrait",
    title: "Portrait Frame Chip Plate",
    description: "Hand offers chips before a framed portrait on a table.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_4", "fun-protait_standard.mp4"),
    filename: "fun-protait_standard.mp4",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 180,
    active: true,
  },
  {
    id: "vid-m6-tron-racing",
    title: "Neon Grid Race",
    description: "A neon light-cycle races through glowing digital grid tunnel walls.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_6", "tron-racing_premium.mp4"),
    filename: "tron-racing_premium.mp4",
    width: 768,
    height: 1344,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Premium",
    hasAudio: true,
    sortOrder: 200,
    active: true,
  },
  {
    id: "vid-m6-ocean-sub",
    title: "Yellow Submarine Launch",
    description: "A yellow Motio2edit submarine hangs above the blue ocean surface.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_6", "ocean-explore_premium.mp4"),
    filename: "ocean-explore_premium.mp4",
    width: 1344,
    height: 768,
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Premium",
    hasAudio: true,
    sortOrder: 210,
    active: true,
  },
  {
    id: "vid-m6-truck-cab",
    title: "Mountain Truck Cab",
    description: "Driver view winds along a mountain highway through rugged cliffs.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_6", "Truck-journey_standard.mp4"),
    filename: "Truck-journey_standard.mp4",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 220,
    active: true,
  },
  {
    id: "vid-m6-romeo-juliet",
    title: "Romeo and Juliet Story",
    description: "Classic Romeo and Juliet romance scene rendered in cinematic motion.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_6", "RomeoJulietlovestory_Standard.mp4"),
    filename: "RomeoJulietlovestory_Standard.mp4",
    aspectRatio: "16:9",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 230,
    active: true,
  },
  {
    id: "vid-m6-water-scarcity",
    title: "Water Scarcity Future",
    description: "A man survives in a world after water grew scarce.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_6", "world-after-scarcity-of-water-Man_Standard.mp4"),
    filename: "world-after-scarcity-of-water-Man_Standard.mp4",
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Standard",
    hasAudio: true,
    sortOrder: 240,
    active: true,
  },
  {
    id: "vid-m7-window-plant",
    title: "Sunny Window Plant",
    description: "Potted green plant sits on a sunny window sill ledge.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "video",
    url: media("media_7", "7wIvSK8u2kZYz1FCxYo-N_6ZqCueKc.mp4"),
    filename: "7wIvSK8u2kZYz1FCxYo-N_6ZqCueKc.mp4",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    format: "MP4",
    qualityTier: "Ultra AI",
    hasAudio: true,
    sortOrder: 300,
    active: true,
  },
];

function dedupeByUrl(samples: R2Sample[]): R2Sample[] {
  const seen = new Set<string>();
  const out: R2Sample[] = [];
  for (const s of samples) {
    if (!s.active) continue;
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

export function getActiveR2ImageSamples(): R2Sample[] {
  return dedupeByUrl(R2_IMAGE_SAMPLES).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveR2VideoSamples(): R2Sample[] {
  return dedupeByUrl(R2_VIDEO_SAMPLES).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getImagineOnlySamples(): R2Sample[] {
  return getActiveR2ImageSamples().filter(
    (s) => s.studio === "image" || s.studio === "circle",
  );
}

export function getMusicVideoSamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter((s) => s.homepageCategory === "music");
}

/** Authenticated homepage videos — excludes pre-login Demo_Video. */
export function getVideoOnlySamples(): R2Sample[] {
  return getActiveR2VideoSamples().filter(
    (s) => s.homepageCategory !== "music" && s.homepageCategory !== "demo",
  );
}

export function getAllDiscoverSamples(): R2Sample[] {
  return dedupeByUrl([...R2_IMAGE_SAMPLES, ...R2_VIDEO_SAMPLES]).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getR2SampleById(id: string): R2Sample | null {
  return (
    R2_IMAGE_SAMPLES.find((s) => s.id === id) ??
    R2_VIDEO_SAMPLES.find((s) => s.id === id) ??
    (DEMO_VIDEO_SAMPLE.id === id ? DEMO_VIDEO_SAMPLE : null)
  );
}

export function getDemoVideoSample(): R2Sample {
  return DEMO_VIDEO_SAMPLE;
}
