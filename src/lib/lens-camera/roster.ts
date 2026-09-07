/**
 * Motio2edit Lens roster — canonical 20 names (Pass 10).
 * Badge: 2-letter code + hex color (no photo assets).
 * Free: creditCost always 0.
 */

export type LensOpticalConcept =
  | "wide-angle"
  | "ultra-wide"
  | "fisheye"
  | "standard"
  | "portrait-prime"
  | "telephoto"
  | "super-telephoto"
  | "macro"
  | "tilt-shift"
  | "perspective-correction"
  | "soft-focus"
  | "diffusion"
  | "diffraction"
  | "prism"
  | "swirly-bokeh"
  | "vintage"
  | "infrared"
  | "long-glass"
  | "strong-wide-perspective"
  | "selective-focus";

export type LensImplementationStatus = "full" | "preview-only" | "coming-soon";

export type CameraLensDef = {
  id: string;
  name: string;
  /** 2-letter badge code */
  code: string;
  /** Badge fill hex */
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
 * Canonical 20 — names match Pass 10 spec.
 * Mapping from prior internal names kept via stable `id` keys.
 */
export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  {
    id: "lens_widevista",
    name: "Widevista",
    code: "WV",
    color: "#3B82C4",
    concept: "wide-angle",
    shortDescription: "Wide field of view",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_ultrawide_horizon",
    name: "Ultrawide Horizon",
    code: "UH",
    color: "#2AA198",
    concept: "ultra-wide",
    shortDescription: "Ultra-wide horizon",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_fisheye_orbit",
    name: "Fisheye Orbit",
    code: "FO",
    color: "#8E44AD",
    concept: "fisheye",
    shortDescription: "Circular fisheye warp",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_natural_frame",
    name: "Natural Frame",
    code: "NF",
    color: "#6C757D",
    concept: "standard",
    shortDescription: "Clean natural clarity",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_portrait_bloom",
    name: "Portrait Bloom",
    code: "PB",
    color: "#D46A9F",
    concept: "portrait-prime",
    shortDescription: "Soft depth bloom",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_cinematic_compress",
    name: "Cinematic Compress",
    code: "CC",
    color: "#4C6B54",
    concept: "telephoto",
    shortDescription: "Telephoto compression",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_farreach",
    name: "FarReach",
    code: "FR",
    color: "#52796F",
    concept: "super-telephoto",
    shortDescription: "Long-reach crop",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_microreveal",
    name: "MicroReveal",
    code: "MC",
    color: "#B8860B",
    concept: "macro",
    shortDescription: "Macro detail peak",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_miniature_shift",
    name: "Miniature Shift",
    code: "MS",
    color: "#A0522D",
    concept: "tilt-shift",
    shortDescription: "Tilt-shift miniature",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_architect_align",
    name: "Architect Align",
    code: "AA",
    color: "#34495E",
    concept: "perspective-correction",
    shortDescription: "Straight lines",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_dreamsoft",
    name: "DreamSoft",
    code: "DR",
    color: "#C08497",
    concept: "soft-focus",
    shortDescription: "Soft dream focus",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_glowmist",
    name: "GlowMist",
    code: "GM",
    color: "#7D5BA6",
    concept: "diffusion",
    shortDescription: "Diffusion glow",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_starflare",
    name: "Starflare",
    code: "ST",
    color: "#D97742",
    concept: "diffraction",
    shortDescription: "Highlight star bloom",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_prism_echo",
    name: "Prism Echo",
    code: "PE",
    color: "#5DA9E9",
    concept: "prism",
    shortDescription: "Prism edge shift",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_swirl_depth",
    name: "Swirl Depth",
    code: "SW",
    color: "#6A0572",
    concept: "swirly-bokeh",
    shortDescription: "Swirling depth blur",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_vintage_halation",
    name: "Vintage Halation",
    code: "VH",
    color: "#8B5E3C",
    concept: "vintage",
    shortDescription: "Halation around light",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_infraglow",
    name: "InfraGlow",
    code: "IG",
    color: "#B33F62",
    concept: "infrared",
    shortDescription: "Infrared tone map",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_longglass_detail",
    name: "LongGlass Detail",
    code: "LG",
    color: "#3E5C76",
    concept: "long-glass",
    shortDescription: "Long-glass sharpness",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_perspective_stretch",
    name: "Perspective Stretch",
    code: "PS",
    color: "#4A6FA5",
    concept: "strong-wide-perspective",
    shortDescription: "Deep perspective stretch",
    status: "full",
    creditCost: 0,
  },
  {
    id: "lens_selective_focus",
    name: "Selective Focus",
    code: "SL",
    color: "#556B2F",
    concept: "selective-focus",
    shortDescription: "Focus band only",
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

/** Alias used by optical-engine */
export const LENS_ASPECTS = LENS_ASPECT_PRESETS;
