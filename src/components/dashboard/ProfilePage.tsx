import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { getTier } from "@/lib/plan-tier";
import { CrownBadge } from "@/components/CrownBadge";
import { CreditsUsageBar } from "@/components/dashboard/CreditsUsageBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AVATAR_PRESETS,
  isPresetAvatar,
  presetIdFromUrl,
  resolveAvatarSrc,
} from "@/lib/avatar-presets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Settings,
  Shield,
  Mail,
  Ticket,
  CreditCard,
  LogOut,
  Check,
} from "lucide-react";

/**
 * Account / profile page — identity, credits, preferences links.
 * No studio catalogue. No large editor CTA.
 */
export function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [savingPreset, setSavingPreset] = useState(false);

  if (!profile) return null;

  const plan = getPlan(profile.plan);
  const tier = getTier(profile.plan);
  const allocation = PLAN_CREDITS[profile.plan] ?? 0;
  const used = Math.max(0, allocation - profile.credits);
  const name = (profile.display_name || "creator").trim() || "creator";
  const initial = (profile.display_name || profile.email || "U").slice(0, 1).toUpperCase();
  const avatarSrc = resolveAvatarSrc(profile.avatar_url, profile.avatar_signed_url);
  const activePreset = presetIdFromUrl(profile.avatar_url);
  const canChangeAvatar = tier.canUploadAvatar || !profile.avatar_url || isPresetAvatar(profile.avatar_url);

  const selectPreset = async (presetId: string) => {
    setSavingPreset(true);
    try {
      // Presets are free for everyone; upload remains gated on Settings for paid plans.
      const value = `preset:${presetId}`;
      if (profile.avatar_url && !isPresetAvatar(profile.avatar_url)) {
        // Leave uploaded file in storage; user can clear from Settings.
      }
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: value })
        .eq("id", profile.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refreshProfile();
      toast.success("Avatar updated.");
    } finally {
      setSavingPreset(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 pb-24 md:py-10 md:pb-12">
      {/* Identity */}
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
            <p className="mt-2 text-sm text-muted-foreground">
              {plan.name} plan
            </p>
          </div>
        </div>

        {/* Preset avatar picker */}
        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm font-semibold">Choose an avatar</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a style below, or upload a photo in Settings.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {AVATAR_PRESETS.map((p) => {
              const selected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={savingPreset || !canChangeAvatar}
                  onClick={() => selectPreset(p.id)}
                  className={
                    "relative h-12 w-12 overflow-hidden rounded-full border-2 transition-transform active:scale-95 disabled:opacity-50 " +
                    (selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border")
                  }
                  aria-label={`Select ${p.label} avatar`}
                  aria-pressed={selected}
                >
                  <img src={p.src} alt="" className="h-full w-full object-cover" />
                  {selected && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/25">
                      <Check className="h-4 w-4 text-primary-foreground drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Link
            to="/settings"
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            Upload a custom photo in Settings →
          </Link>
        </div>
      </section>

      {/* Credits */}
      <CreditsUsageBar
        available={profile.credits}
        used={used}
        allocation={allocation}
      />

      {/* Account links */}
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
              <p className="text-xs text-muted-foreground">Name, theme, language, avatar upload</p>
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

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
        {profile.plan !== "business" && profile.plan !== "ultra" && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">View plans</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
