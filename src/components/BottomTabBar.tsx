import { Link } from "@tanstack/react-router";
import { Home, Sparkles, History, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Mobile-only fixed bottom navigation. Hidden on md+ (desktop uses the top nav).
 * Renders 5 primary destinations. Profile falls back to /auth when signed out.
 */
export function BottomTabBar() {
  const { user } = useAuth();
  const profileHref = user ? "/dashboard" : "/auth";

  const items: {
    to: string;
    label: string;
    icon: typeof Home;
    exact?: boolean;
  }[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/studio", label: "Studio", icon: Sparkles },
    { to: "/history", label: "History", icon: History },
    { to: "/chat", label: "Chat", icon: MessageSquare },
    { to: profileHref, label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-6xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={label} className="flex-1">
            <Link
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
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
