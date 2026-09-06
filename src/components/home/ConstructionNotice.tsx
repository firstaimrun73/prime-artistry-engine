/**
 * Site-wide construction notice.
 * Shows once per browser until dismissed; re-shows after 24h if they return.
 * Soft message: pricing/credits work; some features still being fixed.
 */
import { useEffect, useState } from "react";
import { Construction, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "motio2edit-construction-dismissed-until";
const DISMISS_MS = 24 * 60 * 60 * 1000; // 24h

export function ConstructionNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Date.now() < until) return;
    } catch {
      /* private mode */
    }
    // Slight delay so it doesn't fight first paint
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="construction-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Construction className="h-5 w-5" />
          </span>
          <div className="min-w-0 pr-6">
            <h2 id="construction-title" className="text-base font-bold tracking-tight sm:text-lg">
              We're still building 🚧
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Motio2edit is live, but some features are under active fix. Don't worry if
              something looks unfinished — we're improving the experience every day.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>
                  <strong className="font-semibold text-foreground">Pricing & credits</strong> for
                  Image, Video, and Music Studio work normally.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">·</span>
                <span>A few tools may still have rough edges while we polish them.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" className="rounded-full px-5" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
