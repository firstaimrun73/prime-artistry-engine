/**
 * Compact discovery hint on Home — Maluto AI.
 * Mobile only. 30-minute cooldown after dismiss; session + localStorage.
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";

const STORAGE_KEY = "motio2edit-maluto-home-hint-until";
const SESSION_KEY = "motio2edit-maluto-home-hint-session";
const COOLDOWN_MS = 30 * 60 * 1000;
const SHOW_DELAY_MS = 2500;
const SCROLL_HIDE_PX = 48;

function isSuppressed(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return true;
    const until = Number(localStorage.getItem(STORAGE_KEY) || "0");
    if (until && Date.now() < until) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function suppress(cooldownMs = COOLDOWN_MS) {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
    localStorage.setItem(STORAGE_KEY, String(Date.now() + cooldownMs));
  } catch {
    /* ignore */
  }
}

export function MalutoHomeHint() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);

  const onMaluto = pathname.startsWith("/studio/image/auto-edit");

  useEffect(() => {
    if (onMaluto) {
      suppress(COOLDOWN_MS);
      setVisible(false);
      return;
    }
    if (isSuppressed()) return;
    const t = window.setTimeout(() => {
      if (!isSuppressed()) setVisible(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [onMaluto]);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => {
      setScrolledAway(window.scrollY > SCROLL_HIDE_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    suppress(COOLDOWN_MS);
  };

  if (onMaluto || !visible || scrolledAway) return null;

  return (
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
  );
}
