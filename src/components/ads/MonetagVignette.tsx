import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const ZONE = "12004579";
const SCRIPT_SRC = "https://n6wxm.com/vignette.min.js";
const SCRIPT_ID = "motio-monetag-vignette";
/** Session key: show at most once per browser tab session to limit overlay fatigue. */
const SESSION_KEY = "motio_vignette_shown";

/**
 * Monetag Vignette Banner (zone 12004579).
 * Center banner over a grey overlay with Close + Continue (Monetag docs).
 * Not a notification opt-in and not a popunder; still an overlay, so we:
 * - gate to free signed-in non-admin only
 * - respect master switch + excluded routes
 * - load at most once per tab session
 * - fail closed while auth/profile are unknown
 * - mark script data-motio-allowed for AdPolicyGate
 */
export function MonetagVignette() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
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

    if (!masterOn || !user || !profile) {
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

    // Frequency: once per tab session
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1") {
        return;
      }
    } catch {
      /* private mode — still allow one load via loadedRef */
    }

    if (document.getElementById(SCRIPT_ID)) {
      loadedRef.current = true;
      return;
    }
    if (loadedRef.current) return;

    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = ZONE;
      s.dataset.motioAllowed = "1";
      s.src = SCRIPT_SRC;
      s.async = true;
      const parent = document.body || document.documentElement;
      parent.appendChild(s);
      loadedRef.current = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
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
