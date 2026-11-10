import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import {
  isAdRouteAllowed,
  MONETAG_VIGNETTE_ZONE,
  MONETAG_VIGNETTE_SCRIPT_SRC,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-vignette";
const SESSION_KEY = "motio_vignette_shown";

/**
 * Monetag Vignette — free signed-in non-admin only.
 * At most once per tab session. Fail closed while auth unknown.
 * Excluded on pricing / auth / checkout / editor / etc. via isAdRouteAllowed.
 */
export function MonetagVignette() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading || (user && !profile) || !masterOn || !user || !profile) {
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

    if (document.getElementById(SCRIPT_ID) || loadedRef.current) {
      loadedRef.current = true;
      return;
    }

    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = MONETAG_VIGNETTE_ZONE;
      s.dataset.motioAllowed = "1";
      s.src = MONETAG_VIGNETTE_SCRIPT_SRC;
      s.async = true;
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
  }, [user, profile, loading, masterOn, pathname]);

  return null;
}

function removeOurScript() {
  if (typeof document === "undefined") return;
  document.getElementById(SCRIPT_ID)?.remove();
}
