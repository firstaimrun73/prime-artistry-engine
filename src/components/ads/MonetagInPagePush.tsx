/**
 * Monetag In-Page Push — desktop only (≥768px), free eligible users.
 *
 * Hard mobile disable:
 * - Never inject on mobile viewport (matchMedia + innerWidth)
 * - On mobile transition: remove scripts, clear related DOM, set session kill switch
 * - Kill switch prevents re-init after desktop→mobile even if provider registered handlers
 * - Best-effort null of known Monetag IPP globals (provider-specific; incomplete by nature)
 */
import { useEffect } from "react";
import {
  ADS_CONFIG,
  MONETAG_IPP_SCRIPT_SRC,
  MONETAG_IPP_ZONE,
  isAdRouteAllowed,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const SCRIPT_ID = "motio-monetag-ipp";
const MOBILE_KILL_KEY = "motio-ipp-mobile-kill";

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(max-width: 767.98px)").matches) return false;
  } catch {
    /* ignore */
  }
  return window.innerWidth >= 768;
}

function hardDisableIppOnMobile() {
  if (typeof document === "undefined") return;
  try {
    sessionStorage.setItem(MOBILE_KILL_KEY, "1");
  } catch {
    /* ignore */
  }

  document.getElementById(SCRIPT_ID)?.remove();
  document.querySelectorAll('script[src*="nap5k.com"]').forEach((s) => s.remove());
  document.querySelectorAll(`[data-zone="${MONETAG_IPP_ZONE}"]`).forEach((el) => {
    if (el.tagName === "SCRIPT" || el.getAttribute("data-motio-allowed") === "1") {
      el.remove();
    }
  });

  // Best-effort: clear common provider hooks if present (does not guarantee SDK internals stop)
  try {
    const w = window as Window & Record<string, unknown>;
    for (const key of Object.keys(w)) {
      const lk = key.toLowerCase();
      if (lk.includes("monetag") && (lk.includes("push") || lk.includes("ipp") || lk.includes("inpage"))) {
        try {
          w[key] = undefined;
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function mobileKillActive(): boolean {
  try {
    return sessionStorage.getItem(MOBILE_KILL_KEY) === "1" && !isDesktopViewport();
  } catch {
    return !isDesktopViewport();
  }
}

function clearMobileKillOnDesktop() {
  if (!isDesktopViewport()) return;
  try {
    sessionStorage.removeItem(MOBILE_KILL_KEY);
  } catch {
    /* ignore */
  }
}

function loadIppOnce() {
  if (typeof document === "undefined") return;
  if (!isDesktopViewport()) return;
  if (mobileKillActive()) return;
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = MONETAG_IPP_SCRIPT_SRC;
  s.async = true;
  s.setAttribute("data-zone", MONETAG_IPP_ZONE);
  s.setAttribute("data-cfasync", "false");
  s.setAttribute("data-motio-allowed", "1");
  document.body.appendChild(s);
}

export function MonetagInPagePush() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const ineligible =
      !ADS_CONFIG.enabled ||
      !ADS_CONFIG.pagePushEnabled ||
      loading ||
      !user ||
      !profile ||
      !isAdRouteAllowed(pathname) ||
      !shouldShowAds({
        plan: profile.plan,
        email: profile.email,
        isAdmin: isAdminEmail(profile.email),
      });

    const apply = () => {
      if (!isDesktopViewport()) {
        hardDisableIppOnMobile();
        return;
      }
      clearMobileKillOnDesktop();
      if (ineligible) {
        document.getElementById(SCRIPT_ID)?.remove();
        return;
      }
      loadIppOnce();
    };

    // First paint: prefer matchMedia so mobile never injects
    apply();

    let mq: MediaQueryList | null = null;
    const onMq = () => apply();
    try {
      mq = window.matchMedia("(max-width: 767.98px)");
      mq.addEventListener("change", onMq);
    } catch {
      /* ignore */
    }

    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      try {
        mq?.removeEventListener("change", onMq);
      } catch {
        /* ignore */
      }
    };
  }, [user, profile, loading, pathname]);

  return null;
}
