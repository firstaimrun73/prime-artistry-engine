/**
 * Monetag In-Page Push — desktop only (≥768px), free eligible users.
 * Removes script and prevents re-init when viewport becomes mobile.
 * Does not rely on CSS alone.
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

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 768;
}

function removeIppScript() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
  // Best-effort cleanup of common IPP leftovers without touching other networks
  document.querySelectorAll('script[src*="nap5k.com"]').forEach((s) => {
    if (s.id === SCRIPT_ID || s.getAttribute("data-zone") === MONETAG_IPP_ZONE) {
      s.remove();
    }
  });
}

function loadIppOnce() {
  if (typeof document === "undefined") return;
  if (!isDesktopViewport()) return;
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
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.pagePushEnabled) {
      removeIppScript();
      return;
    }
    if (loading || !user || !profile) {
      removeIppScript();
      return;
    }
    if (!isAdRouteAllowed(pathname)) {
      removeIppScript();
      return;
    }
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) {
      removeIppScript();
      return;
    }

    const apply = () => {
      if (isDesktopViewport()) {
        loadIppOnce();
      } else {
        removeIppScript();
      }
    };

    apply();

    const onResize = () => {
      apply();
    };
    window.addEventListener("resize", onResize);
    // orientation change on mobile
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [user, profile, loading, pathname]);

  return null;
}
