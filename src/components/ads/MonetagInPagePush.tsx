import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed, MONETAG_IPP_ZONE, MONETAG_IPP_SCRIPT_SRC } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

const SCRIPT_ID = "motio-monetag-ipp";

/**
 * Monetag In-Page Push — free signed-in non-admin only.
 * Fail closed while loading / plan unknown. Respects excluded routes.
 */
export function MonetagInPagePush() {
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

    if (document.getElementById(SCRIPT_ID) || loadedRef.current) {
      loadedRef.current = true;
      return;
    }

    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.dataset.zone = MONETAG_IPP_ZONE;
      s.dataset.motioAllowed = "1";
      s.src = MONETAG_IPP_SCRIPT_SRC;
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
  document.getElementById(SCRIPT_ID)?.remove();
}
