/**
 * Full-viewport result experience for Video Studio.
 */
import { Download, Share2, RotateCcw, X, Maximize2 } from "lucide-react";
import type { VideoStudioResult } from "./video-studio-types";

function qualityLabel(q: string): string {
  if (q === "480p" || q === "sd") return "SD · 480p";
  if (q === "720p" || q === "hd") return "HD · 720p";
  if (q === "1080p" || q === "fhd") return "FHD · 1080p";
  return q;
}

export function VideoOutputView({
  result,
  onClose,
  onRegenerate,
  onDownload,
}: {
  result: VideoStudioResult;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
}) {
  const modeLabel =
    result.mode === "text" ? "Text → Video" : result.mode === "image" ? "Image → Video" : "Video → Video";

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
    <div className="absolute inset-0 z-50 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-xs font-bold tracking-[0.18em] text-zinc-300">RESULT</p>
        <span className="w-9" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <video
            src={result.outputUrl}
            controls
            playsInline
            className="mx-auto max-h-[min(48dvh,420px)] w-full object-contain"
          />
        </div>

        <dl className="mt-3 grid w-full max-w-lg grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
          <div className="rounded-lg border border-white/8 bg-white/5 px-1 py-1.5">
            <dt className="text-zinc-500">Mode</dt>
            <dd className="font-semibold text-zinc-200">{modeLabel}</dd>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/5 px-1 py-1.5">
            <dt className="text-zinc-500">Quality</dt>
            <dd className="font-semibold text-zinc-200">{qualityLabel(result.quality)}</dd>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/5 px-1 py-1.5">
            <dt className="text-zinc-500">Duration</dt>
            <dd className="font-semibold text-zinc-200">{result.duration}s · {result.aspect}</dd>
          </div>
        </dl>
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-white"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Another
        </button>
        <a
          href={result.outputUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full
        </a>
      </div>
    </div>
  );
}
