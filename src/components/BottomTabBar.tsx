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

function AutoCenterIcon({ active }: { active?: boolean }) {
  const [flash, setFlash] = useState(false);
  const [nudge, setNudge] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const dirs = [
      { x: -6, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: -6 },
      { x: 0, y: 6 },
      { x: -4, y: -4 },
      { x: 4, y: -4 },
    ];
    const cycle = () => {
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      setNudge(d);
      setFlash(true);
      window.setTimeout(() => {
        setNudge({ x: 0, y: 0 });
        setFlash(false);
      }, 1500);
    };
    const first = window.setTimeout(cycle, 8_000);
    const id = window.setInterval(cycle, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return (
    <span
      className={cn(
        "relative flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full border-4 border-background shadow-lg transition-transform duration-500 ease-out",
        flash
          ? "bg-gradient-to-br from-orange-500 via-red-500 to-violet-600 text-white scale-110"
          : "bg-primary text-primary-foreground",
      )}
      style={{ transform: `translate(${nudge.x}px, calc(-0.75rem + ${nudge.y}px))` }}
      aria-hidden
    >
      {flash ? (
        <span className="text-base font-black tracking-tight animate-pulse">A</span>
      ) : (
        <Plus className="h-6 w-6 stroke-[2.5]" />
      )}
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
    pathname === "/studio" ||
    pathname.startsWith("/studio/image") ||
    pathname.startsWith("/studio/video") ||
    pathname.startsWith("/studio/music") ||
    pathname.startsWith("/music");

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
