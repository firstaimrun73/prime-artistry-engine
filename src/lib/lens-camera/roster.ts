/**
 * Motio2edit Lens Editor — camera product roster.
 * User-facing names only. Internal IDs never shown in UI.
 * Widevista is the first fully-specified lens; others are scaffolded.
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
  /** Internal id — never shown to users */
  id: string;
  name: string;
  concept: LensOpticalConcept;
  shortDescription: string;
  status: LensImplementationStatus;
  /** Fixed generation cost in credits */
  creditCost: number;
};

export const LENS_GENERATION_CREDITS = 15 as const;

/**
 * Canonical 20-lens roster for the camera product.
 * Order matches product spec.
 */
export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  {
    id: "lens_widevista",
    name: "Widevista",
    concept: "wide-angle",
    shortDescription: "Genuine wide-angle field of view",
    status: "full",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_ultrawide_horizon",
    name: "Ultrawide Horizon",
    concept: "ultra-wide",
    shortDescription: "Expanded horizon without stretch",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_fisheye_orbit",
    name: "Fisheye Orbit",
    concept: "fisheye",
    shortDescription: "Circular fisheye character",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_natural_frame",
    name: "Natural Frame",
    concept: "standard",
    shortDescription: "Natural standard perspective",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_portrait_bloom",
    name: "Portrait Bloom",
    concept: "portrait-prime",
    shortDescription: "Portrait prime with soft separation",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_cinematic_compress",
    name: "Cinematic Compress",
    concept: "telephoto",
    shortDescription: "Telephoto compression look",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_farreach",
    name: "FarReach",
    concept: "super-telephoto",
    shortDescription: "Long-reach compression",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_microreveal",
    name: "MicroReveal",
    concept: "macro",
    shortDescription: "Macro close-up detail",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_miniature_shift",
    name: "Miniature Shift",
    concept: "tilt-shift",
    shortDescription: "Tilt-shift miniature effect",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_architect_align",
    name: "Architect Align",
    concept: "perspective-correction",
    shortDescription: "Corrected architectural lines",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_dreamsoft",
    name: "DreamSoft",
    concept: "soft-focus",
    shortDescription: "Soft-focus optical bloom",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_glowmist",
    name: "GlowMist",
    concept: "diffusion",
    shortDescription: "Diffusion glow",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_starflare",
    name: "Starflare",
    concept: "diffraction",
    shortDescription: "Star diffraction highlights",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_prism_echo",
    name: "Prism Echo",
    concept: "prism",
    shortDescription: "Refractive prism edges",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_swirl_depth",
    name: "Swirl Depth",
    concept: "swirly-bokeh",
    shortDescription: "Swirly background bokeh",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_vintage_halation",
    name: "Vintage Halation",
    concept: "vintage",
    shortDescription: "Vintage optical halation",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_infraglow",
    name: "InfraGlow",
    concept: "infrared",
    shortDescription: "Infrared photographic look",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_longglass_detail",
    name: "LongGlass Detail",
    concept: "long-glass",
    shortDescription: "Long-glass edge detail",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_perspective_stretch",
    name: "Perspective Stretch",
    concept: "strong-wide-perspective",
    shortDescription: "Strong wide perspective",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
  {
    id: "lens_selective_focus",
    name: "Selective Focus",
    concept: "selective-focus",
    shortDescription: "Selective focus plane",
    status: "coming-soon",
    creditCost: LENS_GENERATION_CREDITS,
  },
];

export function getCameraLensById(id: string): CameraLensDef | undefined {
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
}

export function getDefaultCameraLens(): CameraLensDef {
  return CAMERA_LENS_ROSTER[0]!;
}
