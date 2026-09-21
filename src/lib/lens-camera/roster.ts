/**
 * Motio2edit Lens roster — original 20 + 10 low-power optical lenses.
 * Every lens costs 20 credits per successful Apply.
 * Default selection = NONE (no auto-apply).
 */

export type LensOpticalConcept =
  | "widevista" | "ultrawide" | "fisheye" | "natural" | "portrait"
  | "cinematic" | "farreach" | "macro" | "tilt-shift" | "architect"
  | "dreamsoft" | "glowmist" | "starflare" | "prism" | "swirl"
  | "vintage" | "infrared" | "longglass" | "perspective" | "selective"
  | "hd4k" | "retro80s" | "snake" | "datetime"
  | "goldenhour" | "filmnoir" | "neondream" | "chromepop" | "dreamglow" | "prismcolor";

export type LensTier = "ai" | "normal";
export type LensImplementationStatus = "full" | "preview-only" | "coming-soon";

export type CameraLensDef = {
  id: string;
  name: string;
  code: string;
  color: string;
  concept: LensOpticalConcept;
  shortDescription: string;
  status: LensImplementationStatus;
  creditCost: number;
  tier: LensTier;
};

export const LENS_CAMERA_CREDITS = 0 as const;
export const LENS_AI_CREDITS = 20 as const;
export const LENS_AI_MAX_CREDITS = 20 as const;
export const LENS_GENERATION_CREDITS = 20 as const;

/**
 * Order:
 * Natural Frame → 10 low-power → remaining original 19 (relative order preserved).
 */
export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  { id: "lens_natural_frame", name: "Natural Frame", code: "NF", color: "#6C757D", concept: "natural", shortDescription: "Clean baseline view", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_hd_4k", name: "4K HD", code: "4K", color: "#4A90D9", concept: "hd4k", shortDescription: "Crisp high-clarity look", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_retro_80s", name: "Retro 80s", code: "R8", color: "#E040A0", concept: "retro80s", shortDescription: "Warm magenta-cyan fade", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_snake_view", name: "Snake View", code: "SV", color: "#FF6B2C", concept: "snake", shortDescription: "Heat-vision color map", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_date_time", name: "Date Time", code: "DT", color: "#F0A030", concept: "datetime", shortDescription: "Classic digital timestamp", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_golden_hour", name: "Golden Hour", code: "GH", color: "#E8A84A", concept: "goldenhour", shortDescription: "Warm golden highlights", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_film_noir", name: "Film Noir", code: "FN", color: "#2C2C2C", concept: "filmnoir", shortDescription: "Monochrome film contrast", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_neon_dream", name: "Neon Dream", code: "ND", color: "#00D4C8", concept: "neondream", shortDescription: "Cyan-magenta neon glow", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_chrome_pop", name: "Chrome Pop", code: "CP", color: "#8BA4B8", concept: "chromepop", shortDescription: "Cool metallic contrast", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_dream_glow", name: "Dream Glow", code: "DG", color: "#C9A0DC", concept: "dreamglow", shortDescription: "Soft luminous bloom", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_prism_color", name: "Prism Color", code: "PC", color: "#7B68EE", concept: "prismcolor", shortDescription: "Subtle chromatic shift", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_widevista", name: "Widevista", code: "WV", color: "#3B82C4", concept: "widevista", shortDescription: "Wide field expansion", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_ultrawide_horizon", name: "Ultrawide Horizon", code: "UW", color: "#2AA198", concept: "ultrawide", shortDescription: "Maximum breadth", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_fisheye_orbit", name: "Fisheye Orbit", code: "FO", color: "#8E44AD", concept: "fisheye", shortDescription: "Circular curved edge", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_cinematic_compress", name: "Cinematic Compress", code: "CC", color: "#4C6B54", concept: "cinematic", shortDescription: "Telephoto depth flatten", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_farreach", name: "FarReach", code: "FR", color: "#52796F", concept: "farreach", shortDescription: "Distant detail closer", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_portrait_bloom", name: "Portrait Bloom", code: "PB", color: "#D46A9F", concept: "portrait", shortDescription: "Creamy subject isolation", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_swirl_depth", name: "Swirl Depth", code: "SD", color: "#E8A317", concept: "swirl", shortDescription: "Swirling background blur", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_longglass_detail", name: "LongGlass Detail", code: "LG", color: "#3E5C76", concept: "longglass", shortDescription: "Sharp distant detail", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_perspective_stretch", name: "Perspective Stretch", code: "PS", color: "#4A6FA5", concept: "perspective", shortDescription: "Dramatic wide stretch", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_selective_focus", name: "Selective Focus", code: "SF", color: "#556B2F", concept: "selective", shortDescription: "One-point soft blur", status: "full", creditCost: 20, tier: "ai" },
  { id: "lens_microreveal", name: "MicroReveal", code: "MR", color: "#B8860B", concept: "macro", shortDescription: "Macro focus falloff", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_miniature_shift", name: "Miniature Shift", code: "MS", color: "#A0522D", concept: "tilt-shift", shortDescription: "Tilt-shift miniature", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_architect_align", name: "Architect Align", code: "AA", color: "#34495E", concept: "architect", shortDescription: "Straighten verticals", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_dreamsoft", name: "DreamSoft", code: "DS", color: "#9B7EBD", concept: "dreamsoft", shortDescription: "Gentle overall softness", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_glowmist", name: "GlowMist", code: "GM", color: "#7D5BA6", concept: "glowmist", shortDescription: "Diffusion light bloom", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_starflare", name: "Starflare", code: "ST", color: "#D97742", concept: "starflare", shortDescription: "Star-shaped flares", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_prism_echo", name: "Prism Echo", code: "PE", color: "#5DA9E9", concept: "prism", shortDescription: "Chromatic edge echo", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_vintage_halation", name: "Vintage Halation", code: "VH", color: "#8B5E3C", concept: "vintage", shortDescription: "Warm film glow", status: "full", creditCost: 20, tier: "normal" },
  { id: "lens_infraglow", name: "InfraGlow", code: "IG", color: "#B33F62", concept: "infrared", shortDescription: "Infrared foliage sky", status: "full", creditCost: 20, tier: "normal" },
];

export function getDefaultCameraLens(): CameraLensDef | null { return null; }

export function getCameraLensById(id: string | null | undefined): CameraLensDef | undefined {
  if (!id) return undefined;
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
}

export function isAiLens(lens: CameraLensDef | null | undefined): boolean {
  return lens?.tier === "ai";
}

export const LENS_ASPECT_PRESETS = [
  { id: "native", label: "Native", ratio: 0 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "21:9", label: "21:9", ratio: 21 / 9 },
] as const;

export type LensAspectId = (typeof LENS_ASPECT_PRESETS)[number]["id"];
export const LENS_ASPECTS = LENS_ASPECT_PRESETS;
