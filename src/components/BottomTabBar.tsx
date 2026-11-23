import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, User, Crown, Plus, Compass } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { bottomNavOrder, type NavTabId } from "@/lib/nav-priority";
import { hideBottomNav } from "@/components/hideBottomNav";
export { hideBottomNav };

/** Studio → Pricing → Discover → Maluto → Profile. iOS glassy capsule. */
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
    const check = () => setHiddenByKeyboard(vv.height < window.innerHeight * 0.75);
    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/studio") {
      setHiddenByComposer(false);
      return;
    }
    const observer = new MutationObserver(() => {
      setHiddenByComposer(document.documentElement.classList.contains("studio-composer-focus"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setHiddenByComposer(document.documentElement.classList.contains("studio-composer-focus"));
    return () => observer.disconnect();
  }, [pathname]);

  const catalog = useMemo(
    () =>
      ({
        discover: {
          to: "/" as const,
          label: "Discover",
          icon: Compass,
          active: pathname === "/" || pathname.startsWith("/discover"),
        },
        studio: {
          to: "/studio" as const,
          label: "Studio",
          icon: LayoutGrid,
          active:
            pathname === "/studio" ||
            (pathname.startsWith("/studio/") && !pathname.startsWith("/studio/image/auto-edit")),
        },
        maluto: {
          to: "/studio/image/auto-edit" as const,
          label: "Maluto AI",
          icon: Plus,
          active: pathname.startsWith("/studio/image/auto-edit"),
        },
        pricing: {
          to: "/pricing" as const,
          label: t("nav.pricing") || "Pricing",
          icon: Crown,
          active: pathname.startsWith("/pricing") || pathname.startsWith("/checkout"),
        },
        profile: {
          to: "/profile" as const,
          label: t("nav.profile") || "Profile",
          icon: User,
          active:
            pathname.startsWith("/profile") ||
            pathname.startsWith("/settings") ||
            pathname.startsWith("/dashboard"),
        },
      }) satisfies Record<
        NavTabId,
        {
          to: "/" | "/studio" | "/studio/image/auto-edit" | "/pricing" | "/profile";
          label: string;
          icon: typeof Compass;
          active: boolean;
        }
      >,
    [pathname, t],
  );

  const items = useMemo(() => bottomNavOrder().map((id) => catalog[id]), [catalog]);

  if (!user) return null;

  const shouldHide = hideBottomNav(pathname) || hiddenByScroll || hiddenByKeyboard || hiddenByComposer;

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
              "bottom-[max(0.65rem,env(safe-area-inset-bottom))]",
              "rounded-[2rem]",
              "border border-white/25 dark:border-white/12",
              "bg-background/70 dark:bg-background/55",
              "shadow-[0_12px_40px_rgba(0,0,0,0.28),0_2px_10px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]",
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
          "mx-auto grid h-[3.7rem] max-w-lg grid-cols-5 items-center",
          isIOS ? "px-2.5 gap-0.5" : "px-1",
        )}
      >
        {items.map(({ to, label, icon: Icon, active }) => (
          <li key={to + label} className="flex justify-center">
            <Link
              to={to}
              className={cn(
                "relative flex w-full flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isIOS && active && (
                <span
                  className="absolute inset-x-1 top-0.5 bottom-0.5 -z-10 rounded-2xl bg-primary/14 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
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
