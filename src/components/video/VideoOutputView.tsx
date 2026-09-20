/**
 * Video Studio result screen — player + Download / Share / Watermark / Edit again.
 */
import { Download, Share2, RotateCcw, X } from "lucide-react";
import type { VideoStudioResult } from "./video-studio-types";

export function VideoOutputView({
  result,
  onClose,
  onRegenerate,
  onDownload,
  onWatermark,
}: {
  result: VideoStudioResult;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  /** Optional watermark action using existing finalize pipeline when wired. */
  onWatermark?: () => void;
}) {
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Motio2edit Video", url: result.outputUrl });
      } else {
        await navigator.clipboard.writeText(result.outputUrl);
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-base font-bold tracking-tight text-foreground">🎥 Video Studio</p>
          <p className="text-[11px] text-muted-foreground">by Motion2Ai</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-muted/40 text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-black shadow-lg">
          <video
            src={result.outputUrl}
            controls
            playsInline
            className="mx-auto max-h-[min(52dvh,480px)] w-full object-contain"
          />
          {/* Watermark overlay — matches studio background branding */}
          <div
            className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/35 px-2 py-1 text-[10px] font-semibold tracking-wide text-white/90 backdrop-blur-sm"
            aria-hidden
          >
            Motio2edit
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2 border-t border-border/60 px-4 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-md"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-xs font-semibold text-foreground"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        {onWatermark && (
          <button
            type="button"
            onClick={onWatermark}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-xs font-semibold text-foreground"
          >
            Watermark
          </button>
        )}
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-xs font-semibold text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Edit again
        </button>
      </div>
    </div>
  );
}
