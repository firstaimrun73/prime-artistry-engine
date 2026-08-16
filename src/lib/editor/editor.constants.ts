import type { QuickStyle } from "./editor.types";

export const MAX_GALLERY_IMAGES = 10;
export const WATERMARK_PREF_KEY = "motio2edit-watermark-pref";

export const MAX_IMAGE_MB = 25;
export const MAX_VIDEO_MB = 200;

export const LOADING_MESSAGES = [
  "Creating your masterpiece…",
  "Enhancing with AI…",
  "Generating cinematic results…",
  "Applying advanced AI edits…",
  "Perfecting every pixel…",
  "Bringing your idea to life…",
];

export const VIDEO_QUICK_STYLES: QuickStyle[] = [
  { emoji: "🎬", label: "Slow Motion", prompt: "Animate as smooth cinematic slow motion, ~0.5x speed, buttery frame interpolation, subtle motion blur and stable camera. Keep the subject's identity and scene unchanged." },
  { emoji: "💫", label: "Cinematic FX", prompt: "Add cinematic camera motion with a slow dolly-in, shallow depth of field, atmospheric particles and filmic color grading while preserving the original subject and composition." },
  { emoji: "🎵", label: "Music Video Vibe", prompt: "Turn into a stylish music-video shot with rhythmic camera moves, bold color grading, punchy lighting and dynamic energy; keep the subject centered." },
  { emoji: "🌊", label: "Smooth Motion", prompt: "Generate very smooth, natural motion with a gentle parallax pan and subtle environmental movement (hair, fabric, background). No warping or identity drift." },
  { emoji: "⚡", label: "Action Scene", prompt: "Turn into a high-energy action sequence with a fast tracking camera, dynamic angles, motion blur and dramatic lighting while keeping the subject sharp and recognizable." },
  { emoji: "🎭", label: "Scene Continue", prompt: "Naturally continue the scene as if the camera keeps rolling: consistent lighting, consistent subject identity, coherent environment motion and no cuts." },
];