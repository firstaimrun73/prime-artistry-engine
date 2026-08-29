/**
 * Server-authoritative Circle Add asset pricing from persisted catalog creditCost.
 */
import { ADD_ASSETS, findAddAsset, type CircleAddAsset } from "@/lib/circle-edit/add-assets";

export const FREE_CIRCLE_ADD_ASSET_IDS = ADD_ASSETS.filter((a) => a.isFree || a.creditCost === 0).map(
  (a) => a.id,
);

const DEFAULT_PAID = 15;

export function getAssetCreditCost(assetId: string | null | undefined): number {
  if (!assetId) return 0;
  const a = findAddAsset(assetId);
  if (!a) return DEFAULT_PAID;
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
