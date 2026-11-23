/**
 * Adsterra iframe banner — one unit per instance.
 * Isolates global `atOptions` per mount so multiple units do not conflict.
 * Does not touch Monetag / PartnerZone scripts.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ADS_CONFIG,
  ADSTERRA_UNITS,
  type AdsterraUnitId,
  isAdRouteAllowed,
  adPlacementCategory,
} from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { cn } from "@/lib/utils";

/** Serialize Adsterra script injects so concurrent mounts do not clobber atOptions. */
let adsterraChain: Promise<void> = Promise.resolve();

function enqueueAdsterra(task: () => Promise<void>): Promise<void> {
  adsterraChain = adsterraChain.then(task).catch(() => {
    /* fail soft */
  });
  return adsterraChain;
}

export function AdsterraBanner({
  unit,
  placement = "adsterra",
  className = "",
}: {
  unit: AdsterraUnitId;
  placement?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [visible, setVisible] = useState(false);
  const category = adPlacementCategory(placement);
  const adsOn = useAdsVisible(category ?? undefined);
  const { profile, user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allowed =
    ADS_CONFIG.enabled &&
    ADS_CONFIG.adsterraEnabled &&
    !loading &&
    !!user &&
    !!profile &&
    isAdRouteAllowed(pathname) &&
    shouldShowAds({
      plan: profile.plan,
      email: profile.email,
      isAdmin: isAdminEmail(profile.email),
    }) &&
    (adsOn || profile.plan === "free");

  useEffect(() => {
    if (!allowed) {
      setVisible(false);
      return;
    }
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    const cfg = ADSTERRA_UNITS[unit];
    const mountId = `adsterra-${cfg.key}-${reactId.replace(/:/g, "")}`;

    void enqueueAdsterra(async () => {
      if (cancelled || !hostRef.current) return;
      const el = hostRef.current;
      el.innerHTML = "";

      const w = window as Window & { atOptions?: Record<string, unknown> };
      w.atOptions = {
        key: cfg.key,
        format: "iframe",
        height: cfg.height,
        width: cfg.width,
        params: {},
      };

      const conf = document.createElement("script");
      conf.type = "text/javascript";
      conf.dataset.adsterraConf = cfg.key;
      conf.text = `atOptions = ${JSON.stringify({
        key: cfg.key,
        format: "iframe",
        height: cfg.height,
        width: cfg.width,
        params: {},
      })};`;

      const inv = document.createElement("script");
      inv.type = "text/javascript";
      inv.async = true;
      inv.setAttribute("data-cfasync", "false");
      inv.dataset.adsterraKey = cfg.key;
      inv.dataset.adsterraMount = mountId;
      inv.src = cfg.scriptSrc;

      await new Promise<void>((resolve) => {
        inv.onload = () => resolve();
        inv.onerror = () => resolve();
        el.appendChild(conf);
        el.appendChild(inv);
        // Allow network a beat even if onload is flaky
        window.setTimeout(() => resolve(), 1200);
      });

      if (!cancelled) setVisible(true);
    });

    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [allowed, unit, reactId, pathname]);

  if (!allowed) return null;

  const cfg = ADSTERRA_UNITS[unit];

  return (
    <div
      className={cn("my-5 flex w-full justify-center overflow-x-hidden", className)}
      data-ad-placement={placement}
      data-ad-network="adsterra"
      data-ad-unit={unit}
      role="complementary"
      aria-label="Advertisement"
    >
      <div
        className={cn(
          "relative flex max-w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/20",
          !visible && "min-h-[50px]",
        )}
        style={{ width: cfg.width, maxWidth: "100%", minHeight: cfg.height }}
      >
        <div ref={hostRef} className="flex max-w-full items-center justify-center" />
      </div>
    </div>
  );
}

/**
 * Responsive Adsterra: mobile 320×50, desktop 728×90, optional mid 300×250.
 */
export function AdsterraResponsive({
  placement = "adsterra-responsive",
  className = "",
  includeRect = true,
}: {
  placement?: string;
  className?: string;
  /** Show 300×250 between mobile strip and desktop leaderboard on md+ when space allows */
  includeRect?: boolean;
}) {
  return (
    <div className={cn("w-full", className)} data-ad-placement={placement}>
      <div className="md:hidden">
        <AdsterraBanner unit="mobile320x50" placement={`${placement}-m`} />
      </div>
      {includeRect ? (
        <div className="hidden justify-center md:flex lg:hidden">
          <AdsterraBanner unit="rect300x250" placement={`${placement}-r`} />
        </div>
      ) : null}
      <div className="hidden justify-center lg:flex">
        <AdsterraBanner unit="leaderboard728x90" placement={`${placement}-d`} />
      </div>
    </div>
  );
}
