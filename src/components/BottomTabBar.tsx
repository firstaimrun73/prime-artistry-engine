import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, User, Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { hideBottomNav } from "@/components/hideBottomNav";
export { hideBottomNav };

/**
 * Mobile bottom nav — 4 equal items.
 * Studio | Maluto AI | Pricing | Profile
 * Dashboard stays on the header avatar only (no duplicate).
 */
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

  const items = [
    {
      to: "/studio" as const,
      label: t("nav.studio") || "Studio",
      icon: LayoutGrid,
      active: pathname === "/studio" || pathname.startsWith("/studio/") || pathname === "/editor" || pathname === "/music",
    },
    {
      to: "/studio/image/auto-edit" as const,
      label: "Maluto AI",
      icon: Sparkles,
      active: pathname.startsWith("/studio/image/auto-edit"),
    },
    {
      to: "/pricing" as const,
      label: "Pricing",
      icon: Crown,
      active: pathname.startsWith("/pricing"),
    },
    {
      to: "/profile" as const,
      label: t("nav.profile") || "Profile",
      icon: User,
      active:
        pathname === "/profile" ||
        pathname.startsWith("/profile/") ||
        pathname === "/dashboard",
    },
  ];

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  return (
    <nav
      className={cn(
        "fixed z-40 md:hidden",
        "transition-transform duration-300",
        hiddenByScroll && "translate-y-full",
        isIOS
          ? "inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] rounded-[1.35rem] border border-border/60 bg-background/80 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          : "inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
      )}
      aria-label="Primary"
    >
      <ul className={cn("mx-auto grid h-14 max-w-lg grid-cols-4 items-center px-1", isIOS && "px-2")}>
        {items.map(({ to, label, icon: Icon, active }) => (
          <li key={to} className="flex justify-center">
            <Link
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
