/**
 * Ad configuration — Monetag multitag + Direct Link + Adsterra banners.
 * Multitag opens only on explicit user click (new tab).
 * In-page push: desktop only (never mobile).
 * Partner zone scripts not auto-loaded on core app.
 */
export const DIRECT_LINK_URL = "https://omg10.com/4/10768443" as const;
export const MONETAG_MULTITAG_URL = DIRECT_LINK_URL;

export const SPONSOR_DISPLAY_NAME = "Partner offer" as const;
export const SPONSOR_TAGLINE = "Sponsored · Gift offers · stay here & click when ready" as const;

export const MONETAG_VIGNETTE_ZONE = "12136694" as const;
export const MONETAG_VIGNETTE_SCRIPT_SRC = "https://n6wxm.com/vignette.min.js" as const;
export const MONETAG_IPP_ZONE = "12004581" as const;
export const MONETAG_IPP_SCRIPT_SRC = "https://nap5k.com/tag.min.js" as const;

export const PARTNER_ZONE_SCRIPT_SRC = "https://quge5.com/88/tag.min.js" as const;
export const PARTNER_ZONE_ID = "314581" as const;

export const ADSTERRA_UNITS = {
  rect300x250: {
    key: "f45af7729b5f87f7f631224b9914355a",
    width: 300,
    height: 250,
    scriptSrc: "https://bauval.org/22/f45af7729b5f87f7f631224b9914355a",
  },
  leaderboard728x90: {
    key: "4bf9a15b0b48e00aa7a747f6c839281b",
    width: 728,
    height: 90,
    scriptSrc: "https://bauval.org/22/4bf9a15b0b48e00aa7a747f6c839281b",
  },
  mobile320x50: {
    key: "6b55fa106a712c45e0ecc3101176947f",
    width: 320,
    height: 50,
    scriptSrc: "https://bauval.org/22/6b55fa106a712c45e0ecc3101176947f",
  },
} as const;

export type AdsterraUnitId = keyof typeof ADSTERRA_UNITS;

export const ADS_CONFIG = {
  enabled: true,
  vignetteEnabled: false,
  /** Desktop-only in-page push (MonetagInPagePush enforces md+). */
  pagePushEnabled: true,
  optInFreeCreditCta: true,
  /** Core app must NOT auto-load partner/multitag scripts. */
  partnerZoneEnabled: false,
  adsterraEnabled: true,
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
    p.startsWith("discover") ||
    p.startsWith("footer") ||
    p.startsWith("in-content") ||
    p.startsWith("adsterra")
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

/** Rough ad-blocker heuristic — used only to decide which gift CTAs to emphasize. */
export function detectAdBlocker(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const bait = document.createElement("div");
    bait.className = "adsbox ad-banner adsbygoogle ad-placement";
    bait.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(bait);
    const blocked = bait.offsetParent === null || bait.offsetHeight === 0;
    document.body.removeChild(bait);
    return blocked;
  } catch {
    return false;
  }
}
