import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { CrownBadge } from "@/components/CrownBadge";
import { CreditsUsageBar } from "@/components/dashboard/CreditsUsageBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { resolveAvatarSrc } from "@/lib/avatar-presets";
import {
  Settings,
  Shield,
  Mail,
  Ticket,
  CreditCard,
  LogOut,
} from "lucide-react";

export function ProfilePage() {
  const { profile, signOut } = useAuth();
  const [confirmOut, setConfirmOut] = useState(false);
  if (!profile) return null;

  const plan = getPlan(profile.plan);
  const allocation = PLAN_CREDITS[profile.plan] ?? 0;
  const used = Math.max(0, allocation - profile.credits);
  const name = (profile.display_name || "creator").trim() || "creator";
  const initial = (profile.display_name || profile.email || "U").slice(0, 1).toUpperCase();
  const avatarSrc = resolveAvatarSrc(profile.avatar_url, profile.avatar_signed_url, {
    nameOrEmail: profile.display_name || profile.email,
    userId: profile.id,
  });

  const handleSignOut = async () => {
    if (!confirmOut) {
      setConfirmOut(true);
      return;
    }
    await signOut();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 pb-24 md:py-10 md:pb-12">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-card sm:h-20 sm:w-20">
            <AvatarImage src={avatarSrc} alt={name} />
            <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
              <CrownBadge plan={profile.plan} showLabel />
            </div>
            {profile.email && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.email}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">{plan.name} plan</p>
          </div>
        </div>
      </section>

      <CreditsUsageBar available={profile.credits} used={used} allocation={allocation} />

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Account</h2>
        <nav className="divide-y divide-border">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Settings className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">Name, theme, language, avatar</p>
            </div>
          </Link>
          <Link
            to="/profile/subscription"
            className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <CreditCard className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Subscription & billing</p>
              <p className="text-xs text-muted-foreground">{plan.name} · manage plan</p>
            </div>
          </Link>
          <Link
            to="/security"
            className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Shield className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Security</p>
              <p className="text-xs text-muted-foreground">How we protect your data</p>
            </div>
          </Link>
          <Link
            to="/support"
            className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Mail className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Support</p>
              <p className="text-xs text-muted-foreground">Help center</p>
            </div>
          </Link>
          <Link
            to="/tickets"
            className="flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Ticket className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Tickets</p>
              <p className="text-xs text-muted-foreground">Track support requests</p>
            </div>
          </Link>
        </nav>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {!confirmOut ? (
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        ) : (
          <>
            <Button variant="destructive" className="gap-2" onClick={handleSignOut}>
              Confirm log out
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOut(false)}>
              Cancel
            </Button>
          </>
        )}
        {profile.plan !== "business" && profile.plan !== "ultra" && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">View plans</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
