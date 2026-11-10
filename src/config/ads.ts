/**
 * Controlled ad configuration.
 * - Vignette + In-Page Push: Monetag zones (free signed-in users only, via components)
 * - Static Direct Link / multitags partner link for in-content placements
 * - Never on pricing, auth, checkout, settings, admin, full editor canvas
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

/** Monetag multitags / partner offer — same network destination used for "earn / partner" cards. */
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;

/** Official Monetag Vignette (publisher dashboard). */
export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;

/** Official Monetag In-Page Push. */
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const ADS_CONFIG = {
  enabled: true,
  /** Routes where ads must never appear (scripts + static cards). */
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
    "/security",
    "/sign-up",
    "/signup",
  ],
} as const;

export function isAdRouteAllowed(pathname: string): boolean {
  if (!ADS_CONFIG.enabled) return false;
  return !ADS_CONFIG.excludedRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function adPlacementCategory(
  placement: string,
): "home" | "history" | "features" | "pricing" | null {
  const p = placement.toLowerCase();
  if (
    p.startsWith("home") ||
    p.startsWith("workspace") ||
    p.startsWith("studio") ||
    p.startsWith("profile") ||
    p.startsWith("dashboard") ||
    p.startsWith("sample")
  ) {
    return "home";
  }
  if (p.startsWith("history")) return "history";
  if (p.startsWith("feature")) return "features";
  if (p.startsWith("pricing")) return "pricing";
  return null;
}
