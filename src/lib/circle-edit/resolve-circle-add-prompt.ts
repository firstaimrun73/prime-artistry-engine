/**
 * Server-authoritative Circle Add prompt resolution.
 * Never trust client-only prompt text for the object identity.
 * Catalog backendPrompt is the source of truth for WHAT is added.
 * DOES NOT affect Circle Remove.
 */
import { findAddAsset, buildAddPrompt } from "@/lib/circle-edit/add-assets";

export function resolveCircleAddPrompt(opts: {
  circleAssetId?: string | null;
  /** Optional free-text detail from client (not the object name alone). */
  clientPrompt?: string | null;
}): { prompt: string; assetId: string | null; assetName: string | null; creditCost: number } {
  const id = (opts.circleAssetId || "").trim();
  const asset = findAddAsset(id);
  if (!asset) {
    // Fallback: use client prompt if no asset (custom text add)
    const detail = (opts.clientPrompt || "").trim();
    if (!detail) {
      throw new Error("Circle Add requires a selected object or a description.");
    }
    return {
      prompt: buildAddPrompt({ asset: null, userDetail: detail }),
      assetId: null,
      assetName: null,
      creditCost: 0,
    };
  }

  // Extract optional user detail if client appended it
  let userDetail = "";
  const client = (opts.clientPrompt || "").trim();
  const marker = "Additional detail from user:";
  const idx = client.indexOf(marker);
  if (idx >= 0) {
    userDetail = client.slice(idx + marker.length).trim();
  }

  const prompt = buildAddPrompt({ asset, userDetail });
  return {
    prompt,
    assetId: asset.id,
    assetName: asset.name,
    creditCost: asset.creditCost,
  };
}
