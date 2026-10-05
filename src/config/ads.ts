/**
 * Single Direct Link monetization config.
 * ONE destination only — never open automatically; user must click.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

export const ADS_CONFIG = {
  /** Compile-time kill switch. Admin master switch still required at runtime. */
  enabled: true,
  /**
   * Third-party script publishers disabled. Kept empty so no AdSense/Monetag inject.
   */
  publisherId: "",
  placements: {
    topBanner: false,
    leftSidebar: false,
    rightSidebar: false,
    inContent: true,
    footer: true,
  },
  /** Routes where no in-page Direct Link ad is shown. */
  excludedRoutes: [
    "/auth",
    "/login",
    "/signup",
    "/checkout",
    "/pricing",
    "/payment-success",
    "/payment-failed",
    "/settings",
    "/profile/subscription",
    "/profile/top-up",
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
