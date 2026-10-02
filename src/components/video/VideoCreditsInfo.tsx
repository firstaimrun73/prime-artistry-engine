import { useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Credit details — never shows backend model names or USD. */
export function VideoCreditsInfo({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-2 text-muted-foreground",
          "transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30",
        )}
        aria-label="Credit details"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] dark:bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl dark:bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Video generation credits</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 transition-all duration-150 hover:bg-muted active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Your final credit usage depends on duration, quality, resolution, sound, generation complexity, and
              processing requirements.
            </p>
            <p className="text-sm">
              Estimated charge:{" "}
              <span className="font-bold tabular-nums text-red-600 dark:text-red-400">{credits} credits</span>
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">Minimum charge is 125 credits per generation.</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-4 w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white",
                "transition-all duration-150 active:scale-[0.98] hover:bg-red-600",
              )}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
