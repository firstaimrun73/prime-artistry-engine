/**
 * Mobile/desktop header gift entry for Christmas campaign.
 * Opens campaign sheet/dialog — never auto-grants credits.
 */
import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChristmasCampaignPanel } from "@/components/christmas/ChristmasCampaignPanel";
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
          aria-label="Get Free Credits — Christmas Gift"
        >
          <span aria-hidden>🎄</span>
          <Gift className="h-3.5 w-3.5" />
          Free Credits
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-br from-orange-500/15 to-red-500/15 text-orange-600 transition hover:scale-105 hover:border-amber-500/60 dark:text-orange-300 ${className}`}
          aria-label="Get Free Credits — Christmas Gift"
          title="Get Free Credits"
        >
          <Gift className="h-4.5 w-4.5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            25
          </span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:side-right sm:max-w-md sm:rounded-none">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <span aria-hidden>🎄</span> Get Your Christmas Gift
            </SheetTitle>
            <SheetDescription>
              Stay, explore Motio2edit for 10 minutes, then claim 25 free credits.
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
