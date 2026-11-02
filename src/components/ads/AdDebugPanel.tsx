import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { useAdsMasterEnabled } from "@/lib/site-settings";
import { isAdRouteAllowed, MONETAG_VIGNETTE_ZONE, MONETAG_VIGNETTE_SCRIPT_SRC } from "@/config/ads";
import { useRouterState } from "@tanstack/react-router";

/**
 * Admin-only diagnostics for ad system.
 * Activate with ?ad-debug=1 while signed in as admin.
 * Never shown to normal customers.
 */
export function AdDebugPanel() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [enabled, setEnabled] = useState(false);
  const [scriptPresent, setScriptPresent] = useState(false);
  const [monetagScripts, setMonetagScripts] = useState(0);

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
      setScriptPresent(!!document.getElementById("motio-monetag-vignette"));
      setMonetagScripts(
        document.querySelectorAll(
          'script[src*="n6wxm.com"], script[src*="nap5k.com"], script[src*="monetag"]',
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
    <div
      className="fixed bottom-20 right-3 z-[90] max-w-xs rounded-xl border border-orange-500/40 bg-card/95 p-3 text-[11px] shadow-xl backdrop-blur sm:bottom-4"
      role="status"
      aria-label="Ad diagnostics"
    >
      <p className="mb-1.5 font-bold text-orange-400">Ad Debug (admin only)</p>
      <ul className="space-y-0.5 text-muted-foreground">
        <li>Role: admin</li>
        <li>Plan: <span className="text-foreground">{plan}</span></li>
        <li>Master switch: <span className={masterOn ? "text-emerald-500" : "text-red-400"}>{String(masterOn)}</span></li>
        <li>Audience (free only): <span className={audienceOk ? "text-emerald-500" : "text-red-400"}>{String(audienceOk)}</span></li>
        <li>Route allowed: <span className={routeOk ? "text-emerald-500" : "text-red-400"}>{String(routeOk)}</span> ({pathname})</li>
        <li>Eligible: <span className={eligible ? "text-emerald-500" : "text-red-400"}>{String(eligible)}</span></li>
        <li>Vignette script present: <span className={scriptPresent ? "text-emerald-500" : "text-red-400"}>{String(scriptPresent)}</span></li>
        <li>Monetag scripts in DOM: {monetagScripts}</li>
        <li>Zone: {MONETAG_VIGNETTE_ZONE}</li>
        <li className="truncate">Src: {MONETAG_VIGNETTE_SCRIPT_SRC}</li>
        <li className="pt-1 text-[10px] opacity-70">If master=false → enable in Admin → Settings. If eligible=true but no fill → provider inventory.</li>
      </ul>
    </div>
  );
}
