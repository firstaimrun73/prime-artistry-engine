/**
 * Monetag Vignette — free signed-in users on allowed routes only.
 * Uses existing zone credentials from ads config.
 */
import { useEffect } from "react";
import {
  ADS_CONFIG,
  MONETAG_VIGNETTE_SCRIPT_SRC,
  MONETAG_VIGNETTE_ZONE,
  isAdRouteAllowed,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const SCRIPT_ID = "motio-monetag-vignette";

function loadVignetteOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.src = MONETAG_VIGNETTE_SCRIPT_SRC;
  s.async = true;
  s.setAttribute("data-zone", MONETAG_VIGNETTE_ZONE);
  s.setAttribute("data-cfasync", "false");
  s.setAttribute("data-motio-allowed", "1");
  document.body.appendChild(s);
}

export function MonetagVignette() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.vignetteEnabled) return;
    if (loading || !user || !profile) return;
    if (!isAdRouteAllowed(pathname)) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;
    loadVignetteOnce();
  }, [user, profile, loading, pathname]);

  return null;
}
