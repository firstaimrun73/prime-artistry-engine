/**
 * Server-side Circle 2edit charge + entitlement helpers.
 * Imported by generate.functions — never trust client credit totals.
 */
import { isFreePlan } from "@/lib/policy";
import { estimateCircleAddCredits, CIRCLE_REMOVE_CREDITS } from "@/lib/circle-edit/credits";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";

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
  circleInstant?: boolean;
  maskImageUrl?: string;
  circleAssetId?: string;
  sourceWidth?: number;
  sourceHeight?: number;
}): number | null {
  if (!data.maskImageUrl) return null;
  if (data.circleInstant === true) return CIRCLE_REMOVE_CREDITS;
  if (data.circleInstant === false) {
    const assetCredits = getAssetCreditCost(data.circleAssetId);
    return estimateCircleAddCredits({
      sourceWidth: data.sourceWidth,
      sourceHeight: data.sourceHeight,
      assetCreditCost: assetCredits,
    }).totalCredits;
  }
  return null;
}
