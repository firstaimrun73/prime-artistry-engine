/**
 * Server-authoritative Circle Add asset pricing overlay.
 * creditCost is fixed per asset id; client cannot override.
 * Free set is intentionally small (~12).
 */
import { ADD_ASSETS, findAddAsset, type AddAsset } from "@/lib/circle-edit/add-assets";

export const FREE_CIRCLE_ADD_ASSET_IDS = [
  "flower",
  "butterfly",
  "bird",
  "dog",
  "cat",
  "leaf",
  "balloon",
  "heart",
  "star",
  "cloud",
  "plant",
  "apple",
] as const;

const DEFAULT_PAID = 20;

const EXPLICIT: Record<string, number> = {
  flower: 0,
  butterfly: 0,
  bird: 0,
  dog: 0,
  cat: 0,
  leaf: 0,
  balloon: 0,
  heart: 0,
  star: 0,
  cloud: 0,
  plant: 0,
  apple: 0,
  python: 35,
  cobra: 35,
  viper: 35,
  boa: 35,
  anaconda: 55,
  rattlesnake: 35,
  car: 20,
  "sports-car": 40,
  motorcycle: 25,
  bicycle: 10,
  airplane: 45,
  helicopter: 45,
  dragon: 85,
  unicorn: 55,
  phoenix: 85,
  smartphone: 20,
  laptop: 25,
  camera: 25,
  drone: 40,
  robot: 40,
  "soccer-ball": 10,
  basketball: 10,
  rainbow: 20,
  waterfall: 40,
  pizza: 15,
  burger: 15,
  cake: 15,
};

export function getAssetCreditCost(assetId: string | null | undefined): number {
  if (!assetId) return 0;
  if (assetId in EXPLICIT) return EXPLICIT[assetId]!;
  const a = findAddAsset(assetId);
  if (!a) return DEFAULT_PAID;
  if ((FREE_CIRCLE_ADD_ASSET_IDS as readonly string[]).includes(a.id)) return 0;
  return DEFAULT_PAID;
}

export function isFreeCircleAsset(assetId: string | null | undefined): boolean {
  return getAssetCreditCost(assetId) === 0 && !!findAddAsset(assetId);
}

export function listPricedAssets(): Array<AddAsset & { creditCost: number; isFree: boolean }> {
  return ADD_ASSETS.map((a) => {
    const creditCost = getAssetCreditCost(a.id);
    return { ...a, creditCost, isFree: creditCost === 0 };
  });
}
