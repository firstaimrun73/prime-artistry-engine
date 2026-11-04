/**
 * Media viewer — current sample + reel-style next items on scroll.
 * Sponsored direct-link ad under description.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
  playlist = [],
  onSelect,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    // reset scroll when sample changes
    listRef.current?.scrollTo({ top: 0 });
  }, [sample?.id]);

  if (!open || !sample) return null;

  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const mediaLabel = isVideo ? "Video" : "Image";
  const tier = sample.qualityTier ?? null;

  const idx = playlist.findIndex((s) => s.id === sample.id);
  const nextItems =
    idx >= 0 ? playlist.slice(idx + 1, idx + 8) : playlist.filter((s) => s.id !== sample.id).slice(0, 8);

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
        ref={listRef}
        className="relative flex max-h-[min(94dvh,960px)] w-full max-w-[min(96vw,720px)] flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[55dvh] shrink-0 items-center justify-center bg-black px-2 pt-10 sm:max-h-[60dvh]">
          {isVideo ? (
            <video
              ref={videoRef}
              key={sample.id}
              src={sample.url}
              controls
              playsInline
              autoPlay
              className="max-h-[50dvh] max-w-full object-contain sm:max-h-[56dvh]"
              aria-label={sample.title}
            />
          ) : (
            <img
              key={sample.id}
              src={sample.url}
              alt={sample.title || "Sample"}
              className="max-h-[50dvh] max-w-full object-contain sm:max-h-[56dvh]"
            />
          )}
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

        {/* Reel-style next AI samples — scroll down */}
        {nextItems.length > 0 ? (
          <div className="border-t border-white/10 px-4 py-4 sm:px-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/50">
              More AI samples
            </p>
            <div className="space-y-6">
              {nextItems.map((s) => {
                const vid = s.format === "MP4" || s.url.endsWith(".mp4");
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="block w-full text-left"
                    onClick={() => onSelect?.(s)}
                  >
                    <div className="overflow-hidden rounded-xl bg-black">
                      {vid ? (
                        <video
                          src={s.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="mx-auto max-h-[42dvh] w-full object-contain"
                        />
                      ) : (
                        <img
                          src={s.url}
                          alt={s.title || "Sample"}
                          className="mx-auto max-h-[42dvh] w-full object-contain"
                          loading="lazy"
                        />
                      )}
                    </div>
                    {s.title ? (
                      <p className="mt-2 text-sm font-semibold text-white">{s.title}</p>
                    ) : null}
                    {s.qualityTier ? (
                      <span className="mt-1 inline-block text-[10px] font-semibold text-amber-400">
                        {s.qualityTier}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
