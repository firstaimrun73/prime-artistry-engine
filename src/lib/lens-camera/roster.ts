/**
 * Motio2edit Lens roster — single canonical source of truth.
 * Normal optical: 20 credits per successful Apply.
 * AI+: plan entitlement + 5 successful attempts per day (no per-Apply credit charge).
 */
export type LensOpticalConcept =
  | "widevista" | "ultrawide" | "fisheye" | "natural" | "portrait"
  | "cinematic" | "farreach" | "macro" | "tilt-shift" | "architect"
  | "dreamsoft" | "glowmist" | "starflare" | "prism" | "swirl"
  | "vintage" | "infrared" | "longglass" | "perspective" | "selective"
  | "hd4k" | "windowscolour" | "datetime" | "snake" | "retro80s"
  | "colournegative" | "windowspaint" | "mirror" | "crown" | "origami" | "sketch"
  | "vintagehalation" | "thundereyes" | "hairshades" | "butterfly" | "fairytale" | "crayon";

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
/** Paid-plan AI+ successful attempts per calendar day. */
export const LENS_AI_PLUS_ATTEMPT_LIMIT = 5 as const;

export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  { id: "lens_natural_frame", name: "Natural Frame", code: "NF", color: "#6C757D", concept: "natural", shortDescription: "Clean baseline view", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_windows_colour", name: "Windows Colour", code: "WC", color: "#00A4EF", concept: "windowscolour", shortDescription: "Clean modern digital colour", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_colour_negative", name: "Colour Negative", code: "CN", color: "#9B59B6", concept: "colournegative", shortDescription: "True RGB colour negative", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_date_time", name: "Day & Time", code: "DT", color: "#F0A030", concept: "datetime", shortDescription: "Centered day and time stamp", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_snake_view", name: "Snake View", code: "SV", color: "#FF6B2C", concept: "snake", shortDescription: "Heat-vision colour map", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_retro_80s", name: "Retro 80s", code: "R8", color: "#E040A0", concept: "retro80s", shortDescription: "Synthwave sunset grade", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_microreveal", name: "MicroReveal", code: "MR", color: "#B8860B", concept: "macro", shortDescription: "AI macro detail enhancement", status: "full", creditCost: 0, tier: "ai" },
  { id: "lens_miniature_shift", name: "Miniature Shift", code: "MS", color: "#A0522D", concept: "tilt-shift", shortDescription: "Tilt-shift miniature", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_architect_align", name: "Architect Align", code: "AA", color: "#34495E", concept: "architect", shortDescription: "Straighten verticals", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_dreamsoft", name: "DreamSoft", code: "DS", color: "#9B7EBD", concept: "dreamsoft", shortDescription: "Gentle overall softness", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_glowmist", name: "GlowMist", code: "GM", color: "#7D5BA6", concept: "glowmist", shortDescription: "Soft luminous glow", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_starflare", name: "Starflare", code: "SF", color: "#F4D35E", concept: "starflare", shortDescription: "Highlight star rays", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_prism_echo", name: "Prism Echo", code: "PE", color: "#E74C3C", concept: "prism", shortDescription: "Chromatic prism shift", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_swirl_drift", name: "Swirl Drift", code: "SD", color: "#1ABC9C", concept: "swirl", shortDescription: "Gentle radial swirl", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_vintage_grade", name: "Vintage Grade", code: "VG", color: "#C4A484", concept: "vintage", shortDescription: "Warm film grade", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_infraglow", name: "InfraGlow", code: "IG", color: "#E8F5E9", concept: "infrared", shortDescription: "Infrared foliage/sky", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_longglass", name: "LongGlass", code: "LG", color: "#5D6D7E", concept: "longglass", shortDescription: "Telephoto compression", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_perspective_stretch", name: "Perspective Stretch", code: "PS", color: "#2C3E50", concept: "perspective", shortDescription: "Perspective exaggeration", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_selective_focus", name: "Selective Focus", code: "SF2", color: "#16A085", concept: "selective", shortDescription: "Center subject isolation", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_portrait_bloom", name: "Portrait Bloom", code: "PB", color: "#E91E63", concept: "portrait", shortDescription: "Subject soft background", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_fisheye_orbit", name: "Fisheye Orbit", code: "FO", color: "#3498DB", concept: "fisheye", shortDescription: "Radial fisheye curve", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_ultrawide_vista", name: "Ultrawide Vista", code: "UV", color: "#2980B9", concept: "ultrawide", shortDescription: "Wide field without stretch", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_hd_4k", name: "4K HD", code: "4K", color: "#F39C12", concept: "hd4k", shortDescription: "AI clarity enhancement", status: "full", creditCost: 0, tier: "ai" },
  { id: "lens_farreach", name: "FarReach", code: "FR", color: "#E67E22", concept: "farreach", shortDescription: "AI computational zoom", status: "full", creditCost: 0, tier: "ai" },
  { id: "lens_windows_paint", name: "Windows Paint", code: "WP", color: "#FF6B9D", concept: "windowspaint", shortDescription: "Flat colour cartoon outline", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_mirror", name: "Mirror", code: "MI", color: "#7EC8E3", concept: "mirror", shortDescription: "Repeated mirrored sections", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_crown", name: "Crown", code: "CR", color: "#FFD700", concept: "crown", shortDescription: "On-device forehead crown", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_origami", name: "Origami", code: "OR", color: "#F5C6A5", concept: "origami", shortDescription: "AI paper-fold art transform", status: "full", creditCost: 0, tier: "ai" },
  { id: "lens_sketch", name: "Sketch", code: "SK", color: "#95A5A6", concept: "sketch", shortDescription: "Pencil sketch outline", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_vintage_halation", name: "Vintage Halation", code: "VH", color: "#E8A87C", concept: "vintagehalation", shortDescription: "Warm film with red-orange halation", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_thunder_eyes", name: "Thunder Eyes", code: "TE", color: "#5DADE2", concept: "thundereyes", shortDescription: "Electric glow around the eyes", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_hair_shades", name: "Hair Shades", code: "HS", color: "#8E44AD", concept: "hairshades", shortDescription: "Stylized hair colour treatment", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_butterfly", name: "Butterfly", code: "BF", color: "#FF69B4", concept: "butterfly", shortDescription: "Butterflies around the subject", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_fairytale", name: "Fairytale", code: "FT", color: "#F8C8DC", concept: "fairytale", shortDescription: "Soft fairytale outline finish", status: "full", creditCost: 0, tier: "normal" },
  { id: "lens_crayon", name: "Crayon", code: "CY", color: "#F4A460", concept: "crayon", shortDescription: "Childlike crayon drawing look", status: "full", creditCost: 0, tier: "normal" },
];

export function getCameraLensById(id: string): CameraLensDef | undefined {
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
}

export function isAiLens(lens: CameraLensDef | null | undefined): boolean {
  return lens?.tier === "ai";
}

export const LENS_INFO: Record<string, string> = {
  lens_natural_frame: "Clean baseline view with no optical distortion.",
  lens_windows_colour: "Clean modern digital colour treatment.",
  lens_colour_negative: "True RGB colour negative inversion.",
  lens_date_time: "Adds a centered date, time, or date + time stamp.",
  lens_snake_view: "Thermal-style heat colour mapping.",
  lens_retro_80s: "Synthwave sunset grade with neon character.",
  lens_microreveal: "AI macro detail enhancement for close subjects.",
  lens_miniature_shift: "Tilt-shift miniature with sharp horizontal band.",
  lens_architect_align: "Straightens vertical lines in architecture.",
  lens_dreamsoft: "Gentle overall softness.",
  lens_glowmist: "Soft luminous glow around highlights.",
  lens_starflare: "Star-shaped rays from bright highlights.",
  lens_prism_echo: "Chromatic prism colour shift.",
  lens_swirl_drift: "Gentle radial swirl distortion.",
  lens_vintage_grade: "Warm classic film grade.",
  lens_infraglow: "Infrared-style foliage and sky treatment.",
  lens_longglass: "Telephoto compression look.",
  lens_perspective_stretch: "Exaggerated perspective stretch.",
  lens_selective_focus: "Isolates the centre subject.",
  lens_portrait_bloom: "Soft background with subject emphasis.",
  lens_fisheye_orbit: "Strong radial fisheye curvature.",
  lens_ultrawide_vista: "Wide field of view without face stretch.",
  lens_hd_4k: "AI enhancement for cleaner detail and higher perceived image clarity.",
  lens_farreach: "AI computational zoom for distant subjects. Capture first, then enhance.",
  lens_windows_paint: "Flat colour and bold-outline cartoon treatment.",
  lens_mirror: "Creates repeated mirrored reflections. Choose 2–10 mirrors.",
  lens_crown: "Lightweight face-tracked gold crown placed on the forehead.",
  lens_origami: "AI origami paper-fold artistic transformation of the input.",
  lens_sketch: "Pencil-style sketch outline from the input image.",
  lens_vintage_halation: "Warm vintage film with red-orange halation bloom, grain, and vignette.",
  lens_thunder_eyes: "Electric cyan glow focused around the eyes.",
  lens_hair_shades: "Stylized hair colour while preserving face and background.",
  lens_butterfly: "Butterflies near the hair and around the subject.",
  lens_fairytale: "Soft pastel fairytale grade with gentle outline.",
  lens_crayon: "Posterized crayon strokes, bold outlines, and paper texture.",
};

export const LENS_ASPECT_OPTIONS = [
  { id: "native", label: "Original" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
] as const;

/** Alias for opt-core and optical pipeline consumers */
export const LENS_ASPECTS = LENS_ASPECT_OPTIONS;

export type LensAspectId = (typeof LENS_ASPECT_OPTIONS)[number]["id"];

/** Exactly 10 lenses shown in the main Lens Studio camera carousel (order fixed). */
export const MAIN_CAMERA_LENS_IDS = [
  "lens_crown",
  "lens_vintage_halation",
  "lens_colour_negative",
  "lens_thunder_eyes",
  "lens_retro_80s",
  "lens_hd_4k",
  "lens_hair_shades",
  "lens_butterfly",
  "lens_fairytale",
  "lens_crayon",
] as const;

export function getMainCameraCarousel(): CameraLensDef[] {
  const out: CameraLensDef[] = [];
  for (const id of MAIN_CAMERA_LENS_IDS) {
    const lens = getCameraLensById(id);
    if (lens) out.push(lens);
  }
  return out;
}
