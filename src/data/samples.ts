/**
 * Modular sample catalog for Motio2edit homepage & galleries.
 * Designed to scale toward 1000+ entries without bloating page components.
 *
 * Add new samples here (or in category-specific files that re-export into ALL_SAMPLES).
 * UI components import filtered slices — they never hardcode image URLs inline.
 */

export type SampleCategory =
  | "background-removal"
  | "object-removal"
  | "photo-restoration"
  | "face-enhancement"
  | "ai-upscaling"
  | "style-transfer"
  | "clothing"
  | "portrait"
  | "auto-edit"
  | "image-generation"
  | "video"
  | "music";

export type SampleEditor = "image" | "video" | "music";

export type SampleItem = {
  id: string;
  title: string;
  description: string;
  category: SampleCategory;
  editor: SampleEditor;
  /** Before image URL or imported asset path string */
  before?: string;
  /** After image URL or imported asset path string */
  after?: string;
  /** Single thumbnail when before/after not applicable */
  thumb?: string;
  /** Optional demo media (video mp4 / audio mp3) */
  mediaUrl?: string;
  prompt: string;
  creditCost?: number;
  planRequired?: "free" | "lite" | "plus" | "pro" | "studio" | "business";
  route?: string;
  smartRemove?: boolean;
  badge?: string;
  duration?: string;
  genre?: string;
  mood?: string;
};

/** Reliable external demo posters (no missing /demo/ paths). */
const VIDEO_POSTERS = {
  landscape:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=960&h=540&fit=crop&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=960&h=540&fit=crop&q=80",
  portrait:
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=960&h=540&fit=crop&crop=faces&q=80",
} as const;

/**
 * Core image before/after pairs.
 * Prefer distinct before/after when real paired assets exist under src/assets/.
 * Unsplash pairs keep the same subject id on both sides (quality params only differ).
 */
export const IMAGE_SAMPLES: SampleItem[] = [
  {
    id: "img-bg-removal",
    title: "Background Removal",
    description: "Clean cut-outs with crisp edges",
    category: "background-removal",
    editor: "image",
    before:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=600&fit=crop&crop=faces&q=85",
    after:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=600&fit=crop&crop=faces&q=85&sat=-100&bri=8",
    prompt: "Remove the background completely and keep clean edges",
    creditCost: 25,
  },
  {
    id: "img-photo-restore",
    title: "Photo Restoration",
    description: "Repair and colorise old memories",
    category: "photo-restoration",
    editor: "image",
    before:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&crop=faces&q=80&sat=-90&con=-35",
    after:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&crop=faces&q=90",
    prompt: "Restore this old damaged photo and colorise it naturally",
    creditCost: 25,
  },
  {
    id: "img-object-removal",
    title: "Object Removal",
    description: "Erase distractions and rebuild the scene",
    category: "object-removal",
    editor: "image",
    before: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop&q=65",
    after: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop&q=90",
    prompt: "Remove all people from the scene and rebuild the background naturally",
    creditCost: 25,
  },
  {
    id: "img-upscale",
    title: "AI Upscaling",
    description: "Low-res to sharp detail",
    category: "ai-upscaling",
    editor: "image",
    before:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=280&h=280&fit=crop&crop=faces&q=8",
    after:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop&crop=faces&q=95",
    prompt: "Enhance to 4K quality with maximum detail",
    creditCost: 25,
  },
  {
    id: "img-style",
    title: "Style Transfer",
    description: "Reimagine any shot as fine art",
    category: "style-transfer",
    editor: "image",
    before: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&h=600&fit=crop&q=85",
    after:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&h=600&fit=crop&q=85&sat=35&con=25",
    prompt: "Repaint this photo as a detailed oil painting while keeping the composition identical",
    creditCost: 25,
  },
  {
    id: "img-portrait",
    title: "Portrait Enhancement",
    description: "Studio-grade face and lighting",
    category: "portrait",
    editor: "image",
    before:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=faces&q=35",
    after:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=faces&q=95",
    prompt: "Enhance face and lighting while keeping the identity identical",
    creditCost: 25,
  },
  {
    id: "img-circle-remove",
    title: "Circle & Remove",
    description: "Circle any person or object to remove it",
    category: "object-removal",
    editor: "image",
    before:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=600&fit=crop&crop=faces&q=75",
    after:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=600&fit=crop&crop=faces&q=95",
    prompt: "Remove the circled person and rebuild the background naturally",
    smartRemove: true,
    creditCost: 25,
  },
];

