import { useState } from "react";
import { Info, X } from "lucide-react";

type Breakdown = {
  tier?: string;
  mode?: string;
  durationSec?: number;
  resolution?: string;
  soundOn?: boolean;
};

/** Credit details — never shows backend model names or USD. */
export function VideoCreditsInfo({
  credits,
  breakdown,
}: {
  credits: number;
  breakdown?: Breakdown;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Credit details"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">How credits are calculated</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                · Tier:{" "}
                <span className="font-medium text-foreground">
                  {breakdown?.tier === "premium" ? "Premium (from 200)" : "Standard (from 125)"}
                </span>
              </li>
              <li>
                · Mode:{" "}
                <span className="font-medium text-foreground">
                  {breakdown?.mode === "video"
                    ? "Video → Video"
                    : breakdown?.mode === "image"
                      ? "Image → Video"
                      : "Text → Video"}
                </span>
              </li>
              <li>
                · Duration:{" "}
                <span className="font-medium text-foreground">{breakdown?.durationSec ?? "—"}s</span>
              </li>
              <li>
                · Quality:{" "}
                <span className="font-medium text-foreground">{breakdown?.resolution ?? "—"}</span>
              </li>
              <li>
                · Sound:{" "}
                <span className="font-medium text-foreground">
                  {breakdown?.soundOn ? "On (+ credits)" : "Silent"}
                </span>
              </li>
            </ul>
            <p className="mt-4 text-sm">
              Estimated charge:{" "}
              <span className="font-bold tabular-nums text-red-600">{credits} credits</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Amounts are rounded to clean steps (25). Charged only after a successful generation.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
