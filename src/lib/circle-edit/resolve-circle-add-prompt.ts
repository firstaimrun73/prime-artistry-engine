/**
 * Server-authoritative Circle Add prompt resolution.
 * Frontend sends assetId + factor selection IDs only.
 * DOES NOT affect Circle Remove.
 */
import {
  findAddAsset,
  buildAddPrompt,
  resolveAssetVariation,
  resolveFactorPromptLines,
  type ResolvedVariation,
} from "@/lib/circle-edit/add-assets";

export type CircleAddResolved = {
  prompt: string;
  negativePrompt: string;
  assetId: string | null;
  assetName: string | null;
  creditCost: number;
  seed: number | null;
  variationStyle: string | null;
  variationColor: string | null;
  factorSelection: Record<string, string>;
  factorPromptLines: string[];
};

export function resolveCircleAddPrompt(opts: {
  circleAssetId?: string | null;
  clientPrompt?: string | null;
  seed?: number | null;
  /** factorId → optionId from client; prompts resolved server-side */
  factorSelection?: Record<string, string> | null;
}): CircleAddResolved {
  const id = (opts.circleAssetId || "").trim();
  const factorSelection = sanitizeFactorSelection(opts.factorSelection);

  if (id) {
    const asset = findAddAsset(id);
    if (!asset) {
      throw new Error(`Unknown Circle Add asset: ${id}. Select a valid object from the gallery.`);
    }
    const validatedFactors = validateFactorsForAsset(asset.id, factorSelection);
    const variation: ResolvedVariation = resolveAssetVariation(asset, opts.seed);
    const factorPromptLines = resolveFactorPromptLines(asset, validatedFactors);
    const prompt = buildAddPrompt({
      asset,
      userDetail: "",
      variation,
      factorSelection: validatedFactors,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[CIRCLE ADD] serverAssetResolved", {
        assetId: asset.id,
        assetName: asset.name,
        creditCost: asset.creditCost,
        seed: variation.seed,
        factors: validatedFactors,
        factorPromptLines,
        promptLength: prompt.length,
        promptHead: prompt.slice(0, 160),
      });
    }

    return {
      prompt,
      negativePrompt: asset.negativePrompt,
      assetId: asset.id,
      assetName: asset.name,
      creditCost: asset.creditCost,
      seed: variation.seed,
      variationStyle: variation.style,
      variationColor: variation.color,
      factorSelection: validatedFactors,
      factorPromptLines,
    };
  }

  const detail = (opts.clientPrompt || "").trim();
  if (!detail || detail === "circle-add") {
    throw new Error("Circle Add requires a selected object from the catalog.");
  }
  return {
    prompt: buildAddPrompt({ asset: null, userDetail: detail }),
    negativePrompt:
      "extra objects, changed person, changed architecture, scene regeneration, artifacts",
    assetId: null,
    assetName: null,
    creditCost: 0,
    seed: null,
    variationStyle: null,
    variationColor: null,
    factorSelection: {},
    factorPromptLines: [],
  };
}

function sanitizeFactorSelection(
  raw?: Record<string, string> | null,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    const key = k.trim().slice(0, 40);
    const val = v.trim().slice(0, 40);
    if (key && val) out[key] = val;
  }
  return out;
}

function validateFactorsForAsset(
  assetId: string,
  selection: Record<string, string>,
): Record<string, string> {
  const asset = findAddAsset(assetId);
  if (!asset) return {};
  const out: Record<string, string> = {};
  const factors = asset.factors ?? [];
  for (const factor of factors) {
    const optId = selection[factor.id];
    if (!optId) continue;
    if (factor.options.some((o) => o.id === optId)) {
      out[factor.id] = optId;
    }
  }
  const motion = selection["motion2ai"];
  if (motion && asset.motionModes?.includes(motion as never)) {
    out["motion2ai"] = motion;
  }
  return out;
}
