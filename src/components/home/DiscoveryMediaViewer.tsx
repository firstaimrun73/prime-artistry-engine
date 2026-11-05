/**
 * Full-size media viewer — single sample focus + info panel.
 * No reel / infinite next-scroll system.
 */
import { useEffect, useRef, useState } from "react";
import { Maximize2, Volume2, VolumeX, X } from "lucide-react";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";
import { DirectLinkAd } from "@/components/ads";

type Props = {
  sample: R2Sample | null;
  open: boolean;
  onClose: () => void;
  playlist?: R2Sample[];
  onSelect?: (s: R2Sample) => void;
};

export function DiscoveryMediaViewer({
  sample,
  open,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [fsHint, setFsHint] = useState(false);

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

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, sample?.id]);

  if (!open || !sample) return null;

  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const mediaLabel = isVideo ? "Video" : "Image";
  const tier = sample.qualityTier ?? null;

  const enterFullscreen = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      // @ts-expect-error webkit
      else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
      setFsHint(true);
      window.setTimeout(() => setFsHint(false), 3200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/90 p-0 backdrop-blur-sm sm:items-center sm:p-6"
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
        className="relative flex max-h-[min(94dvh,960px)] w-full max-w-[min(96vw,720px)] flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex max-h-[62dvh] shrink-0 items-center justify-center bg-black px-2 pt-12 sm:max-h-[68dvh]">
          {isVideo ? (
            <video
              ref={videoRef}
              key={sample.id}
              src={sample.url}
              controls
              playsInline
              autoPlay
              muted={muted}
              className="max-h-[55dvh] max-w-full object-contain sm:max-h-[62dvh]"
              aria-label={sample.title}
            />
          ) : (
            <img
              key={sample.id}
              src={sample.url}
              alt={sample.title || "Sample"}
              className="max-h-[55dvh] max-w-full object-contain sm:max-h-[62dvh]"
            />
          )}

          {isVideo ? (
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => void enterFullscreen()}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md"
                aria-label="Full screen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {fsHint ? (
            <div className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full border border-orange-400/40 bg-orange-500/90 px-3 py-1.5 text-xs font-semibold text-black shadow-lg">
              Full screen · {sample.title || mediaLabel} · {sample.aspectRatio}
              {tier ? ` · ${tier}` : ""}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 px-4 py-4 sm:px-5">
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

          <div className="mt-4">
            <DirectLinkAd placement="sample-detail" variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}
