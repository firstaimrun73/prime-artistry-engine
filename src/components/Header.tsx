import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CrownBadge } from "@/components/CrownBadge";
import { isAdminEmail } from "@/lib/admin-config";

import { Sparkles, Coins, ShieldCheck } from "lucide-react";

export function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="flex items-baseline gap-1.5 text-lg">
            MOTI<span className="text-primary">O2</span>EDIT
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
              by Motion2AI
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }} className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link to="/features" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link to="/studio" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Studio
          </Link>
          <Link to="/pricing" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link to="/faq" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            FAQs
          </Link>
          <Link to="/security" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Security
          </Link>
          <Link to="/support" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Support
          </Link>
          <Link to="/tickets" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Tickets
          </Link>
          {user && (
            <>
              <Link to="/editor" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                Editor
              </Link>
              <Link to="/history" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                History
              </Link>
              <Link to="/music" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                Music
              </Link>
              <Link to="/chat" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                Chat
              </Link>
              {isAdminEmail(profile?.email) && (
                <Link to="/admin" activeProps={{ className: "text-foreground" }} className="inline-flex items-center gap-1 text-primary transition-colors hover:text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">

          {user ? (
            <>
              {profile && (
                <Link
                  to="/dashboard"
                  className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold sm:flex"
                >
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  {isAdminEmail(profile.email) ? "∞ credits" : `${profile.credits} credits`}
                </Link>
              )}
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
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth", search: {} })}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/auth", search: {} })}>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
