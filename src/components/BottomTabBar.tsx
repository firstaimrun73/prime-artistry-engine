import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, User, Crown, Plus, Home } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { hideBottomNav } from "@/components/hideBottomNav";
export { hideBottomNav };

/**
 * Mobile bottom nav — Home restored + Studio | Maluto AI | Pricing | Profile
 * iPhone: floating capsule with strong left/right curves + safe-area.
 * On /studio: hide when keyboard opens or composer is focused.
 */
export function BottomTabBar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  const [hiddenByKeyboard, setHiddenByKeyboard] = useState(false);
  const [hiddenByComposer, setHiddenByComposer] = useState(false);

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

  useEffect(() => {
    const onStudio = pathname === "/studio" || pathname.startsWith("/studio/");
    if (!onStudio) {
      setHiddenByKeyboard(false);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      const keyboardOpen = vv.height < window.innerHeight * 0.75;
      setHiddenByKeyboard(keyboardOpen);
    };
    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, [pathname]);

  useEffect(() => {
    const onStudio = pathname === "/studio";
    if (!onStudio) {
      setHiddenByComposer(false);
      return;
    }
    const observer = new MutationObserver(() => {
      setHiddenByComposer(document.documentElement.classList.contains("studio-composer-focus"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    setHiddenByComposer(document.documentElement.classList.contains("studio-composer-focus"));
    return () => observer.disconnect();
  }, [pathname]);

  if (!user) return null;

  const shouldHide = hideBottomNav(pathname) || hiddenByScroll || hiddenByKeyboard || hiddenByComposer;

  const items = [
    {
      to: "/" as const,
      label: t("nav.home") || "Home",
      icon: Home,
      active: pathname === "/",
    },
    {
      to: "/studio" as const,
      label: "Studio",
      icon: LayoutGrid,
      active: pathname === "/studio" || (pathname.startsWith("/studio/") && !pathname.startsWith("/studio/image/auto-edit")),
    },
    {
      to: "/studio/image/auto-edit" as const,
      label: "Maluto AI",
      icon: Plus,
      active: pathname.startsWith("/studio/image/auto-edit"),
    },
    {
      to: "/pricing" as const,
      label: t("nav.pricing") || "Pricing",
      icon: Crown,
      active: pathname.startsWith("/pricing") || pathname.startsWith("/checkout"),
    },
    {
      to: "/profile" as const,
      label: t("nav.profile") || "Profile",
      icon: User,
      active: pathname.startsWith("/profile") || pathname.startsWith("/settings") || pathname.startsWith("/dashboard"),
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
        "transition-transform duration-300 ease-out",
        shouldHide && "translate-y-[120%] pointer-events-none opacity-0",
        isIOS
          ? [
              "left-3 right-3",
              "bottom-[max(0.6rem,env(safe-area-inset-bottom))]",
              "rounded-[1.75rem]",
              "border border-white/20 dark:border-white/10",
              "bg-background/75 dark:bg-background/70",
              "shadow-[0_10px_40px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.08)]",
              "backdrop-blur-2xl backdrop-saturate-150",
              "ring-1 ring-black/5 dark:ring-white/10",
            ].join(" ")
          : "inset-x-0 bottom-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
      )}
      aria-label="Primary"
      aria-hidden={shouldHide}
    >
      <ul
        className={cn(
          "mx-auto grid h-[3.6rem] max-w-lg grid-cols-5 items-center",
          isIOS ? "px-2.5 gap-0.5" : "px-1",
        )}
      >
        {items.map(({ to, label, icon: Icon, active }) => (
          <li key={to} className="flex justify-center">
            <Link
              to={to}
              className={cn(
                "relative flex w-full flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isIOS && active && (
                <span
                  className="absolute inset-x-1 top-0.5 bottom-0.5 -z-10 rounded-2xl bg-primary/12"
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active && isIOS && "scale-110 text-primary",
                  active && "text-primary",
                  active && label === "Maluto AI" && "motion-safe:animate-[malutoPlusPulse_1.6s_ease-in-out_infinite]",
                  !active && label === "Maluto AI" && "motion-safe:animate-[malutoPlusIdle_2.8s_ease-in-out_infinite]",
                )}
                strokeWidth={label === "Maluto AI" ? 2.4 : undefined}
              />
              <span className={cn(active && "font-semibold")}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes malutoPlusPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          40% { transform: scale(1.18) rotate(90deg); }
          70% { transform: scale(1.08) rotate(90deg); }
        }
        @keyframes malutoPlusIdle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.92; }
        }
      `}</style>
    </nav>
  );
}
