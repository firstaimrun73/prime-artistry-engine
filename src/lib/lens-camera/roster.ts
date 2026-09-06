/**
 * Motio2edit Lens Editor — camera product roster.
 * User-facing names only. Internal IDs never shown in UI.
 * All 20 lenses are fully implemented via client optical engine (camera capture free).
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
  concept: LensOpticalConcept;
  shortDescription: string;
  status: LensImplementationStatus;
  /** Camera capture path is always free (0). Reserved for optional future AI paths. */
  creditCost: number;
};

/** Camera software path: always free. Hard ceiling if any AI path is used later. */
export const LENS_CAMERA_CREDITS = 0 as const;
export const LENS_AI_MAX_CREDITS = 25 as const;
/** @deprecated use LENS_CAMERA_CREDITS — camera path is free */
export const LENS_GENERATION_CREDITS = 0 as const;

export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  { id: "lens_widevista", name: "Widevista", concept: "wide-angle", shortDescription: "Genuine wide-angle field of view", status: "full", creditCost: 0 },
  { id: "lens_ultrawide_horizon", name: "Ultrawide Horizon", concept: "ultra-wide", shortDescription: "Expanded horizon without stretch", status: "full", creditCost: 0 },
  { id: "lens_fisheye_orbit", name: "Fisheye Orbit", concept: "fisheye", shortDescription: "Circular fisheye character", status: "full", creditCost: 0 },
  { id: "lens_natural_frame", name: "Natural Frame", concept: "standard", shortDescription: "Natural standard perspective", status: "full", creditCost: 0 },
  { id: "lens_portrait_bloom", name: "Portrait Bloom", concept: "portrait-prime", shortDescription: "Portrait prime with soft separation", status: "full", creditCost: 0 },
  { id: "lens_cinematic_compress", name: "Cinematic Compress", concept: "telephoto", shortDescription: "Telephoto compression look", status: "full", creditCost: 0 },
  { id: "lens_farreach", name: "FarReach", concept: "super-telephoto", shortDescription: "Long-reach compression", status: "full", creditCost: 0 },
  { id: "lens_microreveal", name: "MicroReveal", concept: "macro", shortDescription: "Macro close-up detail", status: "full", creditCost: 0 },
  { id: "lens_miniature_shift", name: "Miniature Shift", concept: "tilt-shift", shortDescription: "Tilt-shift miniature effect", status: "full", creditCost: 0 },
  { id: "lens_architect_align", name: "Architect Align", concept: "perspective-correction", shortDescription: "Corrected architectural lines", status: "full", creditCost: 0 },
  { id: "lens_dreamsoft", name: "DreamSoft", concept: "soft-focus", shortDescription: "Soft-focus optical bloom", status: "full", creditCost: 0 },
  { id: "lens_glowmist", name: "GlowMist", concept: "diffusion", shortDescription: "Diffusion glow", status: "full", creditCost: 0 },
  { id: "lens_starflare", name: "Starflare", concept: "diffraction", shortDescription: "Star diffraction highlights", status: "full", creditCost: 0 },
  { id: "lens_prism_echo", name: "Prism Echo", concept: "prism", shortDescription: "Refractive prism edges", status: "full", creditCost: 0 },
  { id: "lens_swirl_depth", name: "Swirl Depth", concept: "swirly-bokeh", shortDescription: "Swirly background bokeh", status: "full", creditCost: 0 },
  { id: "lens_vintage_halation", name: "Vintage Halation", concept: "vintage", shortDescription: "Vintage optical halation", status: "full", creditCost: 0 },
  { id: "lens_infraglow", name: "InfraGlow", concept: "infrared", shortDescription: "Infrared photographic look", status: "full", creditCost: 0 },
  { id: "lens_longglass_detail", name: "LongGlass Detail", concept: "long-glass", shortDescription: "Long-glass edge detail", status: "full", creditCost: 0 },
  { id: "lens_perspective_stretch", name: "Perspective Stretch", concept: "strong-wide-perspective", shortDescription: "Strong wide perspective", status: "full", creditCost: 0 },
  { id: "lens_selective_focus", name: "Selective Focus", concept: "selective-focus", shortDescription: "Selective focus plane", status: "full", creditCost: 0 },
];

export function getDefaultCameraLens(): CameraLensDef {
  return CAMERA_LENS_ROSTER[0];
}

export function getCameraLensById(id: string | null | undefined): CameraLensDef | undefined {
  if (!id) return undefined;
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
}
