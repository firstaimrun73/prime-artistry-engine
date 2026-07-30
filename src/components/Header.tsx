import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CrownBadge } from "@/components/CrownBadge";
import { isAdminEmail } from "@/lib/admin-config";

import { Sparkles, Coins, ShieldCheck, AlertTriangle, Menu } from "lucide-react";

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

const AUTH_LINKS: NavItem[] = [
  { to: "/editor", label: "Editor" },
  { to: "/history", label: "History" },
  { to: "/chat", label: "Chat" },
];

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdminEmail(profile?.email);

  const links: NavItem[] = [...PUBLIC_LINKS, ...(user ? AUTH_LINKS : [])];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 lg:flex lg:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate text-base leading-none whitespace-nowrap sm:text-lg">
            MOTI<span className="text-primary">O2</span>EDIT
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground xl:inline">
            by Motion2AI
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
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
              activeProps={{ className: "text-foreground" }}
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {profile && (() => {
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
                    className={`hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold sm:flex ${tone}`}
                  >
                    {!admin && c <= 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Coins className={`h-3.5 w-3.5 ${tone ? "" : "text-primary"}`} />
                    )}
                    {admin ? "∞ credits" : `${c} credits`}
                  </Link>
                );
              })()}

              {profile && <CrownBadge plan={profile.plan} className="hidden sm:inline-flex" />}
              <Link to="/dashboard" aria-label="Account" className="transition-opacity hover:opacity-80">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_signed_url ?? undefined} alt={profile?.display_name ?? "Account"} />
                  <AvatarFallback className="text-xs">
                    {(profile?.display_name || profile?.email || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="px-2.5 sm:px-3"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Get started
              </Button>
            </>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu" className="h-9 w-9 lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs overflow-y-auto p-0">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4 font-extrabold">
                <Sparkles className="h-5 w-5 text-primary" />
                MOTI<span className="-ml-1 text-primary">O2</span>
                <span className="-ml-1">EDIT</span>
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
