import { Link } from "@tanstack/react-router";
import { Home, Image as ImageIcon, History, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessChat } from "@/lib/policy";

/**
 * Mobile-only fixed bottom navigation. Hidden on md+ (desktop uses sidebar).
 * Chat is paid-only. Free users get Home / Image / History / Profile.
 */
export function BottomTabBar() {
  const { user, profile } = useAuth();
  if (!user) return null;

  const admin = isAdminEmail(profile?.email);
  const showChat = canAccessChat({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  const items: {
    to: string;
    label: string;
    icon: typeof Home;
    exact?: boolean;
  }[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/studio/image", label: "Image", icon: ImageIcon },
    { to: "/history", label: "History", icon: History },
    ...(showChat
      ? [{ to: "/chat", label: "Chat", icon: MessageSquare }]
      : []),
    { to: "/dashboard", label: "Profile", icon: User },
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