export const VIDEO_SAMPLES: SampleItem[] = [
  {
    id: "vid-landscape",
    title: "Cinematic Landscape",
    description: "Text-to-video drone flight over misty peaks",
    category: "video",
    editor: "video",
    thumb: VIDEO_POSTERS.landscape,
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    prompt:
      "A cinematic drone shot flying over misty mountains at golden hour with dramatic lighting",
    badge: "Text to Video",
    duration: "0:10",
    planRequired: "lite",
    creditCost: 125,
  },
  {
    id: "vid-tech",
    title: "Tech Visualization",
    description: "Particles assembling into a glowing AI core",
    category: "video",
    editor: "video",
    thumb: VIDEO_POSTERS.tech,
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    prompt:
      "Futuristic AI robot assembling itself from particles of light in a dark laboratory with blue glow",
    badge: "Text to Video",
    duration: "0:15",
    planRequired: "lite",
    creditCost: 125,
  },
  {
    id: "vid-portrait",
    title: "Motion Portrait",
    description: "Image-to-video with cinematic color grading",
    category: "video",
    editor: "video",
    thumb: VIDEO_POSTERS.portrait,
    mediaUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    prompt:
      "Athletic person running through city streets at sunset with motion blur and cinematic color grading",
    badge: "Image to Video",
    duration: "0:15",
    planRequired: "lite",
    creditCost: 125,
  },
];

export const MUSIC_SAMPLES: SampleItem[] = [
  {
    id: "mus-epic",
    title: "Epic Cinematic Trailer",
    description: "Soaring strings and triumphant brass",
    category: "music",
    editor: "music",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    prompt:
      "Epic cinematic trailer track with soaring strings, deep taiko drums and a triumphant brass finale.",
    duration: "30s",
    genre: "Orchestral",
    mood: "Epic",
    planRequired: "lite",
    creditCost: 100,
  },
  {
    id: "mus-lofi",
    title: "Lo-fi Study Beats",
    description: "Warm dusty vinyl and mellow Rhodes",
    category: "music",
    editor: "music",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    prompt:
      "Warm lofi hip hop beat with dusty vinyl crackle, mellow Rhodes piano chords and a laid-back bassline.",
    duration: "30s",
    genre: "Lo-fi",
    mood: "Chill",
    planRequired: "lite",
    creditCost: 50,
  },
  {
    id: "mus-edm",
    title: "Electronic Dance",
    description: "Pulsing synth bass and euphoric drop",
    category: "music",
    editor: "music",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    prompt:
      "High-energy electronic dance track with pulsing synth bass, bright arpeggios and a euphoric drop.",
    duration: "30s",
    genre: "Electronic",
    mood: "Energetic",
    planRequired: "lite",
    creditCost: 100,
  },
];

/** Flat catalog for search / future pagination. */
export const ALL_SAMPLES: SampleItem[] = [
  ...IMAGE_SAMPLES,
  ...VIDEO_SAMPLES,
  ...MUSIC_SAMPLES,
];

export function samplesByCategory(category: SampleCategory): SampleItem[] {
  return ALL_SAMPLES.filter((s) => s.category === category);
}

export function samplesByEditor(editor: SampleEditor): SampleItem[] {
  return ALL_SAMPLES.filter((s) => s.editor === editor);
}
