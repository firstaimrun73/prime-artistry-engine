import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Image as ImageIcon,
  Video,
  Music,
  History,
  MessageSquare,
  User,
  Settings,
  Crown,
  Sparkles,
  LayoutGrid,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessChat, canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/lib/i18n";

/**
 * Desktop vertical sidebar for authenticated routes (md+).
 * Primary navigation when signed in — Header no longer repeats these links.
 */
export function AppSidebar() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const paid = admin || isPaidPlan(plan);

  const showVideo = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const showMusic = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const showChat = canAccessChat({ plan, email: profile?.email, isAdmin: admin });

  type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
  const items: NavItem[] = [
    { to: "/", label: t("nav.home") || "Home", icon: Home, exact: true },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/studio", label: "AI Studio", icon: LayoutGrid },
    { to: "/studio/image", label: t("nav.image") || "Image", icon: ImageIcon },
    { to: "/studio/image/auto-edit", label: "Maluto AI", icon: Sparkles },
  ];
  if (showVideo) items.push({ to: "/studio/video", label: t("nav.video") || "Video", icon: Video });
  if (showMusic) items.push({ to: "/studio/music", label: t("nav.music") || "Music", icon: Music });
  if (paid) {
    items.push({ to: "/history", label: t("nav.history") || "History", icon: History });
  }
  items.push({ to: "/pricing", label: "Pricing", icon: Crown });
  if (showChat) items.push({ to: "/chat", label: t("nav.chat") || "Chat", icon: MessageSquare });

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-sidebar/80 backdrop-blur md:flex"
    >
      <Link to="/" className="flex items-center gap-2 px-5 py-4">
        <BrandMark />
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === to
            : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to + label}
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        <Link
          to={user ? "/profile" : "/auth"}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/profile")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" /> {t("nav.profile") || "Profile"}
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" /> {t("nav.settings") || "Settings"}
        </Link>
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-xs text-muted-foreground">{t("settings.theme") || "Theme"}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
