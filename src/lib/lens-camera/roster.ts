/**
 * Motio2edit original lens names — premium optical character, no brand trademarks.
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
  { id: "lens_widevista", name: "VistaWide", concept: "wide-angle", shortDescription: "Open wide field", status: "full", creditCost: 0 },
  { id: "lens_ultrawide_horizon", name: "HorizonX", concept: "ultra-wide", shortDescription: "Ultra-wide scene", status: "full", creditCost: 0 },
  { id: "lens_fisheye_orbit", name: "OrbEye", concept: "fisheye", shortDescription: "Full circular eye", status: "full", creditCost: 0 },
  { id: "lens_natural_frame", name: "TrueTone", concept: "standard", shortDescription: "Clean natural clarity", status: "full", creditCost: 0 },
  { id: "lens_portrait_bloom", name: "SoftPrime", concept: "portrait-prime", shortDescription: "Portrait soft depth", status: "full", creditCost: 0 },
  { id: "lens_cinematic_compress", name: "CineFrame", concept: "telephoto", shortDescription: "Cinematic grade", status: "full", creditCost: 0 },
  { id: "lens_farreach", name: "FarGlass", concept: "super-telephoto", shortDescription: "Long reach zoom", status: "full", creditCost: 0 },
  { id: "lens_microreveal", name: "MicroPeak", concept: "macro", shortDescription: "Macro detail peak", status: "full", creditCost: 0 },
  { id: "lens_miniature_shift", name: "MiniWorld", concept: "tilt-shift", shortDescription: "Miniature world", status: "full", creditCost: 0 },
  { id: "lens_architect_align", name: "LineTrue", concept: "perspective-correction", shortDescription: "Straight architecture", status: "full", creditCost: 0 },
  { id: "lens_dreamsoft", name: "NightLift", concept: "soft-focus", shortDescription: "Brighten dark scenes", status: "full", creditCost: 0 },
  { id: "lens_glowmist", name: "MistGlow", concept: "diffusion", shortDescription: "Soft diffusion light", status: "full", creditCost: 0 },
  { id: "lens_starflare", name: "StarBloom", concept: "diffraction", shortDescription: "Highlight star bloom", status: "full", creditCost: 0 },
  { id: "lens_prism_echo", name: "PrismEdge", concept: "prism", shortDescription: "Prism edge shift", status: "full", creditCost: 0 },
  { id: "lens_swirl_depth", name: "SwirlBokeh", concept: "swirly-bokeh", shortDescription: "Swirling depth blur", status: "full", creditCost: 0 },
  { id: "lens_vintage_halation", name: "RetroWarm", concept: "vintage", shortDescription: "Warm retro film", status: "full", creditCost: 0 },
  { id: "lens_infraglow", name: "InfraTone", concept: "infrared", shortDescription: "Infrared color map", status: "full", creditCost: 0 },
  { id: "lens_longglass_detail", name: "CrystalHQ", concept: "long-glass", shortDescription: "HQ sharp clean", status: "full", creditCost: 0 },
  { id: "lens_perspective_stretch", name: "DeepWide", concept: "strong-wide-perspective", shortDescription: "Deep wide stretch", status: "full", creditCost: 0 },
  { id: "lens_selective_focus", name: "FocusBand", concept: "selective-focus", shortDescription: "Selective focus band", status: "full", creditCost: 0 },
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
