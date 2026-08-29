/**
 * Server-authoritative Circle Add prompt resolution.
 * Frontend sends assetId only; catalog backendPrompt is the source of truth.
 * DOES NOT affect Circle Remove.
 */
import { findAddAsset, buildAddPrompt } from "@/lib/circle-edit/add-assets";

export function resolveCircleAddPrompt(opts: {
  circleAssetId?: string | null;
  clientPrompt?: string | null;
}): {
  prompt: string;
  negativePrompt: string;
  assetId: string | null;
  assetName: string | null;
  creditCost: number;
} {
  const id = (opts.circleAssetId || "").trim();

  // If client claimed an assetId, it MUST resolve — never fall back to generic.
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

    const prompt = buildAddPrompt({ asset, userDetail });
    if (process.env.NODE_ENV !== "production") {
      console.log("[CIRCLE ADD] serverAssetResolved", {
        assetId: asset.id,
        assetName: asset.name,
        creditCost: asset.creditCost,
        promptLength: prompt.length,
      });
    }
    return {
      prompt,
      negativePrompt: asset.negativePrompt,
      assetId: asset.id,
      assetName: asset.name,
      creditCost: asset.creditCost,
    };
  }

  // No assetId: custom text-only add (optional product path)
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
  };
}
