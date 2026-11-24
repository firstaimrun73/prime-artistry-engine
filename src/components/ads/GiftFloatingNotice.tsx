/**
 * Compact floating glass gift notification for eligible free users.
 * Shows at ~60s intervals while browsing non-editor routes.
 * Dismissible; never reopens in the same session after dismiss.
 * Does not cover editor, prompt bar, or generation workflow.
 */
import { useEffect, useState } from "react";
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

const EDITOR_PATHS = ["/editor", "/studio/image/circle-remove", "/studio/image/filter-editor"];

function isEditorPath(pathname: string): boolean {
  if (pathname === "/editor" || pathname.startsWith("/editor/")) return true;
  return EDITOR_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function GiftFloatingNotice() {
  const { user, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
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

    let intervalId: number | undefined;
    const first = window.setTimeout(() => {
      setVisible(true);
      trackAdEvent("impression", "gift-float");
      intervalId = window.setInterval(() => {
        try {
          if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
        } catch {
          /* ignore */
        }
        if (isEditorPath(window.location.pathname)) return;
        setVisible(true);
        trackAdEvent("impression", "gift-float");
      }, INTERVAL_MS);
    }, FIRST_DELAY_MS);

    return () => {
      window.clearTimeout(first);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user, profile, loading, pathname, dismissed]);

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
