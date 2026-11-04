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

const SOCIAL_LINKS = [
  {
    id: "x",
    label: "X",
    href: "https://x.com/MrZexo89",
    ariaLabel: "Follow Motio2edit on X",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@motio2edit-motion2ai?si=bxYMOW2g-f36nl5",
    ariaLabel: "Follow Motio2edit on YouTube",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/firstaimrun89?cplk=MTMzMTU0MWJydWE5Mg==",
    ariaLabel: "Follow Motio2edit on Instagram",
  },
] as const;

function SocialIcon({ id }: { id: string }) {
  if (id === "x") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.725-8.835L1.24 2.25h7.08l4.263 5.686L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    );
  }
  if (id === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

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
              <p className="text-xs text-muted-foreground">Track support requests · Report a bug</p>
            </div>
          </Link>
        </nav>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Follow Motio2edit</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Follow us for new features, updates and creative inspiration.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.ariaLabel}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-primary">
                <SocialIcon id={s.id} />
              </span>
              {s.label}
            </a>
          ))}
        </div>
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
