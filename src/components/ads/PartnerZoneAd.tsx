/**
 * Partner zone script — loads once per page session in approved placements only.
 * Independent of monthly spin backend. Does not grant app credits.
 */
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ADS_CONFIG, isAdRouteAllowed } from "@/config/ads";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const SCRIPT_SRC = "https://quge5.com/88/tag.min.js";
const ZONE = "314581";
const FLAG = "__motio_partner_zone_314581";

export function PartnerZoneAd({ className = "" }: { className?: string }) {
  const mounted = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!ADS_CONFIG.enabled) return;
    if (!isAdRouteAllowed(pathname)) return;
    if (!user || !profile) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;

    const w = window as Window & { [FLAG]?: boolean };
    if (w[FLAG]) return;
    if (document.querySelector(`script[data-motio-zone="${ZONE}"]`)) {
      w[FLAG] = true;
      return;
    }

    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.dataset.zone = ZONE;
    s.dataset.motioZone = ZONE;
    s.setAttribute("data-cfasync", "false");
    s.onerror = () => {
      /* fail soft — never break Discover */
    };
    document.body.appendChild(s);
    w[FLAG] = true;
    mounted.current = true;
  }, [pathname, user, profile, loading]);

  // Invisible host; script injects its own UI
  return (
    <div
      className={className}
      data-ad-placement="partner-zone"
      data-zone={ZONE}
      aria-hidden
    />
  );
}
