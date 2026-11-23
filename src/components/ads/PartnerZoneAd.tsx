/**
 * Partner zone script — loads once per page session in approved placements only.
 * Independent of monthly spin backend. Does not grant app credits.
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ADS_CONFIG,
  isAdRouteAllowed,
  PARTNER_ZONE_SCRIPT_SRC,
  PARTNER_ZONE_ID,
} from "@/config/ads";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

const FLAG = "__motio_partner_zone_314581";

export function PartnerZoneAd({ className = "" }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!ADS_CONFIG.enabled || !ADS_CONFIG.partnerZoneEnabled) return;
    if (!isAdRouteAllowed(pathname)) return;
    if (!user || !profile) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;

    const w = window as Window & { [FLAG]?: boolean };
    if (w[FLAG]) return;
    if (document.querySelector(`script[data-motio-zone="${PARTNER_ZONE_ID}"]`)) {
      w[FLAG] = true;
      return;
    }

    const s = document.createElement("script");
    s.src = PARTNER_ZONE_SCRIPT_SRC;
    s.async = true;
    s.dataset.zone = PARTNER_ZONE_ID;
    s.dataset.motioZone = PARTNER_ZONE_ID;
    s.setAttribute("data-cfasync", "false");
    s.onerror = () => {
      /* fail soft */
    };
    document.body.appendChild(s);
    w[FLAG] = true;
  }, [pathname, user, profile, loading]);

  return (
    <div className={className} data-ad-placement="partner-zone" data-zone={PARTNER_ZONE_ID} aria-hidden />
  );
}
