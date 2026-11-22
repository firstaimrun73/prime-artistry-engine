/**
 * Separate Pricing section for future rewarded ads.
 * Non-interactive until provider-side reward verification is complete.
 */
import { PlayCircle, Shield } from "lucide-react";

export function RewardedAdsSection() {
  return (
    <section
      className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 sm:mt-12 sm:px-6"
      aria-labelledby="rewarded-ads-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <PlayCircle className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 id="rewarded-ads-heading" className="text-base font-semibold text-foreground">
            Watch Rewarded Ads &amp; Get Free Generations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional rewarded ads may unlock small free-generation bonuses in a future update.
            This section is separate from Standard, Premium, and Ultra AI plans.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Coming soon — not available yet. No ads are loaded from this page.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 cursor-not-allowed rounded-full border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground opacity-70"
          >
            Rewarded ads not available yet
          </button>
        </div>
      </div>
    </section>
  );
}
