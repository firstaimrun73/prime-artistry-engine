/**
 * Auto Edit credit policy — single total charge per successful job.
 * Analysis is NOT charged separately. NO_CHANGE = 0 credits.
 */

import {
  AUTO_EDIT_CREDIT_COST,
  AUTO_EDIT_CREDITS_BY_QUALITY,
  autoEditCreditCost,
  type AutoEditQuality,
} from "./constants";

export { AUTO_EDIT_CREDIT_COST, AUTO_EDIT_CREDITS_BY_QUALITY, autoEditCreditCost };
export type { AutoEditQuality };

export function estimateAutoEditCredits(quality: AutoEditQuality = "hd"): {
  total: number;
  quality: AutoEditQuality;
  note: string;
} {
  const total = autoEditCreditCost(quality);
  return {
    total,
    quality,
    note: `Auto Edit = one complete job (${total} credits for ${quality}). Analysis + edit are not charged separately.`,
  };
}
