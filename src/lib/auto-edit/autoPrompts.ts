/**
 * Hidden Auto Edit instruction catalog (server/internal use only).
 * Never shown in the UI prompt bar — selected programmatically from analysis.
 */

import type { AutoEditOperationId } from "./operations";

export type AutoPromptEntry = {
  id: AutoEditOperationId | "DEFAULT_POLISH";
  /** When analysis signals match these tags, this entry is a candidate */
  matchTags: string[];
  /** Internal generation instruction */
  instruction: string;
  priority: number;
};

/**
 * Pre-defined internal prompts applied by Motio2Auto — not user-authored.
 */
export const AUTO_PROMPTS: AutoPromptEntry[] = [
  {
    id: "OLD_PHOTO_RESTORATION",
    matchTags: ["old_photo", "damage", "fading", "scratches"],
    priority: 100,
    instruction:
      "Restore this old photograph: repair scratches, tears, stains, dust and fading; recover natural detail. Keep original composition and subjects intact. Preserve exact face identity when people are present.",
  },
  {
    id: "PHOTO_RESTORATION",
    matchTags: ["damage", "scratches", "dust"],
    priority: 95,
    instruction:
      "Restore this photo: repair scratches, dust, stains and damage; improve clarity while keeping the original look and subjects.",
  },
  {
    id: "DEBLUR",
    matchTags: ["blur", "motion_blur", "defocus"],
    priority: 90,
    instruction:
      "Deblur and unblur this image, recover sharp edges and fine detail from motion or focus blur, enhance clarity and detail.",
  },
  {
    id: "NOISE_REDUCTION",
    matchTags: ["noise"],
    priority: 85,
    instruction:
      "Denoise this image: remove noise and grain while preserving detail, edges and natural texture. Enhance clarity carefully.",
  },
  {
    id: "COMPRESSION_ARTIFACT_REDUCTION",
    matchTags: ["compression", "compression_artifacts", "pixelation"],
    priority: 80,
    instruction:
      "Reduce compression artifacts and blockiness, recover cleaner detail and edges while preserving the original content.",
  },
  {
    id: "EXPOSURE_CORRECTION",
    matchTags: ["underexposed", "overexposed", "uneven_lighting"],
    priority: 75,
    instruction:
      "Correct exposure for a natural well-balanced result without changing subject identity or composition.",
  },
  {
    id: "FACE_DETAIL_RESTORATION",
    matchTags: ["face_quality"],
    priority: 60,
    instruction:
      "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age.",
  },
  {
    id: "IMAGE_ENHANCEMENT",
    matchTags: ["quality", "missing_detail"],
    priority: 40,
    instruction:
      "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition, subject and colors identical.",
  },
  {
    id: "UPSCALE",
    matchTags: ["low_resolution"],
    priority: 30,
    instruction:
      "Upscale and enhance resolution with natural detail recovery. Keep the subject, composition and colors identical.",
  },
  {
    id: "DEFAULT_POLISH",
    matchTags: [],
    priority: 10,
    instruction:
      "Apply professional photo polish: improve clarity, balance exposure and color, reduce mild noise while keeping the subject and composition identical.",
  },
];

export function instructionForOperationId(id: string): string | undefined {
  return AUTO_PROMPTS.find((p) => p.id === id)?.instruction;
}
