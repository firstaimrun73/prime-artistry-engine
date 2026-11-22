/**
 * Lightweight post-generation reminder for the seasonal gift campaign.
 * Non-blocking; never auto-claims credits.
 */
import { Link } from "@tanstack/react-router";
import { isChristmasCampaignActiveWindow, CHRISTMAS_REWARD_CREDITS } from "@/lib/christmas-campaign";
import { GiftMark } from "@/components/christmas/GiftMark";

export function GenerationGiftReminder() {
  if (!isChristmasCampaignActiveWindow()) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <GiftMark className="h-3.5 w-3.5" title="Gift" />
        Christmas gift available
      </p>
      <p className="mt-0.5">
        Explore for 10 minutes to claim {CHRISTMAS_REWARD_CREDITS} free credits. Open the gift icon in the
        header when ready.
      </p>
    </div>
  );
}
