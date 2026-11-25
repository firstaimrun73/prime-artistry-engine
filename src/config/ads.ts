/**
 * Ad configuration — Adsterra (Direct Link + banners) + Monetag Vignette / IPP.
 *
 * Multitag is permanently disabled (removed from product).
 *
 * Adsterra banners (verified publisher keys):
 * - 728×90 desktop leaderboard
 * - 320×50 mobile banner
 * - 300×250 medium rectangle
 *
 * Monetag: Vignette 12136694, IPP desktop-only
 * Never grant Motio2edit credits from a client click alone
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;

export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

/** Adsterra banner units — verified publisher codes */
export const ADSTERRA_BANNERS = {
  desktop728x90: {
    key: "4bf9a15b0b48e00aa7a747f6c839281b",
    width: 728,
    height: 90,
    src: "https://bauval.org/22/4bf9a15b0b48e00aa7a747f6c839281b",
  },
  mobile320x50: {
    key: "6b55fa106a712c45e0ecc3101176947f",
    width: 320,
    height: 50,
    src: "https://bauval.org/22/6b55fa106a712c45e0ecc3101176947f",
  },
  rect300x250: {
    key: "f45af7729b5f87f7f631224b9914355a",
    width: 300,
    height: 250,
    src: "https://bauval.org/22/f45af7729b5f87f7f631224b9914355a",
  },
} as const;

export type AdsterraBannerSize = keyof typeof ADSTERRA_BANNERS;

export const ADS_CONFIG = {
  /** Master for static Direct Link / banners / Monetag vignette+IPP. */
  enabled: true,
  /** Monetag vignette for eligible free users (mobile + desktop). */
  vignetteEnabled: true,
  /** Monetag in-page push — desktop only (see MonetagInPagePush). */
  pagePushEnabled: true,
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
