import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import {
  isAdRouteAllowed,
  MONETAG_VIGNETTE_ZONE,
  MONETAG_VIGNETTE_SCRIPT_SRC,
  MONETAG_MULTITAG_ZONE,
  MONETAG_MULTITAG_SRC,
  DIRECT_LINK_URL,
  ADS_CONFIG,
} from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

/**
 * Admin-only diagnostics for ad system.
 * Activate with ?ad-debug=1 while signed in as admin.
 * Never shown to normal customers. Does not load real Monetag/Adsterra scripts for admin.
 */
export function AdDebugPanel() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [enabled, setEnabled] = useState(false);
  const [vignettePresent, setVignettePresent] = useState(false);
  const [multitagPresent, setMultitagPresent] = useState(false);
  const [monetagScripts, setMonetagScripts] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setEnabled(params.get("ad-debug") === "1");
    } catch {
      setEnabled(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      setVignettePresent(!!document.getElementById("motio-monetag-vignette"));
      setMultitagPresent(!!document.getElementById("motio-multitag-314190"));
      setMonetagScripts(
        document.querySelectorAll(
          'script[src*="n6wxm.com"], script[src*="nap5k.com"], script[src*="quge5.com"], script[src*="monetag"]',
        ).length,
      );
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [enabled, pathname]);

  if (!enabled) return null;
  const admin = isAdminEmail(profile?.email);
  if (!admin) return null;

  const plan = profile?.plan ?? "(none)";
  const audienceOk = shouldShowAds({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });
  const routeOk = isAdRouteAllowed(pathname);
  const eligible =
    !loading && masterOn && !!user && !!profile && routeOk && audienceOk;

  return (
    <>
      <div
        className="fixed bottom-20 right-3 z-[90] max-w-xs rounded-xl border border-orange-500/40 bg-card/95 p-3 text-[11px] shadow-xl backdrop-blur sm:bottom-4"
        role="status"
        aria-label="Ad diagnostics"
      >
        <p className="mb-1.5 font-bold text-orange-400">Ad Debug (admin only)</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>Role: admin · Plan: <span className="text-foreground">{plan}</span></li>
          <li>
            Master:{" "}
            <span className={masterOn ? "text-emerald-500" : "text-red-400"}>{String(masterOn)}</span>
            {" · "}
            ADS_CONFIG.enabled: {String(ADS_CONFIG.enabled)}
          </li>
          <li>
            Audience (free only):{" "}
            <span className={audienceOk ? "text-emerald-500" : "text-red-400"}>
              {String(audienceOk)}
            </span>{" "}
            (admin excluded by design)
          </li>
          <li>
            Route:{" "}
            <span className={routeOk ? "text-emerald-500" : "text-red-400"}>{String(routeOk)}</span>{" "}
            ({pathname})
          </li>
          <li>
            Eligible for real ads:{" "}
            <span className={eligible ? "text-emerald-500" : "text-red-400"}>{String(eligible)}</span>
          </li>
          <li className="pt-1 border-t border-border mt-1">
            Multitag zone {MONETAG_MULTITAG_ZONE}:{" "}
            <span className={multitagPresent ? "text-emerald-500" : "text-amber-500"}>
              {multitagPresent ? "script in DOM" : "not injected (expected for admin)"}
            </span>
          </li>
          <li>
            Vignette zone {MONETAG_VIGNETTE_ZONE}:{" "}
            <span className={vignettePresent ? "text-emerald-500" : "text-amber-500"}>
              {vignettePresent ? "script in DOM" : "not injected (expected for admin)"}
            </span>
          </li>
          <li>Monetag scripts in DOM: {monetagScripts}</li>
          <li className="truncate">Direct Link: {DIRECT_LINK_URL}</li>
          <li className="truncate text-[10px] opacity-70">Multitag src: {MONETAG_MULTITAG_SRC}</li>
          <li className="truncate text-[10px] opacity-70">Vignette src: {MONETAG_VIGNETTE_SCRIPT_SRC}</li>
          <li className="pt-1 text-[10px] opacity-80">
            Use a free non-admin account to verify real fills. This panel never loads provider scripts for admin.
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="mt-2 w-full rounded-lg border border-orange-500/40 bg-orange-500/10 px-2 py-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-300"
        >
          {showPreview ? "Hide" : "Show"} layout preview (no real ad)
        </button>
      </div>

      {showPreview && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-36 z-[89] flex justify-center px-3 sm:bottom-28"
          aria-hidden
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-dashed border-orange-500/50 bg-card/90 p-4 shadow-lg backdrop-blur">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-orange-500">
              Admin layout preview · not a live ad · no impressions
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-orange-500/25 bg-gradient-to-br from-card via-card to-orange-500/5 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-white text-xs font-bold">
                AD
              </span>
              <div className="min-w-0 flex-1">
                <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400">
                  Sponsored (preview)
                </span>
                <p className="mt-1 text-sm font-bold text-foreground">Partner offer · claim free credits</p>
                <p className="text-xs text-muted-foreground">Direct Link placement shape</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
