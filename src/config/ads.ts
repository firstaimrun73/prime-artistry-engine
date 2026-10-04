/**
 * Compile-time ad config. Third-party scripts (AdSense/Monetag) are disabled.
 * Only static in-page banners from ad_settings.banners are used.
 */
export const ADS_CONFIG = {
  publisherId: "",
  enabled: true,
  placements: {
    topBanner: false,
    leftSidebar: false,
    rightSidebar: false,
    inContent: true,
    footer: false,
  },
  /** Hard-coded OFF routes — never show banners here. */
  excludedRoutes: [
    "/pricing",
    "/checkout",
    "/auth",
    "/login",
    "/signup",
    "/forgot",
    "/reset",
    "/settings",
    "/profile/subscription",
    "/payment-success",
    "/payment-failed",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname.startsWith(r));
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}
