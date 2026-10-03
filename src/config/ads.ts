/**
 * Static banner destinations only. No popup, push, or third-party brand assets.
 * Audience: Free plan only (enforced in useAdsVisible).
 */

/** Approved Monetag direct link (server-side investigation: neutral banner only). */
export const BANNER_DESTINATIONS = ["https://omg10.com/4/11949338"] as const;

export const ADS_CONFIG = {
  enabled: true,
  destinations: BANNER_DESTINATIONS,
  /** Default copy for neutral Motio2edit banner */
  heading: "Free offers just for you",
  subline: "Explore curated deals — no credits or rewards for clicking.",
  buttonText: "Explore now",
  placements: {
    topBanner: true,
    inContent: true,
    footer: true,
    sidebar: false,
  },
  excludedRoutes: [
    "/login",
    "/auth",
    "/signup",
    "/checkout",
    "/pay",
    "/payment",
    "/pricing",
    "/security",
    "/chat",
    "/profile/subscription",
    "/profile/billing",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function bannerHref(_seed?: string): string {
  return ADS_CONFIG.destinations[0]!;
}
