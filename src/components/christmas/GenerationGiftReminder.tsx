/**
 * Compact reminder near completed generation results only.
 * Frequency-limited; never covers download controls.
 */
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { isChristmasGiftActive } from "@/lib/campaign-config";
import { CHRISTMAS_DISMISS_KEY } from "@/lib/christmas-campaign";
import { ChristmasGiftIcon } from "@/components/christmas/ChristmasGiftIcon";

const REMINDER_SEEN_KEY = "motio2edit-christmas-gen-reminder-seen";

export function GenerationGiftReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isChristmasGiftActive()) return;
    try {
      if (localStorage.getItem(CHRISTMAS_DISMISS_KEY) === "1") return;
      if (sessionStorage.getItem(REMINDER_SEEN_KEY) === "1") return;
      sessionStorage.setItem(REMINDER_SEEN_KEY, "1");
      setShow(true);
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Gift className="h-3.5 w-3.5 text-orange-600 dark:text-orange-300" />
        Christmas gift: explore 10 min → claim 25 free credits
      </span>
      <ChristmasGiftIcon variant="pill" className="!h-7 !text-[11px]" />
    </div>
  );
}
