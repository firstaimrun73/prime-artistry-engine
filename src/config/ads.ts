/**
 * Advertising configuration — restored Multitag + Direct Link.
 *
 * MultiTag (zone 314190): loaded only on allowed routes / opt-in sponsor unlock.
 * Direct Link: static in-page cards for free users (user-initiated clicks only).
 * Vignette / In-Page Push: kept OFF — no forced popups or interstitials.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

/** Monetag MultiTag — owner-supplied zone. */
export const MONETAG_MULTITAG_SRC = "https://quge5.com/88/tag.min.js" as const;
export const MONETAG_MULTITAG_ZONE = "314190" as const;

/** Legacy aliases kept for older imports. */
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;
export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const ADS_CONFIG = {
  /** Master compile-time switch for in-page Direct Link + Multitag loaders. */
  enabled: true,
  /** Forced vignette / page-push — stay false. */
  forcedScripts: false,
  /** User-initiated partner CTA buttons. */
  optInFreeCreditCta: true,
  /** Sensitive routes: never load Multitag or show sponsored cards. */
  excludedRoutes: [
    "/editor",
    "/login",
    "/auth",
    "/checkout",
    "/payment-success",
    "/payment-failed",
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
  return !ADS_CONFIG.excludedRoutes.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}

export function adPlacementCategory(
  placement: string,
): "home" | "history" | "features" | "pricing" | null {
  if (!ADS_CONFIG.enabled) return null;
  const p = placement.toLowerCase();
  if (
    p.startsWith("home") ||
    p.startsWith("workspace") ||
    p.startsWith("studio") ||
    p.startsWith("profile") ||
    p.startsWith("dashboard") ||
    p.startsWith("result") ||
    p.startsWith("image")
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
