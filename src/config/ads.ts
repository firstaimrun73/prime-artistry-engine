/**
 * Single controlled Direct Link ad configuration.
 * ONE destination only. No popups, vignettes, page-push, or notification ads.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

export const ADS_CONFIG = {
  /** Compile-time kill switch. When false, no ad UI or scripts. */
  enabled: true,
  /**
   * Routes where ads must never appear.
   * Studios (except full /editor canvas), history, profile/dashboard may show
   * tasteful static Direct Link cards for free users only.
   */
  excludedRoutes: [
    "/editor",
    "/login",
    "/auth",
    "/checkout",
    "/payment-success",
    "/payment-failed",
    "/pricing",
    "/billing",
    "/settings",
    "/reset-password",
    "/admin",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Map UI placement ids to admin placement keys (home | history | features | pricing). */
export function adPlacementCategory(placement: string): "home" | "history" | "features" | "pricing" | null {
  const p = placement.toLowerCase();
  if (p.startsWith("home") || p.startsWith("workspace") || p.startsWith("studio") || p.startsWith("profile") || p.startsWith("dashboard")) {
    return "home";
  }
  if (p.startsWith("history")) return "history";
  if (p.startsWith("feature")) return "features";
  if (p.startsWith("pricing")) return "pricing";
  return null;
}
