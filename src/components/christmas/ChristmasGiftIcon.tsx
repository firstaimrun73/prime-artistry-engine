/**
 * Header gift entry — intentional Multitag / partner click target only.
 * No intrusive full-screen or bottom-sheet modal.
 * Does not auto-grant credits. Credits only after partner confirmation.
 */
import { Button } from "@/components/ui/button";
import { GiftMark } from "@/components/christmas/GiftMark";
import { loadMultitagOnce } from "@/components/ads/MonetagMultiTag";
import { DIRECT_LINK_URL } from "@/config/ads";
import { openSponsorUrl, trackAdEvent } from "@/lib/ad-placement-manager";

function openGiftMultitag() {
  loadMultitagOnce();
  openSponsorUrl(DIRECT_LINK_URL, "header-gift");
  trackAdEvent("gift_open", "header-gift");
}

export function ChristmasGiftIcon({
  className = "",
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "pill";
}) {
  const onGiftClick = () => {
    openGiftMultitag();
  };

  if (variant === "pill") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`hidden h-8 gap-1.5 border-amber-500/40 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-xs font-semibold text-orange-700 dark:text-orange-300 sm:inline-flex ${className}`}
        onClick={onGiftClick}
        aria-label="Gift — open sponsored offer"
      >
        <GiftMark className="h-4 w-4" title="Gift" />
        Gift
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onGiftClick}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-br from-orange-500/15 to-red-500/15 transition hover:scale-105 hover:border-amber-500/60 ${className}`}
      aria-label="Gift — open sponsored offer"
      title="Gift"
    >
      <GiftMark className="h-5 w-5" title="Gift" />
    </button>
  );
}
