import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const ZONE = "12004581";
const SCRIPT_SRC = "https://nap5k.com/tag.min.js";
const SCRIPT_ID = "motio-monetag-ipp";

/**
 * Monetag In-Page Push (zone 12004581).
 * Loads once for confirmed free, signed-in, non-admin users only.
 * Does not request notification permission; renders as in-page unit per Monetag docs.
 * Vignette remains intentionally disabled (overlay interstitial).
 *
 * Fail closed:
 * - auth still loading
 * - signed-in but profile not yet loaded (plan unknown)
 * - master switch off, paid, admin, logged-out, excluded route
 */
export function MonetagInPagePush() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    // Fail closed while auth is resolving
    if (loading) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }

    // Fail closed: signed-in but plan not yet known
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

    // Dedup across rerenders / navigation while still eligible
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
      // Provider / DOM failure must never break the app
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
