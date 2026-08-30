/**
 * Server-authoritative Circle Add prompt resolution.
 * Frontend sends assetId only; catalog backendPrompt + variationProfile are the source of truth.
 * DOES NOT affect Circle Remove.
 */
import {
  findAddAsset,
  buildAddPrompt,
  resolveAssetVariation,
  type ResolvedVariation,
} from "@/lib/circle-edit/add-assets";

export type CircleAddResolved = {
  prompt: string;
  negativePrompt: string;
  assetId: string | null;
  assetName: string | null;
  creditCost: number;
  /** Server-chosen seed for this generation (variation + optional fal seed). */
  seed: number | null;
  variationStyle: string | null;
  variationColor: string | null;
};

export function resolveCircleAddPrompt(opts: {
  circleAssetId?: string | null;
  clientPrompt?: string | null;
  /** Optional client-supplied seed for reproducibility; otherwise server picks one. */
  seed?: number | null;
}): CircleAddResolved {
  const id = (opts.circleAssetId || "").trim();

  if (id) {
    const asset = findAddAsset(id);
    if (!asset) {
      throw new Error(`Unknown Circle Add asset: ${id}. Select a valid object from the gallery.`);
    }
    let userDetail = "";
    const client = (opts.clientPrompt || "").trim();
    const marker = "Additional detail from user:";
    const idx = client.indexOf(marker);
    if (idx >= 0) userDetail = client.slice(idx + marker.length).trim();

    const variation: ResolvedVariation = resolveAssetVariation(asset, opts.seed);
    const prompt = buildAddPrompt({ asset, userDetail, variation });

    if (process.env.NODE_ENV !== "production") {
      console.log("[CIRCLE ADD] serverAssetResolved", {
        assetId: asset.id,
        assetName: asset.name,
        creditCost: asset.creditCost,
        seed: variation.seed,
        variationStyle: variation.style,
        variationColor: variation.color,
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
    };
  }

  const detail = (opts.clientPrompt || "").trim();
  if (!detail) {
    throw new Error("Circle Add requires a selected object or a description.");
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
  };
}
