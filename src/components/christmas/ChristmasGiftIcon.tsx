/**
 * Mobile/desktop header gift entry for seasonal campaign.
 * Opens campaign sheet — never auto-grants credits.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChristmasCampaignPanel } from "@/components/christmas/ChristmasCampaignPanel";
import { GiftMark } from "@/components/christmas/GiftMark";
import { isChristmasCampaignActiveWindow } from "@/lib/christmas-campaign";
import { useAuth } from "@/lib/auth";

export function ChristmasGiftIcon({
  className = "",
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "pill";
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isChristmasCampaignActiveWindow()) return null;

  return (
    <>
      {variant === "pill" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`hidden h-8 gap-1.5 border-amber-500/40 bg-gradient-to-r from-orange-500/10 to-red-500/10 text-xs font-semibold text-orange-700 dark:text-orange-300 sm:inline-flex ${className}`}
          onClick={() => setOpen(true)}
          aria-label="Get Free 25 Credits — Christmas Gift"
        >
          <GiftMark className="h-4 w-4" title="Gift" />
          Free 25 Credits
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-br from-orange-500/15 to-red-500/15 transition hover:scale-105 hover:border-amber-500/60 ${className}`}
          aria-label="Get Free 25 Credits — Christmas Gift"
          title="Free 25 Credits"
        >
          <GiftMark className="h-5 w-5" title="Gift" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
            25
          </span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:side-right sm:max-w-md sm:rounded-none"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <GiftMark className="h-6 w-6" title="Gift" />
              Get Your Christmas Gift
            </SheetTitle>
            <SheetDescription>
              Stay, explore Motio2edit for 10 minutes, then claim exactly 25 free credits.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <ChristmasCampaignPanel onClose={() => setOpen(false)} signedIn={!!user} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
