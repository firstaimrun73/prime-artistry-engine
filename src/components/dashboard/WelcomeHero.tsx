import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { ArrowRight, Sparkles } from "lucide-react";
import type { PlanId } from "@/lib/plans";

const WELCOME_MESSAGES = [
  "Ready to create something amazing?",
  "Your creativity starts here.",
  "Turn ordinary photos into extraordinary memories.",
  "Your next great creation is just one click away.",
  "Let's make something beautiful today.",
  "Explore what Motio2edit can do for you.",
] as const;

function pickWelcomeMessage(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // Rotate daily so the same user sees variety without pure randomness.
  const day = Math.floor(Date.now() / 86_400_000);
  return WELCOME_MESSAGES[(hash + day) % WELCOME_MESSAGES.length];
}

type Props = {
  displayName: string | null | undefined;
  email: string | null | undefined;
  avatarUrl: string | null | undefined;
  plan: PlanId | null | undefined;
  userId: string;
  showUpgrade: boolean;
};

export function WelcomeHero({
  displayName,
  email,
  avatarUrl,
  plan,
  userId,
  showUpgrade,
}: Props) {
  const name = (displayName || "creator").trim() || "creator";
  const initial = (displayName || email || "U").slice(0, 1).toUpperCase();
  const message = pickWelcomeMessage(userId || email || name);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {/* Soft orange glow — restrained, brand-aligned */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-primary/25 ring-offset-2 ring-offset-card sm:h-[4.25rem] sm:w-[4.25rem]">
            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                Hi, {name}
              </h1>
              <CrownBadge plan={plan} showLabel />
            </div>
            {email && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{email}</p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{message}</span>
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11rem] sm:items-stretch">
          <Button asChild className="w-full btn-animate">
            <Link to="/editor">
              Open Image Editor
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          {showUpgrade && (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/pricing">Upgrade plan</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
