/**
 * MotioCreditPricingEngine — converts provider COGS → customer Motio2edit credits.
 *
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 * All knobs live in BillingConfig. Do not scatter fixed credit numbers in product code.
 */

import {
  DEFAULT_BILLING_CONFIG,
  type BillingConfig,
  type BillingProduct,
} from "./types";

export type CustomerCreditQuote = {
  customerCredits: number;
  providerCogsUsd: number;
  requiredRetailUsd: number;
  pricingVersion: string;
  appliedMinimum: boolean;
  breakdown: {
    providerCogsUsd: number;
    operatingReserveUsd: number;
    targetGrossMargin: number;
    minRealizedCreditUsd: number;
    roundingStep: number;
    rawCredits: number;
    roundedCredits: number;
    productMinimum: number;
  };
};

/**
 * Core conversion:
 *   requiredRetail = (providerCogs + reserve) / (1 - margin)
 *   credits = ceil(requiredRetail / minRealizedCredit / step) * step
 *   then enforce product minimum floor
 *
 * This is a SCAFFOLD formula. Values in DEFAULT_BILLING_CONFIG are not final.
 */
export function providerCogsToCustomerCredits(
  providerCogsUsd: number,
  product: BillingProduct,
  config: BillingConfig = DEFAULT_BILLING_CONFIG,
): CustomerCreditQuote {
  const cogs = Math.max(0, providerCogsUsd);
  const margin = Math.min(0.85, Math.max(0.05, config.targetGrossMargin));
  const reserve = Math.max(0, config.operatingReserveUsd);
  const minCredit = Math.max(0.001, config.minRealizedCreditUsd);
  const step = Math.max(1, config.roundingStep);

  const requiredRetailUsd = (cogs + reserve) / (1 - margin);
  const rawCredits = requiredRetailUsd / minCredit;
  const roundedCredits = Math.max(step, Math.ceil(rawCredits / step) * step);
  const productMinimum = config.productMinimumCredits[product] ?? 0;
  const appliedMinimum = roundedCredits < productMinimum;
  const customerCredits = appliedMinimum ? productMinimum : roundedCredits;

  return {
    customerCredits,
    providerCogsUsd: +cogs.toFixed(6),
    requiredRetailUsd: +requiredRetailUsd.toFixed(6),
    pricingVersion: config.pricingVersion,
    appliedMinimum,
    breakdown: {
      providerCogsUsd: +cogs.toFixed(6),
      operatingReserveUsd: reserve,
      targetGrossMargin: margin,
      minRealizedCreditUsd: minCredit,
      roundingStep: step,
      rawCredits: +rawCredits.toFixed(4),
      roundedCredits,
      productMinimum,
    },
  };
}
