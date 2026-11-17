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
import { resolveAvatarSrc } from "@/lib/avatar-presets";

type NavItem = { to: string; label: string };

/** Authenticated primary nav — Home restored, then Studio, Maluto AI, Pricing. */
const AUTHED_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/studio", label: "Studio" },
  { to: "/studio/image/auto-edit", label: "Maluto AI" },
  { to: "/pricing", label: "Pricing" },
];

const PUBLIC_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
];

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = isAdminEmail(profile?.email);
  const paid = isPaidPlan(profile?.plan);

  const links = user ? AUTHED_LINKS : PUBLIC_LINKS;

  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, profile?.avatar_signed_url, {
    nameOrEmail: profile?.display_name || profile?.email || user?.email,
    userId: user?.id,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:h-16 sm:px-4">
        <Link to="/" className="shrink-0" aria-label="Motio2edit home">
          <BrandMark size="sm" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <GoogleLanguageSelect />
          </div>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate({ to: "/profile" })}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums"
                title="Credits · Profile"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {(profile?.credits ?? 0).toLocaleString()}
              </button>

              <div className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card p-0.5 pr-1.5 sm:pr-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarSrc} alt="" />
                      <AvatarFallback className="text-xs">
                        {(profile?.display_name || profile?.email || "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {paid ? <CrownBadge className="h-3.5 w-3.5" /> : null}
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                    <Link
                      to="/profile"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                    >
                      Profile
                    </Link>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                      >
                        Admin
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-secondary"
                    >
                      Sign out
                    </button>
                  </div>
                </details>
              </div>
            </>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/auth" search={{ mode: "signin" }}>
                Sign in
              </Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <nav className="mt-8 flex flex-col gap-1">
                {links.map((item) => (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                      className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-secondary"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
