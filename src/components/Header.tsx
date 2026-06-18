import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins } from "lucide-react";

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg">
            MOTIO<span className="text-primary">2</span>EDIT
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }} className="transition-colors hover:text-foreground">
            Home
          </Link>
          <Link to="/pricing" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          {user && (
            <>
              <Link to="/editor" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                Editor
              </Link>
              <Link to="/chat" activeProps={{ className: "text-foreground" }} className="transition-colors hover:text-foreground">
                Chat
              </Link>
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
                  {profile.credits} credits
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
                Account
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/pricing" })}>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
