/**
 * Central ad configuration — static banner destinations only.
 * No AdSense, Monetag, vignette, popup, or push.
 * Audience: Free plan only (enforced in policy + useAdsVisible).
 */

/** Click destinations (not image URLs). */
export const BANNER_DESTINATIONS = [
  "https://omg10.com/4/11947054",
  "https://omg10.com/4/11947056",
] as const;

export const ADS_CONFIG = {
  /** Master compile-time switch. Admin settings.ads.enabled also required. */
  enabled: true,
  destinations: BANNER_DESTINATIONS,
  placements: {
    topBanner: true,
    inContent: true,
    footer: true,
    sidebar: false,
  },
  /** Routes that must never show ads. */
  excludedRoutes: [
    "/editor",
    "/studio",
    "/music",
    "/chat",
    "/login",
    "/auth",
    "/checkout",
    "/pay",
    "/payment",
    "/pricing",
    "/security",
    "/profile/subscription",
    "/profile/billing",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/** Pick a destination by rotation index (stable per placement + page). */
export function bannerHref(seed: string): string {
  const list = ADS_CONFIG.destinations;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return list[h % list.length]!;
}
