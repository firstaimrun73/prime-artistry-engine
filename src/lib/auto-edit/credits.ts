/**
 * Auto Edit credit policy.
 *
 * ONE Auto Edit job (vision analysis + plan + single fal.ai generation + watermark)
 * costs AUTO_EDIT_CREDIT_COST credits total — not per internal operation.
 */

import { AUTO_EDIT_CREDIT_COST } from "./constants";

export { AUTO_EDIT_CREDIT_COST };

export function estimateAutoEditCredits(_operationCount?: number): {
  total: number;
  operationCount: number;
  note: string;
} {
  return {
    total: AUTO_EDIT_CREDIT_COST,
    operationCount: 1,
    note: `Auto Edit = one complete job (${AUTO_EDIT_CREDIT_COST} credits). Analysis + planning + generation are not charged separately.`,
  };
}
