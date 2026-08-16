/**
 * Auto Edit operation catalog.
 * Internal prompts are implementation details — never primary UI.
 * Paths map to existing fal-request / generateMedia behavior.
 */

export type AutoEditOperationId =
  | "PHOTO_RESTORATION"
  | "OLD_PHOTO_RESTORATION"
  | "IMAGE_ENHANCEMENT"
  | "DEBLUR"
  | "NOISE_REDUCTION"
  | "COMPRESSION_ARTIFACT_REDUCTION"
  | "UPSCALE"
  | "EXPOSURE_CORRECTION"
  | "SHADOW_RECOVERY"
  | "HIGHLIGHT_RECOVERY"
  | "PORTRAIT_REPAIR"
  | "FACE_DETAIL_RESTORATION"
  | "BACKGROUND_CLEANUP";

/** How the op is routed through existing generateMedia / fal heuristics */
export type AutoEditExecutionPath =
  | "enhance" // enhancement-only style prompts → post-processing / deblur paths
  | "edit"; // kontext edit with strong preservation

export type AutoEditOperationDef = {
  id: AutoEditOperationId;
  title: string;
  description: string;
  /** Higher runs earlier (restoration before polish) */
  priority: number;
  risk: "low" | "medium" | "high";
  path: AutoEditExecutionPath;
  /** Internal instruction only */
  internalPrompt: string;
  /** Suggested strength for edit path */
  strength: number;
};

const PRESERVE =
  " Preserve the exact face identity, facial structure, pose, clothing, body proportions, composition, camera angle and background unless this step specifically targets the background. Do not redesign faces or invent a new person.";

export const AUTO_EDIT_OPERATIONS: Record<AutoEditOperationId, AutoEditOperationDef> = {
  OLD_PHOTO_RESTORATION: {
    id: "OLD_PHOTO_RESTORATION",
    title: "Old photo restoration",
    description: "Repair age damage, fading, scratches and dust",
    priority: 100,
    risk: "medium",
    path: "edit",
    strength: 0.55,
    internalPrompt:
      "Restore this old photograph: repair scratches, tears, stains, dust and fading; recover natural detail. Keep original composition and subjects intact." +
      PRESERVE,
  },
  PHOTO_RESTORATION: {
    id: "PHOTO_RESTORATION",
    title: "Photo restoration",
    description: "Repair damage and defects",
    priority: 95,
    risk: "medium",
    path: "edit",
    strength: 0.5,
    internalPrompt:
      "Restore this photo: repair scratches, dust, stains and damage; improve clarity while keeping the original look and subjects." +
      PRESERVE,
  },
  DEBLUR: {
    id: "DEBLUR",
    title: "Deblur",
    description: "Recover sharpness from blur",
    priority: 90,
    risk: "low",
    path: "enhance",
    strength: 0.5,
    internalPrompt:
      "Deblur and unblur this image, recover sharp edges and fine detail from motion or focus blur, enhance clarity and detail.",
  },
  NOISE_REDUCTION: {
    id: "NOISE_REDUCTION",
    title: "Noise reduction",
    description: "Reduce grain and sensor noise",
    priority: 85,
    risk: "low",
    path: "enhance",
    strength: 0.45,
    internalPrompt:
      "Denoise this image: remove noise and grain while preserving detail, edges and natural texture. Enhance clarity carefully.",
  },
  COMPRESSION_ARTIFACT_REDUCTION: {
    id: "COMPRESSION_ARTIFACT_REDUCTION",
    title: "Compression cleanup",
    description: "Reduce JPEG / compression artifacts",
    priority: 80,
    risk: "low",
    path: "enhance",
    strength: 0.45,
    internalPrompt:
      "Reduce compression artifacts and blockiness, recover cleaner detail and edges while preserving the original content. Enhance quality and clarity.",
  },
  EXPOSURE_CORRECTION: {
    id: "EXPOSURE_CORRECTION",
    title: "Exposure correction",
    description: "Balance overall exposure",
    priority: 75,
    risk: "low",
    path: "edit",
    strength: 0.4,
    internalPrompt:
      "Correct exposure for a natural well-balanced result: fix under or over exposure without changing subject identity or composition." +
      PRESERVE,
  },
  SHADOW_RECOVERY: {
    id: "SHADOW_RECOVERY",
    title: "Shadow recovery",
    description: "Lift crushed shadows",
    priority: 72,
    risk: "low",
    path: "edit",
    strength: 0.4,
    internalPrompt:
      "Recover shadow detail gently, lift dark areas naturally while keeping highlights controlled. Do not change subject identity." +
      PRESERVE,
  },
  HIGHLIGHT_RECOVERY: {
    id: "HIGHLIGHT_RECOVERY",
    title: "Highlight recovery",
    description: "Recover blown highlights",
    priority: 70,
    risk: "low",
    path: "edit",
    strength: 0.4,
    internalPrompt:
      "Recover highlight detail and reduce blown-out areas while keeping a natural look. Do not change subject identity." +
      PRESERVE,
  },
  PORTRAIT_REPAIR: {
    id: "PORTRAIT_REPAIR",
    title: "Portrait repair",
    description: "Natural portrait cleanup",
    priority: 65,
    risk: "high",
    path: "edit",
    strength: 0.35,
    internalPrompt:
      "Professional portrait repair: even skin tone, subtle blemish cleanup with realistic texture, balanced lighting. IDENTITY LOCK: same person, same face geometry, same age appearance." +
      PRESERVE,
  },
  FACE_DETAIL_RESTORATION: {
    id: "FACE_DETAIL_RESTORATION",
    title: "Face detail",
    description: "Sharpen facial detail safely",
    priority: 60,
    risk: "high",
    path: "edit",
    strength: 0.35,
    internalPrompt:
      "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age." +
      PRESERVE,
  },
  BACKGROUND_CLEANUP: {
    id: "BACKGROUND_CLEANUP",
    title: "Background cleanup",
    description: "Reduce background clutter",
    priority: 50,
    risk: "medium",
    path: "edit",
    strength: 0.55,
    internalPrompt:
      "Clean and simplify only the background: remove minor clutter and distractions. Keep the main subject pixel-identical with clean edges." +
      PRESERVE,
  },
  IMAGE_ENHANCEMENT: {
    id: "IMAGE_ENHANCEMENT",
    title: "Image enhancement",
    description: "Overall clarity and detail",
    priority: 40,
    risk: "low",
    path: "enhance",
    strength: 0.5,
    internalPrompt:
      "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition, subject and colors identical.",
  },
  UPSCALE: {
    id: "UPSCALE",
    title: "Upscale detail",
    description: "Resolution / detail recovery",
    priority: 30,
    risk: "low",
    path: "enhance",
    strength: 0.5,
    internalPrompt:
      "Upscale and enhance resolution with natural detail recovery, peak detail and HD clarity. Keep the subject, composition and colors identical.",
  },
};

export function getOperationDef(id: AutoEditOperationId): AutoEditOperationDef {
  return AUTO_EDIT_OPERATIONS[id];
}

export function sortOperationsByPriority(ids: AutoEditOperationId[]): AutoEditOperationId[] {
  return [...ids].sort(
    (a, b) => AUTO_EDIT_OPERATIONS[b].priority - AUTO_EDIT_OPERATIONS[a].priority,
  );
}
