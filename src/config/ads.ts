/**
 * EMERGENCY: all advertising is OFF.
 * ADS_CONFIG.enabled must stay false until product re-enables ads deliberately.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;
export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const ADS_CONFIG = {
  /** HARD OFF — no scripts, no sponsored UI. */
  enabled: false,
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
    "/",
    "/studio",
    "/dashboard",
    "/history",
    "/profile",
    "/features",
    "/faq",
    "/support",
  ],
} as const;

export function isAdRouteAllowed(_pathname: string): boolean {
  return false;
}

export function adPlacementCategory(
  _placement: string,
): "home" | "history" | "features" | "pricing" | null {
  return null;
}
