/**
 * Lightweight media viewer — image/video + full description.
 * Card stays clean; 100+ word description lives here.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

type Props = {
  sample: R2Sample | null;
  open: boolean;
  onClose: () => void;
};

export function DiscoveryMediaViewer({ sample, open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open && videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        /* ignore */
      }
    }
  }, [open]);

  if (!open || !sample) return null;

  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const mediaLabel = isVideo ? "Video" : "Image";
  const tier = sample.qualityTier ?? null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={sample.title || "Media viewer"}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 sm:right-5 sm:top-5"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative flex max-h-[min(94dvh,960px)] w-full max-w-[min(96vw,720px)] flex-col overflow-hidden rounded-t-2xl bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[55dvh] items-center justify-center bg-black px-2 pt-10 sm:max-h-[60dvh]">
          {isVideo ? (
            <video
              ref={videoRef}
              src={sample.url}
              controls
              playsInline
              autoPlay
              className="max-h-[50dvh] max-w-full object-contain sm:max-h-[56dvh]"
              aria-label={sample.title}
            />
          ) : (
            <img
              src={sample.url}
              alt={sample.title || "Sample"}
              className="max-h-[50dvh] max-w-full object-contain sm:max-h-[56dvh]"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {mediaLabel}
            </span>
            {tier ? (
              <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-bold text-black">
                {tier}
              </span>
            ) : null}
            <span className="text-[11px] text-white/50">{sample.aspectRatio}</span>
          </div>
          {sample.title ? (
            <h2 className="mt-2 text-lg font-bold leading-snug text-white sm:text-xl">
              {sample.title}
            </h2>
          ) : null}
          {sample.description ? (
            <p className={cn("mt-3 text-sm leading-relaxed text-white/75")}>{sample.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
