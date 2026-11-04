/**
 * Compact discovery hint on Home — points users to Maluto AI.
 * Mobile: near bottom center (+ entry). Desktop: near header Maluto path.
 * Dismissible once per session; not a blocking modal.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

const SESSION_KEY = "motio2edit-maluto-home-hint-dismissed";

export function MalutoHomeHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Mobile: above bottom tab bar, center-ish toward + */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[max(4.75rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-3 md:hidden"
        role="status"
      >
        <div
          className="pointer-events-auto relative max-w-[min(20rem,92vw)] animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationFillMode: "both" }}
        >
          <Link
            to="/studio/image/auto-edit"
            onClick={dismiss}
            className="block rounded-2xl border border-orange-500/40 bg-card/95 px-3.5 py-2.5 shadow-lg shadow-orange-500/15 backdrop-blur-md"
          >
            <p className="text-sm font-bold text-foreground">Restore your photo here</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Bring your memories back to life with Maluto AI.
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-1 text-orange-500" aria-hidden>
              <span className="text-[10px] font-semibold uppercase tracking-wide">Tap +</span>
              <svg width="16" height="20" viewBox="0 0 16 20" className="animate-bounce">
                <path
                  d="M8 2v12M3 10l5 6 5-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Desktop: top-right near header nav (Maluto is in header) */}
      <div className="pointer-events-none fixed right-6 top-20 z-30 hidden md:block">
        <div className="pointer-events-auto relative w-64 animate-in fade-in slide-in-from-top-2 duration-500">
          <Link
            to="/studio/image/auto-edit"
            onClick={dismiss}
            className="block rounded-2xl border border-orange-500/35 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md"
          >
            <p className="text-sm font-bold">Restore your photo here</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open Maluto AI from the header — or click this card.
            </p>
            <span className="mt-2 inline-flex text-xs font-bold text-orange-600">
              Go to Maluto AI →
            </span>
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background shadow"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
