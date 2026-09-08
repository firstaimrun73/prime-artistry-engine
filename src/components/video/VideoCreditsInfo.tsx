import { useState } from "react";
import { Info, X } from "lucide-react";
import { CREDIT_RETAIL_USD } from "@/lib/motio-video-credits";

type Breakdown = {
  tier?: string;
  mode?: string;
  durationSec?: number;
  quality?: string;
  resolution?: string;
  soundOn?: boolean;
};

function modeLabel(mode?: string) {
  if (mode === "video") return "Video → Video";
  if (mode === "image") return "Image → Video";
  if (mode === "audio") return "Audio → Video";
  return "Text → Video";
}

function qualityLabel(b?: Breakdown) {
  if (b?.quality) return b.quality;
  if (b?.resolution === "1080p" || b?.resolution === "2k") return "HD";
  if (b?.resolution === "720p" || b?.resolution === "480p") return "SD";
  return b?.resolution ?? "—";
}

/** Credit details — never shows backend model names. */
export function VideoCreditsInfo({
  credits,
  breakdown,
  usd,
}: {
  credits: number;
  breakdown?: Breakdown;
  usd?: number;
}) {
  const [open, setOpen] = useState(false);
  const displayUsd =
    usd != null ? usd : +(credits * CREDIT_RETAIL_USD).toFixed(2);

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
                  {breakdown?.tier === "premium"
                    ? "Premium"
                    : breakdown?.tier === "standard"
                      ? "Standard"
                      : "—"}
                </span>
              </li>
              <li>
                · Mode:{" "}
                <span className="font-medium text-foreground">{modeLabel(breakdown?.mode)}</span>
              </li>
              <li>
                · Duration:{" "}
                <span className="font-medium text-foreground">
                  {breakdown?.durationSec != null ? `${breakdown.durationSec}s` : "—"}
                </span>
              </li>
              <li>
                · Quality:{" "}
                <span className="font-medium text-foreground">{qualityLabel(breakdown)}</span>
              </li>
              <li>
                · Sound:{" "}
                <span className="font-medium text-foreground">
                  {breakdown?.soundOn == null ? "—" : breakdown.soundOn ? "Enabled" : "Silent"}
                </span>
              </li>
            </ul>
            <p className="mt-4 text-sm">
              Estimated charge:{" "}
              <span className="font-bold tabular-nums text-red-600">
                {credits} credits (${displayUsd.toFixed(2)})
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              1 credit = $0.01. Prices rounded to clean 25-credit steps. Charged only after a successful generation.
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
