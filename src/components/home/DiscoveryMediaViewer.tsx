/**
 * Lightweight media viewer — image/video only.
 * Not the Info/Detail page. Close returns to homepage scroll context.
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

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
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
        className="relative max-h-[min(92dvh,900px)] max-w-[min(96vw,1100px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={sample.url}
            controls
            playsInline
            autoPlay
            className="max-h-[min(88dvh,860px)] max-w-full rounded-lg object-contain"
            aria-label={sample.title}
          />
        ) : (
          <img
            src={sample.url}
            alt={sample.title || "Sample"}
            className="max-h-[min(88dvh,860px)] max-w-full rounded-lg object-contain"
          />
        )}
        {sample.title ? (
          <p className={cn("mt-3 text-center text-sm font-medium text-white/80")}>{sample.title}</p>
        ) : null}
      </div>
    </div>
  );
}
