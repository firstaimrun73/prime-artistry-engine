/**
 * High-value prize promotion — Coming Soon until funded + legal rules approved.
 * NOT 100,000 credits. Does not grant credits. Separate from the 25-credit gift.
 */
import { Trophy, Shield } from "lucide-react";

export function PrizePromotionSection() {
  return (
    <section
      className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-card px-4 py-5 sm:mt-8 sm:px-6"
      aria-labelledby="prize-promo-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Trophy className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 id="prize-promo-heading" className="text-base font-semibold text-foreground">
            Try Your Luck for Premium Prizes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A separate promotional prize draw (for example premium consumer electronics) may open
            after prizes are funded and official rules are published. This is not free credits and
            does not replace the guaranteed 25-credit seasonal gift when that campaign is active.
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
            <li>Official rules, age and country eligibility required</li>
            <li>Transparent entry conditions and auditable winner selection</li>
            <li>No-purchase entry method where required by law</li>
            <li>Watching ads never guarantees a prize</li>
          </ul>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Coming soon — not active. No entries are accepted yet.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 cursor-not-allowed rounded-full border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground opacity-70"
          >
            Prize campaign not open
          </button>
        </div>
      </div>
    </section>
  );
}
