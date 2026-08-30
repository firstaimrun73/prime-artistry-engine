/**
 * Server-authoritative Circle Add asset pricing from persisted catalog creditCost.
 * Unknown / missing assetId returns 0 — callers must fail closed via preflight.
 */
import { ADD_ASSETS, findAddAsset, type CircleAddAsset } from "@/lib/circle-edit/add-assets";

export const FREE_CIRCLE_ADD_ASSET_IDS = ADD_ASSETS.filter((a) => a.isFree || a.creditCost === 0).map(
  (a) => a.id,
);

export function getAssetCreditCost(assetId: string | null | undefined): number {
  if (!assetId) return 0;
  const a = findAddAsset(assetId);
  if (!a || !a.isActive) return 0;
  if (a.isFree || a.creditCost === 0) return 0;
  return Math.max(5, Math.min(100, Math.round(a.creditCost)));
}

export function isFreeCircleAsset(assetId: string | null | undefined): boolean {
  return getAssetCreditCost(assetId) === 0 && !!findAddAsset(assetId);
}

export function listPricedAssets(): Array<CircleAddAsset & { creditCost: number; isFree: boolean }> {
  return ADD_ASSETS.map((a) => ({
    ...a,
    creditCost: getAssetCreditCost(a.id),
    isFree: a.isFree || a.creditCost === 0,
  }));
}
