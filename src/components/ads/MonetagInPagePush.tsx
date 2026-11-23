/**
 * Monetag In-Page Push — desktop only (md+).
 * Never loads on mobile viewports.
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ADS_CONFIG,
  isAdRouteAllowed,
  MONETAG_IPP_SCRIPT_SRC,
  MONETAG_IPP_ZONE,
} from "@/config/ads";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const FLAG = "__motio_monetag_ipp";

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

export function MonetagInPagePush() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.pagePushEnabled) return;
    if (!isDesktopViewport()) return;
    if (!isAdRouteAllowed(pathname)) return;
    if (!user || !profile) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;

    const w = window as Window & { [FLAG]?: boolean };
    if (w[FLAG]) return;
    if (document.querySelector(`script[data-motio-ipp="${MONETAG_IPP_ZONE}"]`)) {
      w[FLAG] = true;
      return;
    }

    const s = document.createElement("script");
    s.src = MONETAG_IPP_SCRIPT_SRC;
    s.async = true;
    s.dataset.zone = MONETAG_IPP_ZONE;
    s.dataset.motioIpp = MONETAG_IPP_ZONE;
    s.setAttribute("data-cfasync", "false");
    s.onerror = () => {
      /* fail soft */
    };
    document.body.appendChild(s);
    w[FLAG] = true;
  }, [pathname, user, profile, loading]);

  return null;
}
