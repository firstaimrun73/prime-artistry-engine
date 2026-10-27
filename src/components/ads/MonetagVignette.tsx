import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import {
  isAdRouteAllowed,
  MONETAG_VIGNETTE_SCRIPT_SRC,
  MONETAG_VIGNETTE_ZONE,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-vignette";

/**
 * Monetag Vignette — exact publisher tag pattern:
 *   s.dataset.zone = '12136694'
 *   s.src = 'https://n6wxm.com/vignette.min.js'
 * Free signed-in non-admin only. AdPolicyGate keeps n6wxm scripts while eligible.
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
      // Match Monetag's official snippet exactly
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = MONETAG_VIGNETTE_ZONE;
      s.dataset.motioAllowed = "1";
      s.src = MONETAG_VIGNETTE_SCRIPT_SRC;
      s.async = true;
      const parent = [document.documentElement, document.body].filter(Boolean).pop();
      parent?.appendChild(s);
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
