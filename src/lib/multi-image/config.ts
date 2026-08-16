import { getPlanLimits, isMultiImageLocked, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
import type {
  MultiImageEligibility,
  MultiImageModelOption,
  MultiImageOutputCount,
} from "./types";

export { MULTI_IMAGE_UPGRADE_MESSAGE };

/**
 * Models actually present in src/lib/fal-request.ts.
 * Do not list models that are not wired in this repository.
 */
export const MULTI_IMAGE_MODELS: MultiImageModelOption[] = [
  {
    id: "kontext-single",
    label: "Kontext (single image)",
    description: "fal-ai/flux-pro/kontext — one primary image, one output.",
    minInputs: 1,
    maxInputs: 1,
    maxOutputsSupported: 1,
    available: true,
  },
  {
    id: "kontext-multi",
    label: "Kontext Multi (references)",
    description:
      "fal-ai/flux-pro/kontext/max/multi — primary + reference image_urls, one output.",
    minInputs: 2,
    maxInputs: 10,
    maxOutputsSupported: 1,
    available: true,
  },
];

/** UI may offer these output counts; execution enforces model.maxOutputsSupported. */
export const MULTI_IMAGE_OUTPUT_OPTIONS: {
  count: MultiImageOutputCount;
  label: string;
  /** True only when at least one available model can produce this many */
  supportedToday: boolean;
}[] = [
  { count: 1, label: "1 output", supportedToday: true },
  { count: 2, label: "2 outputs", supportedToday: false },
  { count: 3, label: "3 outputs", supportedToday: false },
  { count: 4, label: "4 outputs", supportedToday: false },
];

export function getMultiImageEligibility(
  plan: string | undefined | null,
  isAdmin = false,
): MultiImageEligibility {
  if (isAdmin) {
    return { allowed: true, maxImages: 10 };
  }
  if (isMultiImageLocked(plan, false)) {
    return {
      allowed: false,
      maxImages: 1,
      reason: MULTI_IMAGE_UPGRADE_MESSAGE,
    };
  }
  const maxImages = getPlanLimits(plan ?? "free").maxImages;
  return { allowed: maxImages > 1, maxImages };
}

export function pickDefaultModel(inputCount: number): MultiImageModelOption {
  if (inputCount >= 2) {
    return MULTI_IMAGE_MODELS.find((m) => m.id === "kontext-multi")!;
  }
  return MULTI_IMAGE_MODELS.find((m) => m.id === "kontext-single")!;
}

export function resolveExecutableOutputCount(
  requested: MultiImageOutputCount,
  modelId: string,
): MultiImageOutputCount {
  const model = MULTI_IMAGE_MODELS.find((m) => m.id === modelId);
  const cap = (model?.maxOutputsSupported ?? 1) as MultiImageOutputCount;
  return Math.min(requested, cap) as MultiImageOutputCount;
}

/** Product modes we intend to support; not all are executable yet. */
export const MULTI_IMAGE_PRODUCT_MODES = [
  { inputs: 2, outputs: 1, executableToday: true },
  { inputs: 3, outputs: 1, executableToday: true },
  { inputs: 4, outputs: 1, executableToday: true },
  { inputs: 5, outputs: 1, executableToday: true },
  { inputs: "N", outputs: 1, executableToday: true, note: "N limited by plan maxImages" },
  { inputs: 1, outputs: 2, executableToday: false, note: "Needs multi-output FAL support" },
  { inputs: 2, outputs: 2, executableToday: false, note: "Needs multi-output FAL support" },
  { inputs: "N", outputs: "M", executableToday: false, note: "Needs multi-output FAL support" },
] as const;
