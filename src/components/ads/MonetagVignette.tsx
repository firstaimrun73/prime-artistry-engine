import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import {
  isAdRouteAllowed,
  MONETAG_SCRIPT_SRC,
  MONETAG_VIGNETTE_ZONE,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-vignette";

/**
 * Monetag Vignette for free signed-in non-admin users only.
 * Loads once when eligible; AdPolicyGate keeps scripts with data-motio-allowed="1".
 */
export function MonetagVignette() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    const cleanup = () => {
      removeOurScript();
      loadedRef.current = false;
    };

    if (loading) {
      cleanup();
      return;
    }
    if (user && !profile) {
      cleanup();
      return;
    }
    if (!masterOn || !user || !profile) {
      cleanup();
      return;
    }

    const admin = isAdminEmail(profile.email);
    const eligible = shouldShowAds({
      plan: profile.plan,
      email: profile.email,
      isAdmin: admin,
    });

    if (!eligible || !isAdRouteAllowed(pathname)) {
      cleanup();
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
      s.setAttribute("data-zone", MONETAG_VIGNETTE_ZONE);
      s.setAttribute("data-motio-allowed", "1");
      // Help Monetag treat as vignette-style when supported by zone type
      s.setAttribute("data-cfasync", "false");
      s.src = MONETAG_SCRIPT_SRC;
      s.async = true;
      (document.body || document.documentElement).appendChild(s);
      loadedRef.current = true;
    } catch {
      loadedRef.current = false;
    }
  }, [user, profile, loading, masterOn, pathname]);

  return null;
}

function removeOurScript() {
  if (typeof document === "undefined") return;
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
}
