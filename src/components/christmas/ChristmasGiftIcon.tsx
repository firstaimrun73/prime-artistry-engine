/**
 * Header gift entry — Christmas / partner Direct Link only.
 * Opens DIRECT_LINK_URL in a new tab on explicit user click.
 * Does NOT load Multitag or attach global click handlers.
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
import { GiftMark } from "@/components/christmas/GiftMark";
import { DIRECT_LINK_URL } from "@/config/ads";
import { ExternalLink } from "lucide-react";

function openGiftDirectLink() {
  try {
    window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
  } catch {
    /* ignore */
  }
}

export function ChristmasGiftIcon({
  className = "",
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "pill";
}) {
  const [open, setOpen] = useState(false);

  const onGiftClick = () => {
    openGiftDirectLink();
    setOpen(true);
  };

  return (
    <>
      {variant === "pill" ? (
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
      ) : (
        <button
          type="button"
          onClick={onGiftClick}
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-br from-orange-500/15 to-red-500/15 transition hover:scale-105 hover:border-amber-500/60 ${className}`}
          aria-label="Gift — open sponsored offer"
          title="Gift"
        >
          <GiftMark className="h-5 w-5" title="Gift" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto rounded-t-2xl sm:max-w-md"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <GiftMark className="h-6 w-6" title="Gift" />
              Your gift offer
            </SheetTitle>
            <SheetDescription>Visit the site and claim your gift!</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              A partner offer opens in a new tab. Complete the offer there. Motio2edit credits are
              never granted by this click alone.
            </p>
            <Button
              type="button"
              className="w-full gap-2 bg-orange-600 hover:bg-orange-500"
              onClick={() => {
                openGiftDirectLink();
              }}
            >
              Open gift offer
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
