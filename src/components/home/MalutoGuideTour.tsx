/**
 * One-time guided tour: measures the real Maluto AI bottom-tab button
 * and pins spotlight + card above it (works across iOS/Android safe areas).
 */
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "motio2edit-maluto-tour-v1";
/** Must match data-maluto-tab on BottomTabBar center link. */
export const MALUTO_TAB_SELECTOR = '[data-maluto-tab="1"]';

type TargetBox = { top: number; left: number; width: number; height: number; cx: number; cy: number };

function measureMalutoTab(): TargetBox | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(MALUTO_TAB_SELECTOR) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  // If tab is scrolled off / translated away, treat as missing
  if (r.bottom < 40 || r.top > window.innerHeight - 8) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

export function MalutoGuideTour() {
  const { user, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<TargetBox | null>(null);

  const refreshTarget = useCallback(() => {
    setTarget(measureMalutoTab());
  }, []);

  useEffect(() => {
    if (!user) return;
    if (pathname !== "/") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    // Scroll to top so BottomTabBar is not scroll-hidden, then open
    const t = window.setTimeout(() => {
      try {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
      setOpen(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, [user, pathname]);

  useLayoutEffect(() => {
    if (!open) return;
    refreshTarget();
    // Retry a few times — tab mounts / layout settles differently per device
    const timers = [50, 150, 350, 700].map((ms) =>
      window.setTimeout(refreshTarget, ms),
    );
    const onResize = () => refreshTarget();
    const onScroll = () => refreshTarget();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onScroll);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("scroll", onScroll);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onScroll);
    };
  }, [open, refreshTarget]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open || !user || pathname !== "/") return null;

  const paid = isAdminEmail(profile?.email) || isPaidPlan(profile?.plan);

  // Spotlight size slightly larger than the measured button
  const hole = target
    ? {
        size: Math.max(target.width, target.height) + 28,
        left: target.cx,
        top: target.cy,
      }
    : null;

  // Card sits above the tab with gap; clamp to viewport
  const cardMaxW = Math.min(window.innerWidth - 24, 352);
  let cardBottom = 120;
  let cardLeft = 12;
  if (target) {
    const gap = 16;
    cardBottom = Math.max(12, window.innerHeight - target.top + gap);
    cardLeft = Math.max(12, Math.min(target.cx - cardMaxW / 2, window.innerWidth - cardMaxW - 12));
  }

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-label="Where is Maluto AI"
    >
      {/* Dim layer — click dismisses */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Dismiss tour"
        onClick={dismiss}
      />

      {/* Measured spotlight hole over real Maluto button */}
      {hole && (
        <div
          className="pointer-events-none absolute z-[61] -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-orange-400 animate-pulse"
          style={{
            left: hole.left,
            top: hole.top,
            width: hole.size,
            height: hole.size,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
            background: "rgba(249, 115, 22, 0.22)",
          }}
          aria-hidden
        />
      )}

      {/* Coach card anchored above the measured button */}
      <div
        className={cn(
          "absolute z-[62] rounded-2xl border border-orange-400/40 bg-card p-4 shadow-2xl",
        )}
        style={{
          left: cardLeft,
          bottom: cardBottom,
          width: cardMaxW,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-violet-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">
              Find Maluto AI
            </p>
            <h2 className="mt-0.5 text-base font-extrabold tracking-tight">
              Restore your photos — just upload
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Tap the glowing center button below labeled{" "}
              <strong className="text-foreground">Maluto AI</strong>. Upload one
              photo and Maluto restores it automatically.
            </p>
            {!paid && (
              <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">
                From $4.99 · Lite plan unlocks Maluto AI Restore
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            to="/studio/image/auto-edit"
            onClick={dismiss}
            className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-violet-600 py-2.5 text-center text-sm font-bold text-white shadow-md"
          >
            Open Maluto AI
          </Link>
          {!paid && (
            <Link
              to="/checkout"
              search={{ plan: "lite", currency: "USD", method: undefined }}
              onClick={dismiss}
              className="flex-1 rounded-full border border-primary/40 bg-background py-2.5 text-center text-sm font-bold text-primary"
            >
              $4.99 Lite
            </Link>
          )}
        </div>

        {/* Arrow points down toward measured tab */}
        <div className="mt-2 flex flex-col items-center text-orange-500" aria-hidden>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {target ? "This button" : "Center tab below"}
          </span>
          <span className="mt-0.5 animate-bounce text-xl leading-none">↓</span>
        </div>
      </div>

      {/* If tab not found yet, still allow open via CTA; no wrong fixed hole */}
      {!hole && (
        <p className="pointer-events-none absolute bottom-24 left-1/2 z-[61] w-[90%] -translate-x-1/2 text-center text-xs font-medium text-white/90">
          Look for the center <strong>Maluto AI</strong> button on the bottom bar
        </p>
      )}
    </div>
  );
}
