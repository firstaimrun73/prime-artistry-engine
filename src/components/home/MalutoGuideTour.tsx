/**
 * One-time guided animation showing where Maluto AI lives
 * (center bottom tab + home Ace card). Free users see upgrade path.
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "motio2edit-maluto-tour-v1";

export function MalutoGuideTour() {
  const { user, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (pathname !== "/") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [user, pathname]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open || !user || pathname !== "/") return null;

  const paid =
    isAdminEmail(profile?.email) || isPaidPlan(profile?.plan);

  return (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-label="Where is Maluto AI"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Dismiss tour"
        onClick={dismiss}
      />

      <div className="pointer-events-none absolute bottom-[4.5rem] left-1/2 z-[61] h-20 w-20 -translate-x-1/2 rounded-full bg-orange-500/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-4 ring-orange-400/80 animate-pulse" />

      <div
        className={cn(
          "absolute bottom-[9.5rem] left-1/2 z-[62] w-[min(92vw,22rem)] -translate-x-1/2",
          "rounded-2xl border border-orange-400/40 bg-card p-4 shadow-2xl",
        )}
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

        <div className="mt-3 flex flex-col items-center text-orange-500" aria-hidden>
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Center tab
          </span>
          <span className="mt-1 animate-bounce text-lg leading-none">↓</span>
        </div>
      </div>
    </div>
  );
}
