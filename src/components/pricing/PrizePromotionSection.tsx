/**
 * Prize promotions — Coming Soon until funding, official rules, and legal approval.
 * No fake winners, no PS5/iPhone claims.
 */
import { Trophy, Shield } from "lucide-react";

export function PrizePromotionSection() {
  return (
    <section
      className="mx-auto mt-6 max-w-2xl rounded-2xl border border-dashed border-border bg-muted/15 px-4 py-5 sm:px-6"
      aria-labelledby="prize-promo-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Trophy className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 id="prize-promo-heading" className="text-base font-semibold text-foreground">
            Premium Prize Campaigns
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Occasional prize promotions may appear here after official rules, eligibility, and funding
            are confirmed. Nothing is active right now.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Coming soon — no entries, no winners list, no hardware giveaways at this time.
          </p>
        </div>
      </div>
    </section>
  );
}
