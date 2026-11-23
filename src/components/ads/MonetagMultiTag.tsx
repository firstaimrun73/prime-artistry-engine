/**
 * Monetag MultiTag loader — zone 314190.
 * Loads once, async, data-cfasync=false.
 * Does not auto-open tabs. Call only from allowed free-user contexts.
 */
import { useEffect } from "react";
import {
  ADS_CONFIG,
  MONETAG_MULTITAG_SRC,
  MONETAG_MULTITAG_ZONE,
  isAdRouteAllowed,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const SCRIPT_ID = "motio-multitag-314190";

export function loadMultitagOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = MONETAG_MULTITAG_SRC;
  s.async = true;
  s.setAttribute("data-zone", MONETAG_MULTITAG_ZONE);
  s.setAttribute("data-cfasync", "false");
  s.setAttribute("data-motio-allowed", "1");
  document.body.appendChild(s);
}

/**
 * Mount on allowed free-user pages to load Multitag once.
 * Safe no-op when ads off, paid, admin, or excluded route.
 */
export function MonetagMultiTag() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ADS_CONFIG.enabled || loading || !user || !profile) return;
    if (!isAdRouteAllowed(pathname)) return;
    const admin = isAdminEmail(profile.email);
    if (
      !shouldShowAds({
        plan: profile.plan,
        email: profile.email,
        isAdmin: admin,
      })
    ) {
      return;
    }
    loadMultitagOnce();
  }, [user, profile, loading, pathname]);

  return null;
}
