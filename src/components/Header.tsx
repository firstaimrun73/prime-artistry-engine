import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CrownBadge } from "@/components/CrownBadge";
import { BrandMark } from "@/components/BrandMark";
import { GoogleLanguageSelect } from "@/components/TranslateWidget";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { resolveAvatarSrc } from "@/lib/avatar-presets";

import { Coins, ShieldCheck, Menu } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavItem = { to: any; label: string };

/** Lean public nav — About / Security remain in the footer. */
const PUBLIC_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/studio/image/auto-edit", label: "Maluto AI" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/support", label: "Support" },
];

const CHAT_LINK: NavItem = { to: "/chat", label: "Chat" };

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);
  const showChat = paid;

  const historyOrPlans: NavItem = paid
    ? { to: "/history", label: "History" }
    : { to: "/pricing", label: "Plans" };

  const authLinksBase: NavItem[] = [
    { to: "/", label: "Home" },
    { to: "/studio", label: "AI Studio" },
    { to: "/studio/image/auto-edit", label: "Maluto AI" },
    historyOrPlans,
    { to: "/dashboard", label: "Dashboard" },
    { to: "/pricing", label: "Pricing" },
  ];

  const authLinks: NavItem[] = showChat ? [...authLinksBase, CHAT_LINK] : authLinksBase;
  const links: NavItem[] = user ? authLinks : PUBLIC_LINKS;

  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, profile?.avatar_signed_url, {
    nameOrEmail: profile?.display_name || profile?.email,
    userId: profile?.id || user?.id,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 lg:max-w-7xl">
        <Link
          to="/"
          className="notranslate flex min-w-0 shrink items-center gap-1.5 sm:gap-2"
          translate="no"
          aria-label="Motio2edit home"
        >
          <BrandMark />
          <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">by Motion2AI</span>
        </Link>

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 md:flex">
          {links.map((l) => (
            <Link
              key={`${l.to}-${l.label}`}
              to={l.to}
              activeProps={{ className: "bg-secondary/80 text-foreground" }}
              activeOptions={l.to === "/" ? { exact: true } : undefined}
              className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-2.5 xl:px-3"
            >
              {l.label}
            </Link>
          ))}
          {user && admin && (
            <Link
              to="/admin"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-secondary"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? <GoogleLanguageSelect /> : null}

          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-foreground sm:inline-flex"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {(profile?.credits ?? 0).toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/profile" })}
                className="relative"
                aria-label="Profile"
              >
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={avatarSrc} alt="" />
                  <AvatarFallback>
                    {(profile?.display_name || profile?.email || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isPaidPlan(profile?.plan) && (
                  <span className="absolute -right-1 -top-1">
                    <CrownBadge />
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-sm sm:px-3"
                onClick={() => navigate({ to: "/auth", search: { mode: "signin", redirect: undefined } })}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="h-9 px-2.5 text-sm sm:px-3"
                onClick={() => navigate({ to: "/auth", search: { mode: "signup", redirect: undefined } })}
              >
                Get started
              </Button>
            </div>
          )}

          {/* Mobile menu: signed-in only. Pre-login uses Sign in / Get started in the bar. */}
          {user ? (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu" className="h-9 w-9 shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-xs overflow-y-auto p-0">
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                  <BrandMark />
                </div>
                <nav className="flex flex-col p-2">
                  {links.map((l) => (
                    <Link
                      key={`${l.to}-${l.label}`}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      activeProps={{ className: "bg-secondary text-foreground" }}
                      activeOptions={l.to === "/" ? { exact: true } : undefined}
                      className="rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
    </header>
  );
}
