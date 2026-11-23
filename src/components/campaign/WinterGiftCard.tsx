/**
 * Winter / seasonal gift card — Motio2edit orange & white glass.
 * Guaranteed reward: exactly 25 credits (server-authoritative).
 * Does NOT fake a successful claim or mutate balance in the browser.
 */
import { Gift, Snowflake } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getActiveCampaignConfig,
  isSeasonalGiftActive,
  SEASONAL_GIFT_CREDITS,
} from "@/lib/campaign-config";
import { cn } from "@/lib/utils";

type Variant = "hero" | "compact" | "inline";

export function WinterGiftCard({
  variant = "hero",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  if (!isSeasonalGiftActive()) return null;
  const cfg = getActiveCampaignConfig();

  if (variant === "inline") {
    return (
      <Link
        to="/pricing"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300",
          className,
        )}
        aria-label={`${cfg.headline} — ${SEASONAL_GIFT_CREDITS} free credits`}
      >
        <Gift className="h-3.5 w-3.5" />
        {cfg.shortTitle}
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-background to-sky-500/10 p-3 shadow-sm",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-300">
            <Snowflake className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{cfg.headline}</p>
            <p className="text-xs text-muted-foreground">
              Exactly {SEASONAL_GIFT_CREDITS} free credits · one gift per account
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 bg-orange-600 hover:bg-orange-500">
            <Link to="/pricing">Claim</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-orange-500/35 bg-gradient-to-br from-orange-500/12 via-background to-sky-400/10 px-5 py-6 shadow-md sm:px-8",
        className,
      )}
      aria-label={cfg.headline}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
            <Gift className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{cfg.headline}</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{cfg.body}</p>
            <p className="mt-2 text-xs font-medium text-orange-700 dark:text-orange-300">
              Guaranteed gift: exactly {SEASONAL_GIFT_CREDITS} credits · Verified on claim
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Button asChild size="lg" className="bg-orange-600 px-6 font-semibold hover:bg-orange-500">
            <Link to="/pricing">{cfg.ctaClaim}</Link>
          </Button>
          <p className="text-[11px] text-muted-foreground">Separate from paid plans & sponsor ads</p>
        </div>
      </div>
    </section>
  );
}
