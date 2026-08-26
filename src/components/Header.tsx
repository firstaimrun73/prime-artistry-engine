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
          <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground xl:inline">
            <span className="notranslate" translate="no">by Motion2AI</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-foreground" }}
              activeOptions={l.to === "/" ? { exact: true } : undefined}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {user && admin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <div className="notranslate shrink-0" translate="no" data-no-translate>
            <GoogleLanguageSelect className="shrink-0" />
          </div>

          {user ? (
            <>
              {profile &&
                (() => {
                  const c = profile.credits;
                  const tone = admin
                    ? ""
                    : c <= 0
                      ? "text-destructive font-bold animate-pulse"
                      : c < 10
                        ? "text-destructive animate-pulse"
                        : c <= 30
                          ? "text-amber-500"
                          : "";
                  return (
                    <Link
                      to="/dashboard"
                      className={`hidden items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold sm:inline-flex ${tone}`}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      {admin ? "∞" : c.toLocaleString()}
                    </Link>
                  );
                })()}
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <CrownBadge plan={profile?.plan ?? "free"} />
                  <span className="text-xs text-muted-foreground">Dashboard</span>
                </Button>
              </Link>
              <Link to="/profile" className="shrink-0">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">
                    {(profile?.email ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Get started
              </Button>
            </>
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
