import { useState } from "react";
import { Info, X } from "lucide-react";

export function VideoCreditsInfo({
  modelName,
  duration,
  resolution,
  sound,
  credits,
}: {
  modelName: string;
  duration: number;
  resolution: string;
  sound: string;
  credits: number;
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Generation Credits</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Model</dt><dd className="font-medium text-right">{modelName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{duration}s</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Resolution</dt><dd className="font-medium">{resolution}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Sound</dt><dd className="font-medium">{sound}</dd></div>
              <div className="flex justify-between gap-4 border-t border-border pt-2">
                <dt className="font-semibold">Estimated charge</dt>
                <dd className="font-bold tabular-nums text-red-600">{credits} credits</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">Credits only. No USD shown to users.</p>
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
