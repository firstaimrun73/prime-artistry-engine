import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Coins } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandMark } from "@/components/BrandMark";
import { CrownBadge } from "@/components/CrownBadge";
import { GoogleLanguageSelect } from "@/components/TranslateWidget";
import { resolveAvatarSrc } from "@/lib/avatar";

type NavItem = { to: string; label: string };

const PUBLIC_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/studio/image/auto-edit", label: "Maluto AI" },
];

const CHAT_LINK: NavItem = { to: "/chat", label: "Chat" };

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const signedInLinks: NavItem[] = [
    { to: "/studio", label: "Studio" },
    { to: "/studio/image/auto-edit", label: "Maluto AI" },
    { to: "/pricing", label: "Pricing" },
  ];

  const sheetLinks = user ? signedInLinks : PUBLIC_LINKS;

  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, profile?.avatar_signed_url, {
    nameOrEmail: profile?.display_name || profile?.email,
    userId: profile?.id || user?.id,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {(user ? signedInLinks : PUBLIC_LINKS).map((l) => (
            <Link
              key={`${l.to}-${l.label}`}
              to={l.to}
              activeProps={{ className: "text-foreground" }}
              activeOptions={l.to === "/" ? { exact: true } : undefined}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {user && admin && (
            <Link
              to="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? <GoogleLanguageSelect /> : null}

          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate({ to: "/profile" })}
                className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-foreground sm:inline-flex"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {(profile?.credits ?? 0).toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/profile" })}
                className="relative rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="Open profile"
                title="Profile"
              >
                <Avatar className="h-9 w-9 border border-border transition hover:opacity-90">
                  <AvatarImage src={avatarSrc} alt="" />
                  <AvatarFallback>
                    {(profile?.display_name || profile?.email || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isPaidPlan(profile?.plan) && (
                  <span className="absolute -right-1 -top-1 pointer-events-none">
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
                  {sheetLinks.map((l) => (
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
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    Settings
                  </Link>
                  {admin ? (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-base font-medium text-primary"
                    >
                      Admin
                    </Link>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
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
                  {sheetLinks.map((l) => (
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
          )}
        </div>
      </div>
    </header>
  );
}
