/**
 * Media-first discovery card — Pass 10.
 * 16:9/21:9 full width in strips; other ratios smaller, never cropped.
 * Like/Info fixed top-right. Video tap opens lightbox (not only inline).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Heart, Info, Play, Volume2, VolumeX } from "lucide-react";
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

export function spanClassForSample(sample: R2Sample): string {
  const r = parseRatio(sample.aspectRatio);
  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  if (r >= 2.2) return "col-span-2 md:col-span-3 lg:col-span-4";
  if (isVideo && r >= 1.6) return "col-span-2 md:col-span-2 lg:col-span-2";
  if (r >= 1.5 && r < 2.2) return "col-span-1 md:col-span-2 lg:col-span-2";
  if (r < 0.85) return "col-span-1";
  return "col-span-1";
}

/** Horizontal-strip width per Pass 10 — wide full, others smaller, never crop. */
export function stripWidthClassForSample(sample: R2Sample): string {
  const r = parseRatio(sample.aspectRatio);
  if (r >= 2.0) return "w-[min(88vw,480px)]"; // 21:9-ish
  if (r >= 1.5) return "w-[min(88vw,420px)]"; // 16:9
  if (r >= 1.2) return "w-[220px]"; // 4:3
  if (r >= 0.9) return "w-[220px]"; // 1:1
  if (r >= 0.7) return "w-[190px]"; // 3:4
  return "w-[190px]"; // 9:16
}

function categoryBadge(sample: R2Sample): string | null {
  if (sample.homepageCategory === "try-now") return "TRY NOW";
  if (sample.homepageCategory === "trend") return "TREND";
  if (sample.studio === "circle") return "TRY NOW";
  return null;
}

function QualityTierBadge({ tier }: { tier: string }) {
  if (tier === "Premium") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-bold text-black shadow-sm backdrop-blur-sm">
        <Crown className="h-2.5 w-2.5 fill-current" aria-hidden />
        Premium
      </span>
    );
  }
  if (tier === "Ultra AI") {
    return (
      <span className="relative inline-flex overflow-hidden rounded-full px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
        <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" />
        <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <span className="relative tracking-wide">Ultra AI</span>
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-800 backdrop-blur-sm">
      Standard
    </span>
  );
}

type Props = {
  sample: R2Sample;
  liked?: boolean;
  onToggleLike?: (sample: R2Sample) => void;
  onOpenViewer?: (sample: R2Sample) => void;
  className?: string;
  size?: "default" | "large";
};

export function GalleryMediaCard({
  sample,
  liked = false,
  onToggleLike,
  onOpenViewer,
  className,
  size = "default",
}: Props) {
  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const large = size === "large";
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTick, setActiveTick] = useState(0);
  const [unmuted, setUnmuted] = useState(false);
  const [playingHere, setPlayingHere] = useState(false);

  useEffect(() => homeVideoSubscribe(() => setActiveTick((n) => n + 1)), []);

  useEffect(() => {
    if (!isVideo) return;
    homeVideoRegister(sample.id, videoRef.current);
    return () => homeVideoRegister(sample.id, null);
  }, [isVideo, sample.id]);

  useEffect(() => {
    const active = homeVideoGetActiveId() === sample.id;
    const el = videoRef.current;
    const isPlay = active && el && !el.paused;
    setPlayingHere(!!isPlay);
    if (!active) setUnmuted(false);
  }, [activeTick, sample.id]);

  /** Primary media click: image → lightbox; video → lightbox (Pass 10). */
  const openMedia = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      onOpenViewer?.(sample);
      // Pause any inline preview when opening lightbox
      if (isVideo) {
        homeVideoPause(sample.id);
        setPlayingHere(false);
        setUnmuted(false);
      }
    },
    [isVideo, onOpenViewer, sample],
  );

  const onLike = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleLike?.(sample);
    },
    [onToggleLike, sample],
  );

  if (failed) return null;

  const badge = categoryBadge(sample);
  const tier = sample.qualityTier ?? null;
  const span = spanClassForSample(sample);
  const title = sample.title?.trim() || null;

  return (
    <article
      className={cn(
        "group relative w-full self-start overflow-hidden rounded-[14px]",
        "bg-muted/15 ring-1 ring-border/25 transition duration-300",
        "hover:ring-primary/30 hover:shadow-md",
        span,
        className,
      )}
      data-sample-id={sample.id}
      data-aspect={sample.aspectRatio}
      data-ratio={sample.aspectRatio}
    >
      {/* Fixed controls — always top-right, same inset (Pass 10) */}
      <div className="gallery-card__controls absolute right-2 top-2 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLike}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md",
            liked
              ? "border-primary/40 bg-primary/25 text-primary"
              : "border-white/20 bg-black/40 text-white",
          )}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
        </button>
        <Link
          to="/sample/$id"
          params={{ id: sample.id }}
          onClick={(e) => e.stopPropagation()}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md"
          aria-label="View details"
        >
          <Info className="h-3.5 w-3.5" />
        </Link>
      </div>

      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onClick={openMedia}
        aria-label={isVideo ? `Open video ${title || ""}` : `View ${title || "media"}`}
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
            alt={title || "Sample"}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          {badge ? (
            <span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm">
              {badge}
            </span>
          ) : null}
          {tier ? <QualityTierBadge tier={tier} /> : null}
        </div>

        {isVideo ? (
          <span
            className={cn(
              "absolute bottom-2.5 left-2.5 grid place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md",
              large ? "h-9 w-9" : "h-8 w-8",
            )}
            aria-hidden
          >
            <Play className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", "fill-current")} />
          </span>
        ) : null}

        {title ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pb-2.5",
              isVideo && "pl-12",
            )}
          >
            <p
              className={cn(
                "line-clamp-1 font-semibold leading-tight text-white drop-shadow-sm",
                large ? "text-[13px]" : "text-[12px]",
              )}
            >
              {title}
            </p>
          </div>
        ) : null}
      </button>
    </article>
  );
}
