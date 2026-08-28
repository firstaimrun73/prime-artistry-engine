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

import { Coins, ShieldCheck, AlertTriangle, Menu } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavItem = { to: any; label: string };

const PUBLIC_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/about", label: "About" },
  { to: "/studio", label: "Studio" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQs" },
  { to: "/security", label: "Security" },
  { to: "/support", label: "Support" },
  { to: "/tickets", label: "Tickets" },
];

/** Auth users: app navigation (not marketing page links). */
const AUTH_LINKS_BASE: NavItem[] = [
  { to: "/studio", label: "Studio" },
  { to: "/history", label: "History" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pricing", label: "Plans" },
];

const CHAT_LINK: NavItem = { to: "/chat", label: "Chat" };

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdminEmail(profile?.email);
  const showChat = admin || isPaidPlan(profile?.plan);

  const authLinks: NavItem[] = showChat
    ? [...AUTH_LINKS_BASE, CHAT_LINK]
    : AUTH_LINKS_BASE;
  // Signed-in: application nav only (Studio, History, optional Chat).
  // Pre-login: full marketing links.
  const links: NavItem[] = user ? authLinks : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-4">
        <Link
          to="/"
          className="notranslate flex shrink-0 items-center gap-1.5 sm:gap-2"
          translate="no"
          aria-label="Motio2edit home"
        >
          <BrandMark />
          <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">by Motion2AI</span>
        </Link>

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-foreground" }}
              activeOptions={l.to === "/" ? { exact: true } : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

        <div className="flex items-center gap-2 sm:gap-3">
          <GoogleLanguageSelect />
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
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
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
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}>
                Get started
              </Button>
            </div>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu" className="h-9 w-9 shrink-0 lg:hidden">
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
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    activeProps={{ className: "bg-secondary text-foreground" }}
                    activeOptions={l.to === "/" ? { exact: true } : undefined}
                    className="rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
                {user && admin && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-primary hover:bg-secondary"
                  >
                    <ShieldCheck className="h-4 w-4" /> Admin
                  </Link>
                )}
                {!user && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-border px-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate({ to: "/auth", search: { redirect: undefined } });
                      }}
                    >
                      Sign in
                    </Button>
                    <Button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate({ to: "/auth", search: { redirect: undefined } });
                      }}
                    >
                      Get started
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
