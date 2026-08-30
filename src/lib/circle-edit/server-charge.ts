/**
 * Server-side Circle 2edit charge + entitlement helpers.
 * Never trust client credit totals. REMOVE path: CIRCLE_REMOVE_CREDITS only.
 */
import { isFreePlan } from "@/lib/policy";
import { estimateCircleAddCredits, CIRCLE_REMOVE_CREDITS } from "@/lib/circle-edit/credits";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import type { CircleAddCreditQuote } from "@/lib/circle-edit/credits";

export { CIRCLE_REMOVE_CREDITS };

export function assertCircleAddAllowed(opts: {
  isAdmin: boolean;
  plan: string | null | undefined;
  maskImageUrl?: string | null;
  circleInstant?: boolean | null;
}): void {
  if (opts.isAdmin) return;
  if (!opts.maskImageUrl) return;
  if (opts.circleInstant !== false) return;
  if (isFreePlan(opts.plan)) {
    throw new Error("Circle Add requires a paid plan. Upgrade to unlock object insertion.");
  }
}

export function resolveCircleCharge(data: {
  circleInstant?: boolean | null;
  maskImageUrl?: string | null;
  circleAssetId?: string | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
}): number | null {
  if (!data.maskImageUrl) return null;
  if (data.circleInstant === true) return CIRCLE_REMOVE_CREDITS;
  if (data.circleInstant === false) {
    const assetCredits = getAssetCreditCost(data.circleAssetId);
    return estimateCircleAddCredits({
      sourceWidth: data.sourceWidth ?? undefined,
      sourceHeight: data.sourceHeight ?? undefined,
      assetCreditCost: assetCredits,
    }).totalCredits;
  }
  return null;
}

export function quoteCircleAddCharge(opts: {
  circleAssetId: string;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
}): CircleAddCreditQuote & { assetId: string; assetName: string; assetCredits: number } {
  const asset = findAddAsset(opts.circleAssetId);
  if (!asset || !asset.isActive) {
    throw new Error(
      `Circle Add asset not found or disabled: "${opts.circleAssetId || "(empty)"}". Select a valid object.`,
    );
  }
  const assetCredits = getAssetCreditCost(asset.id);
  const quote = estimateCircleAddCredits({
    sourceWidth: opts.sourceWidth ?? undefined,
    sourceHeight: opts.sourceHeight ?? undefined,
    assetCreditCost: assetCredits,
  });
  return { ...quote, assetId: asset.id, assetName: asset.name, assetCredits };
}
