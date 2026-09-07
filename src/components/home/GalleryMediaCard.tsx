/**
 * Media-first discovery card — native aspect, quality tier badge, larger sizes.
 * Premium shows crown; Ultra AI badge is animated.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Heart, Info, Pause, Play, Volume2, VolumeX } from "lucide-react";
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
  /** Larger type + controls for Discover strips */
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

  const togglePlay = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (!isVideo) {
        onOpenViewer?.(sample);
        return;
      }
      const el = videoRef.current;
      if (!el) return;
      if (homeVideoGetActiveId() === sample.id && !el.paused) {
        homeVideoPause(sample.id);
        setPlayingHere(false);
        setUnmuted(false);
        el.muted = true;
      } else {
        homeVideoRequestPlay(sample.id, el, { unmuted: false });
        setPlayingHere(true);
        setUnmuted(false);
      }
    },
    [isVideo, onOpenViewer, sample],
  );

  const toggleSound = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      if (!playingHere) {
        homeVideoRequestPlay(sample.id, el, { unmuted: true });
        setPlayingHere(true);
        setUnmuted(true);
        return;
      }
      if (unmuted) {
        el.muted = true;
        setUnmuted(false);
      } else {
        homeVideoRequestPlay(sample.id, el, { unmuted: true });
        setUnmuted(true);
      }
    },
    [sample.id, unmuted, playingHere],
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
        "group relative w-full self-start overflow-hidden rounded-2xl",
        "bg-muted/15 ring-1 ring-border/25 transition duration-300",
        "hover:ring-primary/30 hover:shadow-md",
        span,
        className,
      )}
      data-sample-id={sample.id}
      data-aspect={sample.aspectRatio}
    >
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onClick={togglePlay}
        aria-label={
          isVideo
            ? playingHere
              ? "Pause video"
              : "Play video"
            : `View ${title || "media"}`
        }
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
            onPlay={() => setPlayingHere(true)}
            onPause={() => {
              if (homeVideoGetActiveId() !== sample.id) setPlayingHere(false);
            }}
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
              playingHere && "border-primary/50 bg-primary/85",
            )}
            aria-hidden
          >
            {playingHere ? (
              <Pause className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", "fill-current")} />
            ) : (
              <Play className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", "fill-current")} />
            )}
          </span>
        ) : null}

        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
          {isVideo && playingHere ? (
            <span
              role="button"
              tabIndex={0}
              onClick={toggleSound}
              className={cn(
                "grid place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md",
                large ? "h-9 w-9" : "h-8 w-8",
              )}
              aria-label={unmuted ? "Mute" : "Unmute"}
            >
              {unmuted ? (
                <Volume2 className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
              ) : (
                <VolumeX className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
              )}
            </span>
          ) : null}

          {!playingHere ? (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={onLike}
                className={cn(
                  "grid place-items-center rounded-full border backdrop-blur-md",
                  large ? "h-9 w-9" : "h-8 w-8",
                  liked
                    ? "border-primary/40 bg-primary/25 text-primary"
                    : "border-white/20 bg-black/40 text-white",
                )}
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart
                  className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", liked && "fill-current")}
                />
              </span>
              <Link
                to="/sample/$id"
                params={{ id: sample.id }}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "grid place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md",
                  large ? "h-9 w-9" : "h-8 w-8",
                )}
                aria-label="View details"
              >
                <Info className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
              </Link>
            </>
          ) : null}
        </div>

        {title ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pb-2.5",
              isVideo && (large ? "pl-12" : "pl-11"),
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
