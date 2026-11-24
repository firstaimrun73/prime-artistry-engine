/**
 * Compact homepage Christmas promo — dismissible, non-blocking.
 * Title: Claim your Christmas gift. Tree emoji for seasonal visual.
 * Free-credit partner cards live in DirectLinkAd / GiftFloatingNotice — not duplicated here.
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
    <section className="mx-auto w-full max-w-6xl space-y-3 px-4 py-3">
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-orange-500/10 via-red-500/5 to-emerald-500/10 px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/80 text-xl shadow-sm" aria-hidden>
            🎄
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Claim your Christmas gift — {CHRISTMAS_REWARD_CREDITS} free credits
            </p>
            <p className="text-xs text-muted-foreground">
              Stay on Motio2edit for 10 minutes, then claim. One gift per account. Exciting seasonal bonus.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex">
            <ChristmasGiftIcon variant="pill" />
          </span>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 sm:hidden"
            onClick={() => {
              document
                .querySelector<HTMLButtonElement>('[aria-label="Gift — open sponsored offer"]')
                ?.click();
            }}
          >
            <Gift className="h-3.5 w-3.5" />
            Claim gift
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
