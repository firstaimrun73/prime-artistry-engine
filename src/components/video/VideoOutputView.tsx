/**
 * Video Studio result screen — dedicated output page with Download / Share.
 */
import { Download, Share2, RotateCcw, X } from "lucide-react";
import type { VideoStudioResult } from "./video-studio-types";
import { cn } from "@/lib/utils";
import type { VideoTier } from "@/lib/video-model-registry";

export function VideoOutputView({
  result,
  onClose,
  onRegenerate,
  tier = "standard",
}: {
  result: VideoStudioResult;
  onClose: () => void;
  onRegenerate?: () => void;
  tier?: VideoTier;
}) {
  const videoUrl = result.videoUrl || result.url;
  const isPremium = tier === "premium";

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `motio2edit-video-${Date.now()}.mp4`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    if (!videoUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Motio2edit Video",
          text: "Created with Motio2edit Video Studio",
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        // toast handled by parent if needed
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#FFF8F3]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 safe-top">
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Your video</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
              isPremium
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {isPremium ? "👑 Premium" : "⚡ Standard"}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Video stage */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-auto px-4 py-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-xl">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              autoPlay
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="grid aspect-video place-items-center text-slate-400">
              No video URL
            </div>
          )}
          {/* Watermark badge */}
          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <span>Motio2Edit</span>
            <span className="opacity-80">■</span>
            <span className="opacity-90">{isPremium ? "👑" : "⚡"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full max-w-lg flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition active:scale-[0.98] sm:flex-none"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              New
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
