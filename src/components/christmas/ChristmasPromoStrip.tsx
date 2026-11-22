/**
 * Compact homepage Christmas promo — one placement, dismissible, non-blocking.
 * Reuses Motio2edit orange identity; does not load third-party ad scripts.
 */
import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHRISTMAS_DISMISS_KEY,
  CHRISTMAS_REWARD_CREDITS,
  isChristmasCampaignActiveWindow,
} from "@/lib/christmas-campaign";
import { ChristmasGiftIcon } from "@/components/christmas/ChristmasGiftIcon";

export function ChristmasPromoStrip() {
  const [dismissed, setDismissed] = useState(true);
  const [openSheet, setOpenSheet] = useState(false);

  useEffect(() => {
    if (!isChristmasCampaignActiveWindow()) return;
    try {
      setDismissed(localStorage.getItem(CHRISTMAS_DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!isChristmasCampaignActiveWindow()) return null;
  if (dismissed) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-3">
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-orange-500/10 via-red-500/5 to-emerald-500/10 px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/80 text-xl shadow-sm">
            🎄
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Get Your Christmas Gift — {CHRISTMAS_REWARD_CREDITS} free credits
            </p>
            <p className="text-xs text-muted-foreground">
              Explore Motio2edit for 10 minutes, then claim. One Standard image worth of credits.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Reuse gift icon component which owns the sheet */}
          <span className="hidden sm:inline-flex">
            <ChristmasGiftIcon variant="pill" />
          </span>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 sm:hidden"
            onClick={() => {
              // Trigger the header-level icon by focusing gift flow via same panel path:
              // On mobile the strip opens nothing extra — user uses header gift icon.
              // Provide direct affordance:
              document
                .querySelector<HTMLButtonElement>('[aria-label="Get Free Credits — Christmas Gift"]')
                ?.click();
            }}
          >
            <Gift className="h-3.5 w-3.5" />
            Claim
          </Button>
          <button
            type="button"
            aria-label="Dismiss Christmas promotion"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem(CHRISTMAS_DISMISS_KEY, "1");
              } catch {
                /* ignore */
              }
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
