/**
 * Adsterra iframe banner — verified publisher keys only.
 * Loads atOptions + bauval.org script into a dedicated container.
 */
import { useEffect, useId, useRef } from "react";
import {
  ADSTERRA_BANNERS,
  ADS_CONFIG,
  type AdsterraBannerSize,
  isAdRouteAllowed,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

export function AdsterraBanner({
  size,
  placement = "banner",
  className = "",
}: {
  size: AdsterraBannerSize;
  placement?: string;
  className?: string;
}) {
  const unit = ADSTERRA_BANNERS[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const admin = isAdminEmail(profile?.email);
  const eligible =
    ADS_CONFIG.enabled &&
    !loading &&
    !!user &&
    !!profile &&
    shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin }) &&
    isAdRouteAllowed(pathname);

  useEffect(() => {
    if (!eligible || !containerRef.current) return;
    const el = containerRef.current;
    if (el.dataset.loaded === "1") return;

    // Clear previous
    el.innerHTML = "";

    window.atOptions = {
      key: unit.key,
      format: "iframe",
      height: unit.height,
      width: unit.width,
      params: {},
    };

    const s = document.createElement("script");
    s.src = unit.src;
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.setAttribute("data-motio-allowed", "1");
    s.setAttribute("data-adsterra-key", unit.key);
    s.id = `motio-adsterra-${unit.key}-${uid}`;
    el.appendChild(s);
    el.dataset.loaded = "1";

    return () => {
      // leave DOM; policy gate cleans when ineligible
    };
  }, [eligible, unit.key, unit.height, unit.width, unit.src, uid]);

  if (!eligible) return null;

  return (
    <div
      className={`flex w-full justify-center overflow-hidden ${className}`}
      data-ad-placement={placement}
      data-ad-network="adsterra"
      data-ad-size={size}
      role="complementary"
      aria-label="Sponsored"
    >
      <div
        ref={containerRef}
        className="mx-auto max-w-full"
        style={{ minHeight: unit.height, minWidth: Math.min(unit.width, 320) }}
      />
    </div>
  );
}

/** Auto mobile 320×50 / desktop 728×90 */
export function AdsterraResponsiveBanner({
  placement = "responsive",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <>
      <div className="block md:hidden">
        <AdsterraBanner size="mobile320x50" placement={`${placement}-m`} className={className} />
      </div>
      <div className="hidden md:block">
        <AdsterraBanner size="desktop728x90" placement={`${placement}-d`} className={className} />
      </div>
    </>
  );
}
