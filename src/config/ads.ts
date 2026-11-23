/**
 * Ad configuration — revenue without wrecking UX/SEO.
 *
 * - Static Direct Link / multitags cards: ON for free signed-in users on allowed routes
 * - Vignette / In-Page Push scripts: OFF by default
 * - Never on pricing, auth, checkout, settings, admin, editor canvas
 * - Never grant Motio2edit credits from a client click alone
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;

/** Display name for sponsor link cards (not a credit promise). */
export const SPONSOR_DISPLAY_NAME = "Motio Partner Network" as const;
export const SPONSOR_TAGLINE = "Explore partner offers · opens in a new tab" as const;

export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

/** Partner zone script (independent of monthly spin). */
export const PARTNER_ZONE_SCRIPT_SRC = "https://quge5.com/88/tag.min.js" as const;
export const PARTNER_ZONE_ID = "314581" as const;

export const ADS_CONFIG = {
  enabled: true,
  vignetteEnabled: false,
  pagePushEnabled: false,
  optInFreeCreditCta: true,
  partnerZoneEnabled: true,
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
    p.startsWith("discover")
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
