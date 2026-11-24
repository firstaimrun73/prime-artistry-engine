import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import {
  ADS_CONFIG,
  isAdRouteAllowed,
  MONETAG_IPP_SCRIPT_SRC,
  MONETAG_IPP_ZONE,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-ipp";

/**
 * Monetag In-Page Push — does NOT request browser notification permission.
 * Free signed-in non-admin on allowed routes (desktop + mobile where provider supports).
 */
export function MonetagInPagePush() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.pagePushEnabled) {
      removeOurScript();
      return;
    }
    if (loading) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }
    if (user && !profile) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }
    if (!user || !profile) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }

    const admin = isAdminEmail(profile.email);
    const eligible = shouldShowAds({
      plan: profile.plan,
      email: profile.email,
      isAdmin: admin,
    });

    if (!eligible || !isAdRouteAllowed(pathname)) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      loadedRef.current = true;
      return;
    }
    if (loadedRef.current) return;

    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = MONETAG_IPP_ZONE;
      s.dataset.motioAllowed = "1";
      s.src = MONETAG_IPP_SCRIPT_SRC;
      s.async = true;
      s.setAttribute("data-cfasync", "false");
      (document.body || document.documentElement).appendChild(s);
      loadedRef.current = true;
    } catch {
      loadedRef.current = false;
    }
  }, [user, profile, loading, pathname]);

  return null;
}

function removeOurScript() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
}
