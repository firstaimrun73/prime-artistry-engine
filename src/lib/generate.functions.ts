/**
 * Generation + plan server functions.
 * Restored minimal export surface so Vite can resolve generateMedia.
 * Full implementation path mirrors last known-good production (c9bfbc14).
 */
export { completeCheckout } from "@/lib/checkout.functions";
export {
  generateMedia,
  getMyPlan,
} from "@/lib/generate.functions.impl";
