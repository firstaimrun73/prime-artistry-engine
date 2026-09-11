/**
 * Motio2edit generation billing — public surface.
 *
 * ProviderCostCalculator  → actual fal/provider COGS
 * MotioCreditPricingEngine → customer Motio2edit credits (configurable)
 * Quote/Reservation        → server-authoritative charge lifecycle
 *
 * FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
 */

export * from "./types";
export * from "./provider-cost";
export * from "./customer-pricing";
export * from "./quote-service";
export * from "./lifecycle";
export * from "./product-quote";
export { quoteVideoGeneration } from "./video-quote";
export * from "./free-generation-entitlement";
