import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

/**
 * Monetag Vignette zone.
 * Replace with your Monetag Vignette zone ID from the Monetag dashboard if different.
 * Same loader domain as other Monetag tags; format is controlled by the zone type.
 */
const ZONE = "12004581";
const SCRIPT_SRC = "https://nap5k.com/tag.min.js";
const SCRIPT_ID = "motio-monetag-vignette";

/**
 * Monetag Vignette (overlay interstitial) for free signed-in non-admin users only.
 * In-Page Push is intentionally disabled — use this format only.
 *
 * Fail closed:
 * - auth still loading
 * - signed-in but profile not yet loaded (plan unknown)
 * - master switch off, paid, admin, logged-out, excluded route
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
