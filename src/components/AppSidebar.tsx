import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Image as ImageIcon, Video, Music, History, MessageSquare, User, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessChat, canAccessVideo, canAccessMusic } from "@/lib/policy";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/lib/i18n";

/**
 * Desktop vertical sidebar for authenticated routes.
 * Free: Home, Image, History (+ Profile/Settings).
 * Paid Lite+: Image + Video + Music + Chat per canAccess* helpers.
 */
export function AppSidebar() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;

  const showVideo = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const showMusic = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const showChat = canAccessChat({ plan, email: profile?.email, isAdmin: admin });

  type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
  const items: NavItem[] = [
    { to: "/", label: t("nav.home"), icon: Home, exact: true },
    { to: "/studio/image", label: t("nav.image"), icon: ImageIcon },
  ];
  if (showVideo) items.push({ to: "/studio/video", label: t("nav.video"), icon: Video });
  if (showMusic) items.push({ to: "/studio/music", label: t("nav.music"), icon: Music });
  items.push({ to: "/history", label: t("nav.history"), icon: History });
  if (showChat) items.push({ to: "/chat", label: t("nav.chat"), icon: MessageSquare });

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-sidebar/80 backdrop-blur md:flex"
    >
      <Link to="/" className="flex items-center gap-2 px-5 py-4">
        <BrandMark />
      </Link>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to + label}
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <Link
          to={user ? "/dashboard" : "/auth"}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <User className="h-4 w-4" /> {t("nav.profile")}
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" /> {t("nav.settings")}
        </Link>
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-xs text-muted-foreground">{t("settings.theme")}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
