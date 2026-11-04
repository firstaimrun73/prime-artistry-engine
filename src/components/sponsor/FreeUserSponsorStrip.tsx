/**
 * Opt-in Sponsored strip for free users only.
 * Script loads ONLY after the user taps "Unlock no-watermark".
 * Not auto-popup. Not mixed with Generate controls.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  grantSponsorUnlock,
  isSponsorUnlockActive,
  sponsorUnlockRemainingMs,
  SPONSOR_UNLOCK_MINUTES,
} from "@/lib/sponsor-unlock";
import { toast } from "sonner";

const MULTITAG_SRC = "https://quge5.com/88/tag.min.js";
const MULTITAG_ZONE = "305489";

function loadMultitagOnce() {
  if (typeof document === "undefined") return;
  if (document.getElementById("motio-multitag-sponsor")) return;
  const s = document.createElement("script");
  s.id = "motio-multitag-sponsor";
  s.src = MULTITAG_SRC;
  s.async = true;
  s.setAttribute("data-zone", MULTITAG_ZONE);
  s.setAttribute("data-cfasync", "false");
  document.body.appendChild(s);
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
              loadMultitagOnce();
              toast.message("Sponsored offer loading…", {
                description: "Complete the offer, then confirm below.",
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
            After the Sponsored unit appears, complete it, then confirm:
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
        </div>
      )}
    </div>
  );
}
