/**
 * Global bottom-nav priority for all countries:
 * Studio → Pricing → Discover → Maluto → Profile
 * "Discover" is the home feed (/) with a compass icon — never labeled Home.
 */

export type NavTabId = "discover" | "studio" | "maluto" | "pricing" | "profile";

export function bottomNavOrder(): NavTabId[] {
  return ["studio", "pricing", "discover", "maluto", "profile"];
}
