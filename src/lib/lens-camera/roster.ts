/**
 * Motio2edit Lens roster — 20 on-device image lenses (upload only).
 * Free. Badge: code + color.
 */

export type LensOpticalConcept =
  | "deep-wide"
  | "360"
  | "ultra-wide"
  | "portrait"
  | "sketch"
  | "cinematic"
  | "night-vision"
  | "wide-angle"
  | "telephoto"
  | "macro"
  | "tilt-shift"
  | "diffusion"
  | "vintage"
  | "infrared"
  | "sharpen"
  | "prism"
  | "soft-focus"
  | "long-glass"
  | "selective-focus"
  | "perspective";

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
};

export const LENS_CAMERA_CREDITS = 0 as const;
export const LENS_AI_MAX_CREDITS = 0 as const;
export const LENS_GENERATION_CREDITS = 0 as const;

/**
 * 20 lenses — ids stable for deep-links; optics rebuilt for clear visible effect.
 * 1 Deep Wide · 2 360 · 3 Ultrawide · 4 Portrait · 5 Sketch · 6 Cine Sharp · 7 Night Blue
 */
export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  {
    id: "lens_perspective_stretch",
    name: "Deep Wide",
    code: "DW",
    color: "#4A6FA5",
    concept: "deep-wide",
    shortDescription: "Inside the photo",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_fisheye_orbit",
    name: "360 Orbit",
    code: "360",
    color: "#8E44AD",
    concept: "360",
    shortDescription: "Full 360 warp",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_ultrawide_horizon",
    name: "Ultrawide",
    code: "UW",
    color: "#2AA198",
    concept: "ultra-wide",
    shortDescription: "Expand the frame",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_portrait_bloom",
    name: "Portrait Close",
    code: "PC",
    color: "#D46A9F",
    concept: "portrait",
    shortDescription: "Closer soft depth",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_natural_frame",
    name: "Sketch Line",
    code: "SK",
    color: "#6C757D",
    concept: "sketch",
    shortDescription: "Outline only",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_cinematic_compress",
    name: "Cine Sharp",
    code: "CS",
    color: "#4C6B54",
    concept: "cinematic",
    shortDescription: "Bright cinematic",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_dreamsoft",
    name: "Night Blue",
    code: "NB",
    color: "#1B4F72",
    concept: "night-vision",
    shortDescription: "Dark-blue night",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_widevista",
    name: "Widevista",
    code: "WV",
    color: "#3B82C4",
    concept: "wide-angle",
    shortDescription: "Open wide field",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_farreach",
    name: "FarReach",
    code: "FR",
    color: "#52796F",
    concept: "telephoto",
    shortDescription: "Pull subject in",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_microreveal",
    name: "MicroReveal",
    code: "MC",
    color: "#B8860B",
    concept: "macro",
    shortDescription: "Macro detail",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_miniature_shift",
    name: "Mini Shift",
    code: "MS",
    color: "#A0522D",
    concept: "tilt-shift",
    shortDescription: "Miniature world",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_glowmist",
    name: "GlowMist",
    code: "GM",
    color: "#7D5BA6",
    concept: "diffusion",
    shortDescription: "Soft light glow",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_vintage_halation",
    name: "Vintage",
    code: "VH",
    color: "#8B5E3C",
    concept: "vintage",
    shortDescription: "Warm film glow",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_infraglow",
    name: "InfraGlow",
    code: "IG",
    color: "#B33F62",
    concept: "infrared",
    shortDescription: "Infrared tones",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_longglass_detail",
    name: "Crystal Sharp",
    code: "LG",
    color: "#3E5C76",
    concept: "sharpen",
    shortDescription: "Max clarity",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_prism_echo",
    name: "Prism Echo",
    code: "PE",
    color: "#5DA9E9",
    concept: "prism",
    shortDescription: "Edge color shift",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_swirl_depth",
    name: "Soft Bloom",
    code: "SB",
    color: "#6A0572",
    concept: "soft-focus",
    shortDescription: "Dream soft focus",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_architect_align",
    name: "Line True",
    code: "AA",
    color: "#34495E",
    concept: "perspective",
    shortDescription: "Straighten lines",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_starflare",
    name: "Starflare",
    code: "ST",
    color: "#D97742",
    concept: "diffusion",
    shortDescription: "Highlight bloom",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_selective_focus",
    name: "Focus Band",
    code: "SL",
    color: "#556B2F",
    concept: "selective-focus",
    shortDescription: "Center focus only",
    status: "full",
    creditCost: 0,
  },
];

export function getDefaultCameraLens(): CameraLensDef {
  return CAMERA_LENS_ROSTER[0];
}

export function getCameraLensById(id: string | null | undefined): CameraLensDef | undefined {
  if (!id) return undefined;
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
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
