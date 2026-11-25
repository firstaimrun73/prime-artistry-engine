/**
 * Opt-in Sponsored strip for free users only.
 * Opens Direct Link only after the user taps "Unlock no-watermark".
 * No Multitag. Not mixed with Generate controls.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  grantSponsorUnlock,
  isSponsorUnlockActive,
  sponsorUnlockRemainingMs,
  SPONSOR_UNLOCK_MINUTES,
} from "@/lib/sponsor-unlock";
import { DIRECT_LINK_URL } from "@/config/ads";
import { toast } from "sonner";

function openSponsorDirectLink() {
  try {
    window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
  } catch {
    /* ignore */
  }
}

export function FreeUserSponsorStrip({ isFree }: { isFree: boolean }) {
  const [active, setActive] = useState(false);
  const [remainMin, setRemainMin] = useState(0);
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => {
    if (!isFree) return;
    const tick = () => {
      const on = isSponsorUnlockActive();
      setActive(on);
      setRemainMin(Math.ceil(sponsorUnlockRemainingMs() / 60000));
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [isFree]);

  if (!isFree) return null;

  if (active) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        No-watermark unlock active · ~{remainMin} min left. Export without Motio2edit stamp for this
        session.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Free plan includes a Motio2edit watermark</p>
      <p className="mt-1">
        Unlock clean exports for {SPONSOR_UNLOCK_MINUTES} minutes via a Sponsored offer — only when
        you choose. Or upgrade anytime.
      </p>
      {!showOffer ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setShowOffer(true);
              openSponsorDirectLink();
              toast.message("Sponsored offer opened", {
                description: "Complete the partner offer in the new tab, then confirm below.",
              });
            }}
          >
            Unlock no-watermark (Sponsored)
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-xs" asChild>
            <a href="/pricing">Upgrade</a>
          </Button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            After completing the Sponsored offer in the new tab, confirm:
          </p>
          <Button
            type="button"
            size="sm"
            className="text-xs"
            onClick={() => {
              grantSponsorUnlock();
              setActive(true);
              setRemainMin(SPONSOR_UNLOCK_MINUTES);
              toast.success(`No-watermark unlocked for ${SPONSOR_UNLOCK_MINUTES} minutes`);
              try {
                localStorage.setItem("motio2edit-keep-watermark", "0");
              } catch {
                /* ignore */
              }
            }}
          >
            I completed the Sponsored offer
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => openSponsorDirectLink()}
          >
            Re-open offer
          </Button>
        </div>
      )}
    </div>
  );
}
