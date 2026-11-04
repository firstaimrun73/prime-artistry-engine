/**
 * Unified sample lookup across primary R2 catalog + account-2 discovery assets.
 */
import { getR2SampleById, type R2Sample } from "@/lib/r2-catalog";
import {
  getAccount2PreloginSamples,
  getAccount2SignedInImages,
  getAccount2SignedInVideos,
} from "@/lib/r2-account2-samples";

export function resolveSampleById(id: string): R2Sample | null {
  const fromCatalog = getR2SampleById(id);
  if (fromCatalog) return fromCatalog;

  const pools = [
    ...getAccount2SignedInVideos(),
    ...getAccount2SignedInImages(),
    ...getAccount2PreloginSamples(),
  ];
  return pools.find((s) => s.id === id) ?? null;
}
