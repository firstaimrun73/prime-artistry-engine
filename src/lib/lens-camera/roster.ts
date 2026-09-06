/**
 * Motio2edit Lens Editor — camera product roster.
 * All 20 lenses are full client-side camera software (free, no AI).
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
  creditCost: number;
};

export const LENS_CAMERA_CREDITS = 0 as const;
export const LENS_AI_MAX_CREDITS = 25 as const;
export const LENS_GENERATION_CREDITS = 0 as const;

export const CAMERA_LENS_ROSTER: CameraLensDef[] = [
  { id: "lens_widevista", name: "Widevista", concept: "wide-angle", shortDescription: "Wider field of view", status: "full", creditCost: 0 },
  { id: "lens_ultrawide_horizon", name: "Ultrawide Horizon", concept: "ultra-wide", shortDescription: "Extra-wide scene coverage", status: "full", creditCost: 0 },
  { id: "lens_fisheye_orbit", name: "Fisheye Orbit", concept: "fisheye", shortDescription: "Circular fisheye look", status: "full", creditCost: 0 },
  { id: "lens_natural_frame", name: "Natural Frame", concept: "standard", shortDescription: "Clean clarity + less grain", status: "full", creditCost: 0 },
  { id: "lens_portrait_bloom", name: "Portrait Bloom", concept: "portrait-prime", shortDescription: "Soft background separation", status: "full", creditCost: 0 },
  { id: "lens_cinematic_compress", name: "Cinematic Compress", concept: "telephoto", shortDescription: "Movie color + mild zoom", status: "full", creditCost: 0 },
  { id: "lens_farreach", name: "FarReach", concept: "super-telephoto", shortDescription: "Strong zoom + detail", status: "full", creditCost: 0 },
  { id: "lens_microreveal", name: "MicroReveal", concept: "macro", shortDescription: "Close-up detail boost", status: "full", creditCost: 0 },
  { id: "lens_miniature_shift", name: "Miniature Shift", concept: "tilt-shift", shortDescription: "Tilt-shift miniature", status: "full", creditCost: 0 },
  { id: "lens_architect_align", name: "Architect Align", concept: "perspective-correction", shortDescription: "Straighter lines + clarity", status: "full", creditCost: 0 },
  { id: "lens_dreamsoft", name: "DreamSoft", concept: "soft-focus", shortDescription: "Soft glow + night lift", status: "full", creditCost: 0 },
  { id: "lens_glowmist", name: "GlowMist", concept: "diffusion", shortDescription: "Diffusion glow", status: "full", creditCost: 0 },
  { id: "lens_starflare", name: "Starflare", concept: "diffraction", shortDescription: "Highlight bloom", status: "full", creditCost: 0 },
  { id: "lens_prism_echo", name: "Prism Echo", concept: "prism", shortDescription: "Edge prism shift", status: "full", creditCost: 0 },
  { id: "lens_swirl_depth", name: "Swirl Depth", concept: "swirly-bokeh", shortDescription: "Swirly edge blur", status: "full", creditCost: 0 },
  { id: "lens_vintage_halation", name: "Vintage Halation", concept: "vintage", shortDescription: "Warm vintage glow", status: "full", creditCost: 0 },
  { id: "lens_infraglow", name: "InfraGlow", concept: "infrared", shortDescription: "Infrared-style tones", status: "full", creditCost: 0 },
  { id: "lens_longglass_detail", name: "LongGlass Detail", concept: "long-glass", shortDescription: "HQ sharpen + clean", status: "full", creditCost: 0 },
  { id: "lens_perspective_stretch", name: "Perspective Stretch", concept: "strong-wide-perspective", shortDescription: "Strong wide perspective", status: "full", creditCost: 0 },
  { id: "lens_selective_focus", name: "Selective Focus", concept: "selective-focus", shortDescription: "Focus band blur", status: "full", creditCost: 0 },
];

export function getDefaultCameraLens(): CameraLensDef {
  return CAMERA_LENS_ROSTER[0];
}

export function getCameraLensById(id: string | null | undefined): CameraLensDef | undefined {
  if (!id) return undefined;
  return CAMERA_LENS_ROSTER.find((l) => l.id === id);
}
