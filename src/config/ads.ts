/**
 * Advertising configuration.
 *
 * FORCED scripts (vignette / page-push / interstitial) stay OFF by default.
 * Opt-in "Get free credits" buttons may open DIRECT_LINK_URL when the user clicks.
 * Never grant Motio2edit credits from a client click alone.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;
export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const ADS_CONFIG = {
  /** Forced ad scripts — keep false until deliberate SEO/UX re-enable. */
  enabled: false,
  /** User-initiated free-credit partner buttons (plain link, ad-block safe). */
  optInFreeCreditCta: true,
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

export function isAdRouteAllowed(_pathname: string): boolean {
  return ADS_CONFIG.enabled === true;
}

export function adPlacementCategory(
  _placement: string,
): "home" | "history" | "features" | "pricing" | null {
  if (!ADS_CONFIG.enabled) return null;
  return null;
}

export function showOptInFreeCreditCta(): boolean {
  return ADS_CONFIG.optInFreeCreditCta === true;
}
