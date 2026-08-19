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

    const first = window.setTimeout(runCycle, 8000);
    const id = window.setInterval(runCycle, 12000);
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

      <span
        className={cn(
          "absolute text-base font-black tracking-tight transition-all duration-500",
          phase === "travel" &&
            "translate-x-[-6px] translate-y-[-8px] rotate-[-12deg] scale-90 opacity-90",
          phase === "spark" && "translate-x-0 translate-y-0 rotate-0 scale-110 opacity-100",
          phase === "hold" &&
            "translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100 animate-[autoSettle_0.45s_cubic-bezier(0.34,1.56,0.64,1)]",
          phase === "rest" && "scale-0 opacity-0",
          reduced && active && "scale-100 opacity-100",
        )}
      >
        A
      </span>

      {showSpark && (
        <span className="pointer-events-none absolute text-[10px] text-white/90 animate-[autoSpark_0.22s_ease-out]">
          ✦
        </span>
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
          0% { opacity: 0; transform: scale(0.5) translateY(4px); }
          50% { opacity: 1; transform: scale(1.2) translateY(-2px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-8px); }
        }
      `}</style>
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
    (pathname === "/studio" ||
      pathname.startsWith("/studio/image") ||
      pathname.startsWith("/studio/video") ||
      pathname.startsWith("/studio/music") ||
      pathname.startsWith("/music")) &&
    !autoActive;

  const left = [
    { to: "/", label: t("nav.home"), icon: Home, exact: true },
    { to: "/studio", label: "Studio", icon: LayoutGrid },
  ] as const;
  const right = [
    { to: "/history", label: t("nav.history"), icon: History },
    { to: "/dashboard", label: t("nav.profile"), icon: User },
  ] as const;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur transition-transform duration-300 md:hidden",
        hiddenByScroll && "translate-y-full",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
        {left.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex justify-center">
            <Link
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                to === "/studio" && studioActive && "text-primary",
              )}
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
            <span className="-mt-1">Auto</span>
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
