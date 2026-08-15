/**
 * Modular sample catalog for Motio2edit homepage & galleries.
 * Prefer real paired assets under src/assets/ for before/after honesty.
 */

import sampleObjectBefore from "@/assets/sample-object-before.jpg";
import sampleObjectAfter from "@/assets/sample-object-after.jpg";
import sampleRemovalBefore from "@/assets/sample-removal-before.jpg";
import sampleRemovalAfter from "@/assets/sample-removal-after.jpg";
import sampleRestoreBefore from "@/assets/sample-restore-before.jpg";
import sampleRestoreAfter from "@/assets/sample-restore-after.jpg";
import sampleUpscaleBefore from "@/assets/sample-upscale-before.jpg";
import sampleUpscaleAfter from "@/assets/sample-upscale-after.jpg";

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
  before?: string;
  after?: string;
  thumb?: string;
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

const VIDEO_POSTERS = {
  landscape:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=960&h=540&fit=crop&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=960&h=540&fit=crop&q=80",
  portrait:
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=960&h=540&fit=crop&crop=faces&q=80",
} as const;

/** Image samples with real local before/after pairs only. */
export const IMAGE_SAMPLES: SampleItem[] = [
  {
    id: "img-object-removal",
    title: "Object Removal",
    description: "Erase distractions and rebuild the scene",
    category: "object-removal",
    editor: "image",
    before: sampleObjectBefore,
    after: sampleObjectAfter,
    prompt: "Remove the unwanted object completely and rebuild the background naturally",
    creditCost: 25,
  },
  {
    id: "img-circle-remove",
    title: "Circle to Remove",
    description: "Circle a person or object to remove it",
    category: "object-removal",
    editor: "image",
    before: sampleRemovalBefore,
    after: sampleRemovalAfter,
    prompt: "Remove the circled person and rebuild the background naturally",
    smartRemove: true,
    creditCost: 25,
  },
  {
    id: "img-photo-restore",
    title: "Photo Restoration",
    description: "Repair damaged or faded photos",
    category: "photo-restoration",
    editor: "image",
    before: sampleRestoreBefore,
    after: sampleRestoreAfter,
    prompt: "Restore this old damaged photo and improve clarity while keeping content intact",
    creditCost: 25,
  },
  {
    id: "img-upscale",
    title: "AI Upscaling",
    description: "Low-res to sharper detail",
    category: "ai-upscaling",
    editor: "image",
    before: sampleUpscaleBefore,
    after: sampleUpscaleAfter,
    prompt: "Upscale this image with sharper detail while preserving identity and composition",
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
