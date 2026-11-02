import { Link } from "@tanstack/react-router";
import { Coins, Crown, Image as ImageIcon, CheckCircle2, ArrowUpRight } from "lucide-react";
import type { Plan } from "@/lib/plans";

type Props = {
  credits: number;
  used: number;
  allocation: number;
  plan: Plan;
  images: number;
  videos: number;
  musicCount: number;
  showUpgrade: boolean;
};

export function CreditsPlanSection({
  credits,
  used,
  allocation,
  plan,
  images,
  videos,
  musicCount,
  showUpgrade,
}: Props) {
  const usedPct =
    allocation > 0 ? Math.min(100, Math.round((used / allocation) * 100)) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Credits remaining — primary metric */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Coins className="h-5 w-5 text-primary" />
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Available
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">Credits remaining</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
          {credits.toLocaleString()}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Shared across Image · Video · Music
        </p>
      </div>

      {/* Credits used */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Credits used</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
          {used.toLocaleString()}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          of {allocation.toLocaleString()} plan pool
        </p>
        {allocation > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usedPct}%` }}
              role="progressbar"
              aria-valuenow={usedPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>

      {/* Subscription */}
      <Link
        to="/pricing"
        className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
      >
        <div className="flex items-center justify-between">
          <Crown className="h-5 w-5 text-primary" />
          {showUpgrade && (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          )}
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">Subscription</p>
        <p className="mt-1 text-xl font-extrabold tracking-tight">{plan.name}</p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {plan.name} — Active
        </p>
      </Link>

      {/* Generations snapshot */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <ImageIcon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-xs font-medium text-muted-foreground">Recent creations</p>
        <p className="mt-1 text-sm font-semibold leading-snug">
          {images} image{images === 1 ? "" : "s"}
          <span className="text-muted-foreground"> · </span>
          {videos} video{videos === 1 ? "" : "s"}
          <span className="text-muted-foreground"> · </span>
          {musicCount} music
        </p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">From your latest activity</p>
      </div>
    </div>
  );
}
