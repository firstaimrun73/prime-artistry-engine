import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, History, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessChat } from "@/lib/policy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Focused workspaces must not show the app bottom nav. */
function hideBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/studio/image/circle-remove")) return true;
  if (pathname.startsWith("/studio/image/auto-edit")) return true;
  if (pathname.startsWith("/editor")) return true;
  return false;
}

/** Distinctive Auto Edit mark: stylized A + spark in brand orange. */
function AutoEditNavIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "relative grid h-6 w-6 place-items-center rounded-full text-[11px] font-black leading-none",
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(24_95%_53%/0.55)]"
          : "bg-primary/15 text-primary",
      )}
      aria-hidden
    >
      A
      <span className="absolute -right-0.5 -top-0.5 text-[8px] leading-none">✦</span>
    </span>
  );
}

/**
 * Mobile-only fixed bottom navigation. Hidden on md+ and on focused edit workspaces.
 * Studio (not Image Editor) is the primary creative entry; Auto Edit is a distinctive AI action.
 */
export function BottomTabBar() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;
  if (hideBottomNav(pathname)) return null;

  const admin = isAdminEmail(profile?.email);
  const showChat = canAccessChat({ plan: profile?.plan, email: profile?.email, isAdmin: admin });
  const autoActive = pathname.startsWith("/studio/image/auto-edit");
  const studioActive =
    pathname === "/studio" ||
    pathname.startsWith("/studio/image") ||
    pathname.startsWith("/studio/video") ||
    pathname.startsWith("/studio/music") ||
    pathname.startsWith("/music");

  const items: {
    to: string;
    label: string;
    icon?: typeof Home;
    exact?: boolean;
    special?: "auto";
  }[] = [
    { to: "/", label: t("nav.home"), icon: Home, exact: true },
    { to: "/studio", label: "Studio", icon: LayoutGrid },
    { to: "/studio/image/auto-edit", label: "Auto", special: "auto" },
    { to: "/history", label: t("nav.history"), icon: History },
    ...(showChat ? [{ to: "/chat", label: t("nav.chat"), icon: MessageSquare }] : []),
    { to: "/dashboard", label: t("nav.profile"), icon: User },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-6xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact, special }) => {
          const isStudio = to === "/studio";
          return (
            <li key={to + label} className="flex-1">
              <Link
                to={to}
                activeOptions={exact ? { exact: true } : undefined}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  isStudio && studioActive && "text-primary",
                  special === "auto" && autoActive && "text-primary",
                )}
              >
                {special === "auto" ? (
                  <AutoEditNavIcon active={autoActive} />
                ) : Icon ? (
                  <Icon className="h-5 w-5" />
                ) : null}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
