/**
 * Single controlled Direct Link ad configuration.
 * ONE destination only. No popups, vignettes, page-push, or notification ads.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

export const ADS_CONFIG = {
  /** Compile-time kill switch. When false, no ad UI or scripts. */
  enabled: true,
  /** Routes where ads must never appear. */
  excludedRoutes: [
    "/editor",
    "/studio/image",
    "/studio/video",
    "/studio/music",
    "/login",
    "/auth",
    "/checkout",
    "/payment-success",
    "/payment-failed",
    "/pricing",
    "/billing",
    "/settings",
    "/account",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname.startsWith(r));
}
