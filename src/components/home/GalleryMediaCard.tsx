/**
 * Editorial discovery card — media-first, native ratio, independent actions:
 * media → viewer | ♥ → favourite | ⓘ → /sample/$id
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Info, Play, Volume2, VolumeX } from "lucide-react";
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

function shortDesc(desc: string | undefined): string | null {
  if (!desc) return null;
  const words = desc.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const take = words.slice(0, 4).join(" ");
  return words.length > 4 ? `${take}…` : take;
}

type Props = {
  sample: R2Sample;
  liked?: boolean;
  onToggleLike?: (sample: R2Sample) => void;
  onOpenViewer?: (sample: R2Sample) => void;
  className?: string;
};

export function GalleryMediaCard({
  sample,
  liked = false,
  onToggleLike,
  onOpenViewer,
  className,
}: Props) {
  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setActiveTick] = useState(0);
  const [showSound, setShowSound] = useState(false);
  const [unmuted, setUnmuted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => homeVideoSubscribe(() => setActiveTick((n) => n + 1)), []);

  useEffect(() => {
    if (!isVideo) return;
    homeVideoRegister(sample.id, videoRef.current);
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

  const openViewer = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (isVideo) {
        const el = videoRef.current;
        if (el) {
          homeVideoRequestPlay(sample.id, el, { unmuted: false });
          setUnmuted(false);
          setShowSound(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setShowSound(false), 2800);
        }
      }
      onOpenViewer?.(sample);
    },
    [isVideo, onOpenViewer, sample],
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

  const onLike = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleLike?.(sample);
    },
    [onToggleLike, sample],
  );

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (failed) return null;

  const badge = categoryBadge(sample);
  const span = spanClassForSample(sample);
  const desc = shortDesc(sample.description);

  return (
    <article
      className={cn("group relative w-full self-start overflow-hidden rounded-xl", "bg-transparent", span, className)}
      data-sample-id={sample.id}
      data-aspect={sample.aspectRatio}
    >
      <button
        type="button"
        className="relative block w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        onClick={openViewer}
        onMouseEnter={isVideo ? startMutedPreview : undefined}
        onMouseLeave={isVideo ? stopIfMuted : undefined}
        aria-label={`View ${sample.title || "media"}`}
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

        {isVideo ? (
          <span className="pointer-events-none absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md">
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          </span>
        ) : null}

        {badge ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
            {badge}
          </span>
        ) : null}

        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
          {isVideo && showSound ? (
            <span
              role="button"
              tabIndex={0}
              onClick={toggleSound}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleSound(e as unknown as React.MouseEvent);
              }}
              className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md"
              aria-label={unmuted ? "Mute" : "Unmute"}
            >
              {unmuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </span>
          ) : null}
          <span
            role="button"
            tabIndex={0}
            onClick={onLike}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onLike(e as unknown as React.MouseEvent);
            }}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md transition",
              liked ? "border-primary/40 bg-primary/25 text-primary" : "border-white/20 bg-black/35 text-white",
            )}
            aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
          </span>
          <Link
            to="/sample/$id"
            params={{ id: sample.id }}
            onClick={(e) => e.stopPropagation()}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md"
            aria-label="View details"
          >
            <Info className="h-3.5 w-3.5" />
          </Link>
        </div>
      </button>

      {sample.title ? (
        <div className="overflow-visible px-0.5 pt-1.5 pb-1">
          <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground/90">{sample.title}</p>
          {desc ? <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">{desc}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
