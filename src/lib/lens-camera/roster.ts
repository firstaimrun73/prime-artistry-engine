/**
 * Motio2edit Lens roster — 20 lenses, two tiers.
 * Tier 1 (AI): 20 credits. Tier 2 (Normal): 0 credits, on-device.
 * Default selection = NONE (no auto-apply).
 */

export type LensOpticalConcept =
  | "widevista" | "ultrawide" | "fisheye" | "natural" | "portrait"
  | "cinematic" | "farreach" | "macro" | "tilt-shift" | "architect"
  | "dreamsoft" | "glowmist" | "starflare" | "prism" | "swirl"
  | "vintage" | "infrared" | "longglass" | "perspective" | "selective";

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

export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
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
  { id: "lens_natural_frame", name: "Natural Frame", code: "NF", color: "#6C757D", concept: "natural", shortDescription: "Clean baseline view", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_microreveal", name: "MicroReveal", code: "MR", color: "#B8860B", concept: "macro", shortDescription: "Macro focus falloff", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_miniature_shift", name: "Miniature Shift", code: "MS", color: "#A0522D", concept: "tilt-shift", shortDescription: "Tilt-shift miniature", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_architect_align", name: "Architect Align", code: "AA", color: "#34495E", concept: "architect", shortDescription: "Straighten verticals", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_dreamsoft", name: "DreamSoft", code: "DS", color: "#9B7EBD", concept: "dreamsoft", shortDescription: "Gentle overall softness", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_glowmist", name: "GlowMist", code: "GM", color: "#7D5BA6", concept: "glowmist", shortDescription: "Diffusion light bloom", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_starflare", name: "Starflare", code: "ST", color: "#D97742", concept: "starflare", shortDescription: "Star-shaped flares", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_prism_echo", name: "Prism Echo", code: "PE", color: "#5DA9E9", concept: "prism", shortDescription: "Chromatic edge echo", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_vintage_halation", name: "Vintage Halation", code: "VH", color: "#8B5E3C", concept: "vintage", shortDescription: "Warm film glow", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_infraglow", name: "InfraGlow", code: "IG", color: "#B33F62", concept: "infrared", shortDescription: "Infrared foliage sky", status: "full", creditCost: 0, tier: "normal" },
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
