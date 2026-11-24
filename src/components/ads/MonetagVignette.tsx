import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import {
  ADS_CONFIG,
  isAdRouteAllowed,
  MONETAG_VIGNETTE_SCRIPT_SRC,
  MONETAG_VIGNETTE_ZONE,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-vignette";
const SESSION_KEY = "motio_vignette_shown";

/**
 * Monetag Vignette — loads publisher script once per tab session.
 * Gated to free non-admin on allowed routes. Never during /editor generation canvas.
 */
export function MonetagVignette() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.vignetteEnabled) {
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

    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
        return;
      }
    } catch {
      /* private mode */
    }

    if (document.getElementById(SCRIPT_ID)) {
      loadedRef.current = true;
      return;
    }
    if (loadedRef.current) return;

    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = MONETAG_VIGNETTE_ZONE;
      s.dataset.motioAllowed = "1";
      s.src = MONETAG_VIGNETTE_SCRIPT_SRC;
      s.async = true;
      s.setAttribute("data-cfasync", "false");
      (document.body || document.documentElement).appendChild(s);
      loadedRef.current = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
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
