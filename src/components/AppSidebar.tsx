import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Sparkles, Image as ImageIcon, Video, Music, History, MessageSquare, User, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Desktop vertical sidebar for authenticated routes.
 * Hidden on mobile (< md) — BottomTabBar handles mobile.
 */
const ITEMS: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/studio", label: "Studio", icon: Sparkles },
  { to: "/studio/image", label: "Image", icon: ImageIcon },
  { to: "/studio/video", label: "Video", icon: Video },
  { to: "/studio/music", label: "Music", icon: Music },
  { to: "/history", label: "History", icon: History },
  { to: "/chat", label: "Chat", icon: MessageSquare },
];


export function AppSidebar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-sidebar/80 backdrop-blur md:flex"
    >
      <Link to="/" className="flex items-center gap-2 px-5 py-4 font-extrabold tracking-tight">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="flex items-baseline gap-1.5 text-lg">
          MOTI<span className="text-primary">O2</span>EDIT
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-3">
        {ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={label}
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
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <Link
          to={user ? "/dashboard" : "/auth"}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <User className="h-4 w-4" /> Profile
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
