/**
 * Compact floating glass gift notification for eligible free users.
 * ~60s intervals while actively browsing non-editor routes.
 * Dismissible; never reopens same session after dismiss.
 * Skips when tab hidden or user inactive.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { shouldShowAds } from "@/lib/policy";
import { DIRECT_LINK_URL, isAdRouteAllowed, ADS_CONFIG } from "@/config/ads";
import { loadMultitagOnce } from "@/components/ads/MonetagMultiTag";
import { openSponsorUrl, trackAdEvent } from "@/lib/ad-placement-manager";
import { Gift, X } from "lucide-react";

const DISMISS_KEY = "motio2edit-gift-float-dismissed";
const INTERVAL_MS = 60_000;
const FIRST_DELAY_MS = 45_000;
const ACTIVITY_IDLE_MS = 90_000;

function isEditorPath(pathname: string): boolean {
  if (pathname === "/editor" || pathname.startsWith("/editor/")) return true;
  if (pathname.startsWith("/studio/")) return true;
  return false;
}

export function GiftFloatingNotice() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Activity tracking — do not show when user is idle or tab hidden
  useEffect(() => {
    const bump = () => {
      lastActiveRef.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener("visibilitychange", bump);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);

  useEffect(() => {
    if (dismissed) return;
    if (loading || !user || !profile) return;
    if (!ADS_CONFIG.enabled) return;
    const admin = isAdminEmail(profile.email);
    if (!shouldShowAds({ plan: profile.plan, email: profile.email, isAdmin: admin })) return;
    if (!isAdRouteAllowed(pathname)) return;
    if (isEditorPath(pathname)) {
      setVisible(false);
      return;
    }

    const tryShow = () => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* ignore */
      }
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastActiveRef.current > ACTIVITY_IDLE_MS) return;
      if (isEditorPath(window.location.pathname)) return;
      setVisible(true);
      trackAdEvent("impression", "gift-float");
    };

    let intervalId: number | undefined;
    const first = window.setTimeout(() => {
      tryShow();
      intervalId = window.setInterval(tryShow, INTERVAL_MS);
    }, FIRST_DELAY_MS);

    return () => {
      window.clearTimeout(first);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user, profile, loading, pathname, dismissed]);

  // Hide immediately when entering editor/studio
  useEffect(() => {
    if (isEditorPath(pathname)) setVisible(false);
  }, [pathname]);

  if (!visible || dismissed) return null;
  if (isEditorPath(pathname)) return null;

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    trackAdEvent("dismiss", "gift-float");
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const openGift = () => {
    loadMultitagOnce();
    openSponsorUrl(DIRECT_LINK_URL, "gift-float");
    trackAdEvent("gift_open", "gift-float");
    dismiss();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[55] flex justify-center px-3 sm:bottom-8 md:bottom-10"
      role="dialog"
      aria-label="Gift offer"
    >
      <div className="pointer-events-auto relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300 rounded-2xl border border-amber-500/35 bg-background/90 p-3.5 shadow-xl backdrop-blur-xl dark:bg-background/85">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss gift notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-sm">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Get free credits</p>
            <p className="text-xs text-muted-foreground">Partner offer · click to open</p>
          </div>
          <button
            type="button"
            onClick={openGift}
            className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-500"
          >
            Click me
          </button>
        </div>
      </div>
    </div>
  );
}
