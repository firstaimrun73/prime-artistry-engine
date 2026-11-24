/**
 * Ad configuration — Adsterra Direct Link + Monetag Multitag / Vignette.
 *
 * - Static Direct Link cards: free signed-in users on allowed routes
 * - Multitag zone 314190: gift icon + sponsor unlock
 * - Vignette: free users on allowed routes (not auth/checkout/admin/editor)
 * - Never grant Motio2edit credits from a client click alone
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;

/** Monetag MultiTag — owner zone */
export const MONETAG_MULTITAG_SRC = "https://quge5.com/88/tag.min.js" as const;
export const MONETAG_MULTITAG_ZONE = "314190" as const;

export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const ADS_CONFIG = {
  /** Master for static Direct Link / Earn cards. */
  enabled: true,
  /** Monetag vignette for eligible free users. */
  vignetteEnabled: true,
  /** In-page push — keep false (high friction). */
  pagePushEnabled: false,
  /** User-initiated free-credit partner buttons. */
  optInFreeCreditCta: true,
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
    p.startsWith("sample") ||
    p.startsWith("earn") ||
    p.startsWith("gift")
  ) {
    return "home";
  }
  if (p.startsWith("history")) return "history";
  if (p.startsWith("feature")) return "features";
  if (p.startsWith("pricing")) return "pricing";
  return null;
}

export function showOptInFreeCreditCta(): boolean {
  return ADS_CONFIG.optInFreeCreditCta === true;
}
