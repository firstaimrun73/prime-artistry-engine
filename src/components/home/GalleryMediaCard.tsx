/**
 * Shared homepage media card — media defines the card; no forced aspect wrappers.
 * Videos use the global home-video-controller mutex and tap-gated sound icon.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";
import {
  homeVideoRegister,
  homeVideoRequestPlay,
  homeVideoPause,
  homeVideoGetActiveId,
  homeVideoSubscribe,
} from "@/lib/home-video-controller";

function parseRatio(ar: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ar.trim());
  if (!m) return 1;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return 1;
  return w / h;
}

function maxWidthForRatio(ar: string, context: "feed" | "extraa"): string {
  const r = parseRatio(ar);
  if (context === "extraa") {
    if (r >= 2.2) return "min(92vw, 720px)";
    if (r >= 1.5) return "min(88vw, 640px)";
    return "min(80vw, 480px)";
  }
  if (r < 0.75) return "min(100%, 240px)";
  if (r < 1.05) return "min(100%, 280px)";
  if (r < 1.5) return "min(100%, 340px)";
  return "min(100%, 400px)";
}

function categoryBadge(sample: R2Sample): string | null {
  if (sample.homepageCategory === "try-now") return "TRY NOW";
  if (sample.homepageCategory === "trend") return "TREND";
  if (sample.homepageCategory === "samples") return "SAMPLE";
  if (sample.studio === "circle") return "TRY NOW";
  return "SAMPLE";
}

type Props = {
  sample: R2Sample;
  context?: "feed" | "extraa";
  className?: string;
};

export function GalleryMediaCard({ sample, context = "feed", className }: Props) {
  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeId, setActiveId] = useState<string | null>(() => homeVideoGetActiveId());
  const [showSound, setShowSound] = useState(false);
  const [unmuted, setUnmuted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => homeVideoSubscribe(() => setActiveId(homeVideoGetActiveId())), []);

  useEffect(() => {
    if (!isVideo) return;
    const el = videoRef.current;
    homeVideoRegister(sample.id, el);
    return () => homeVideoRegister(sample.id, null);
  }, [isVideo, sample.id]);

  const startMutedPreview = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    homeVideoRequestPlay(sample.id, el, { unmuted: false });
    setUnmuted(false);
  }, [sample.id]);

  const stopIfMuted = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (homeVideoGetActiveId() === sample.id && el.muted) {
      homeVideoPause(sample.id);
    }
  }, [sample.id]);

  const onDirectTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isVideo) return;
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      setShowSound(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowSound(false), 2800);

      const currentlyActive = homeVideoGetActiveId() === sample.id;
      if (!currentlyActive || el.paused) {
        homeVideoRequestPlay(sample.id, el, { unmuted: false });
        setUnmuted(false);
      }
    },
    [isVideo, sample.id],
  );

  const toggleSound = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      setShowSound(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowSound(false), 2800);

      if (unmuted) {
        el.muted = true;
        setUnmuted(false);
      } else {
        homeVideoRequestPlay(sample.id, el, { unmuted: true });
        setUnmuted(true);
      }
    },
    [sample.id, unmuted],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (failed) return null;

  const badge = categoryBadge(sample);
  const maxW = maxWidthForRatio(sample.aspectRatio, context);

  return (
    <article
      className={cn(
        "group relative w-full self-start overflow-hidden rounded-2xl border border-border/40 bg-transparent",
        "transition-[transform,opacity] duration-200 ease-out",
        "hover:scale-[1.01] active:scale-[0.98] active:opacity-90",
        className,
      )}
      style={{ maxWidth: maxW }}
      data-sample-id={sample.id}
      data-aspect={sample.aspectRatio}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label={sample.title || "Open sample"}
        onMouseEnter={isVideo ? startMutedPreview : undefined}
        onMouseLeave={isVideo ? stopIfMuted : undefined}
        onTouchStart={isVideo ? onDirectTap : undefined}
        onClick={isVideo ? onDirectTap : undefined}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={sample.url}
            muted
            playsInline
            loop
            preload="metadata"
            className="pointer-events-none block h-auto w-full"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={sample.url}
            alt={sample.title || "Sample"}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}

        {badge ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
            {badge}
          </span>
        ) : null}
      </Link>

      {isVideo && showSound ? (
        <button
          type="button"
          onClick={toggleSound}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full",
            "border border-white/25 bg-black/50 text-white backdrop-blur-md",
            "transition-opacity duration-150",
          )}
          aria-label={unmuted ? "Mute" : "Unmute"}
        >
          {unmuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
      ) : null}

      {sample.title ? (
        <p className="truncate px-1.5 pt-1 text-[11px] font-medium leading-tight text-foreground/75">
          {sample.title}
        </p>
      ) : null}
    </article>
  );
}
