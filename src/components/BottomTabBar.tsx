import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, History, User, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function hideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/studio/video")) return true;
  if (pathname === "/music" || pathname.startsWith("/music/")) return true;
  if (pathname.startsWith("/studio/music")) return true;
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  return false;
}

/**
 * Center Auto mark — motion: rest → travel → AI spark → settle (~1.5s) → rest.
 * Gemini-like multi-star during pulse. Cycle every 10 seconds.
 * Navigation is parent Link only; animation never blocks clicks.
 * Respects prefers-reduced-motion.
 */
function AutoCenterIcon({ active }: { active?: boolean }) {
  const [phase, setPhase] = useState<"rest" | "travel" | "spark" | "hold">("rest");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;
    const timers: number[] = [];

    const runCycle = () => {
      if (cancelled) return;
      setPhase("travel");
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setPhase("spark");
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setPhase("hold");
              timers.push(
                window.setTimeout(() => {
                  if (cancelled) return;
                  setPhase("rest");
                }, 1500),
              );
            }, 220),
          );
        }, 480),
      );
    };

    const first = window.setTimeout(runCycle, 3000);
    const id = window.setInterval(runCycle, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, [reduced]);

  const showA = phase === "hold" || phase === "spark" || (reduced && active);
  const showSpark = phase === "spark";

  return (
    <span
      className={cn(
        "relative flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full border-4 border-background shadow-lg",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "active:scale-90",
        phase === "travel" && "scale-110 shadow-[0_0_20px_hsl(24_95%_53%/0.55)]",
        phase === "spark" && "scale-105 shadow-[0_0_28px_hsl(24_95%_53%/0.7)]",
        phase === "hold" && "scale-105 shadow-[0_0_18px_hsl(24_95%_53%/0.45)]",
        active || phase !== "rest"
          ? "bg-gradient-to-br from-orange-500 via-orange-600 to-violet-600 text-white"
          : "bg-primary text-primary-foreground",
      )}
      aria-hidden
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full bg-orange-400/20",
          phase === "rest" && !reduced && "animate-[autoBreath_3.2s_ease-in-out_infinite]",
        )}
      />

      <Plus
        className={cn(
          "h-6 w-6 stroke-[2.5] transition-all duration-300 ease-out",
          showA || showSpark ? "scale-0 opacity-0 rotate-45" : "scale-100 opacity-100 rotate-0",
        )}
      />

      {/* Gemini-like sparkle mark (A** style) during Auto Edit pulse */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-500",
          phase === "travel" && "scale-90 opacity-90 -rotate-12",
          phase === "spark" && "scale-110 opacity-100 rotate-0",
          phase === "hold" &&
            "scale-100 opacity-100 rotate-0 animate-[autoSettle_0.45s_cubic-bezier(0.34,1.56,0.64,1)]",
          phase === "rest" && "scale-0 opacity-0",
          reduced && active && "scale-100 opacity-100",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 48 48" className="h-7 w-7 text-white drop-shadow" fill="currentColor">
          {/* large 4-point star */}
          <path d="M24 4 L27.2 18.2 L42 21.5 L27.2 24.8 L24 39 L20.8 24.8 L6 21.5 L20.8 18.2 Z" />
          {/* small star (top-right) */}
          <path
            d="M36 6 L37.2 10.2 L41.5 11.5 L37.2 12.8 L36 17 L34.8 12.8 L30.5 11.5 L34.8 10.2 Z"
            className={showSpark ? "opacity-100" : "opacity-80"}
          />
          {/* tiny star (bottom-left) */}
          <path d="M12 30 L12.8 33 L16 33.8 L12.8 34.6 L12 37.5 L11.2 34.6 L8 33.8 L11.2 33 Z" opacity="0.9" />
        </svg>
      </span>

      {showSpark && (
        <span className="pointer-events-none absolute inset-0 rounded-full animate-[autoSpark_0.35s_ease-out] bg-white/25" />
      )}

      <style>{`
        @keyframes autoBreath {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.08); }
        }
        @keyframes autoSettle {
          0% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes autoSpark {
          0% { opacity: 0.6; transform: scale(0.85); }
          50% { opacity: 0.35; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.35); }
        }
      `}</style>
    </span>
  );
}

/** Tab caption: pulses "Auto edit" every ~10s with the center mark. */
function AutoTabLabel({ active }: { active?: boolean }) {
  const [pulse, setPulse] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setPulse(true);
      window.setTimeout(() => {
        if (!cancelled) setPulse(false);
      }, 2200);
    };
    const first = window.setTimeout(run, 3000);
    const id = window.setInterval(run, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [reduced]);

  return (
    <span
      className={cn(
        "-mt-1 max-w-[4.5rem] truncate text-center transition-all duration-300",
        pulse || active ? "font-bold text-primary" : "",
      )}
    >
      {pulse ? "Auto edit" : "Auto"}
    </span>
  );
}

export function BottomTabBar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hiddenByScroll, setHiddenByScroll] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setHiddenByScroll(false);
      return;
    }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY && y > 80) setHiddenByScroll(true);
      else if (y < lastY) setHiddenByScroll(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (!user) return null;
  if (hideBottomNav(pathname)) return null;

  const autoActive = pathname.startsWith("/studio/image/auto-edit");
  const studioActive =
    pathname.startsWith("/studio") && !autoActive;

  const left = [
    { to: "/" as const, label: t("nav.home") || "Home", icon: Home },
    { to: "/studio" as const, label: t("nav.studio") || "Studio", icon: LayoutGrid },
  ];
  const right = [
    { to: "/history" as const, label: t("nav.history") || "History", icon: History },
    { to: "/profile" as const, label: t("nav.profile") || "Profile", icon: User },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden",
        "transition-transform duration-300",
        hiddenByScroll && "translate-y-full",
      )}
      aria-label="Primary"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-end px-1">
        {left.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex justify-center">
            <Link
              to={to}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}

        <li className="flex justify-center">
          <Link
            to="/studio/image/auto-edit"
            aria-label="Auto Edit"
            className={cn(
              "flex flex-col items-center text-[10px] font-semibold",
              autoActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <AutoCenterIcon active={autoActive} />
            <AutoTabLabel active={autoActive} />
          </Link>
        </li>

        {right.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex justify-center">
            <Link
              to={to}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
