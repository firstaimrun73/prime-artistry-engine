/**
 * Discovery card — media inside frame, title + description below.
 * Failed R2 media never disappear: show a clean text card with the sample details.
 * One video plays at a time (global pause). Mute/unmute on videos.
 * Wide ratios (16:9 etc.) span full width via col-span-2.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Heart, Info, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

/** Global: only one discovery video plays at a time. */
const PLAY_EVENT = "motio-discovery-video-play";

function parseRatio(ar: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ar.trim());
  if (!m) return 1;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return 1;
  return w / h;
}

/** Wide landscape (≥ ~1.4) spans both columns so 16:9 is not squeezed. */
export function spanClassForSample(sample: R2Sample): string {
  const r = parseRatio(sample.aspectRatio);
  if (r >= 1.35) return "col-span-2";
  return "col-span-1";
}

export const STRIP_ROW_HEIGHT_PX = 220;
export const STRIP_ROW_HEIGHT_PX_SM = 240;

export function stripCardStyle(sample: R2Sample): React.CSSProperties {
  const r = parseRatio(sample.aspectRatio);
  return {
    height: "var(--strip-h, 220px)",
    aspectRatio: String(r),
    width: "auto",
    flexShrink: 0,
  };
}

function QualityTierBadge({ tier }: { tier: string }) {
  if (tier === "Premium") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[9px] font-bold text-black shadow-sm">
        <Crown className="h-2.5 w-2.5 fill-current" aria-hidden />
        Premium
      </span>
    );
  }
  if (tier === "Ultra AI") {
    return (
      <span className="rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
        Ultra AI
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-800 shadow-sm">
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
  stripMode?: boolean;
};

export function GalleryMediaCard({
  sample,
  liked = false,
  onToggleLike,
  onOpenViewer,
  className,
  size = "default",
  stripMode = false,
}: Props) {
  const isVideo = sample.format === "MP4" || sample.url.endsWith(".mp4");
  const large = size === "large" || stripMode;
  const [failed, setFailed] = useState(false);
  const catalogRatio = parseRatio(sample.aspectRatio);
  const [liveRatio, setLiveRatio] = useState<number | null>(null);
  const ratio = liveRatio ?? catalogRatio;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const applyNaturalSize = useCallback((w: number, h: number) => {
    if (w > 0 && h > 0) setLiveRatio(w / h);
  }, []);

  useEffect(() => {
    if (!isVideo) return;
    const onOtherPlay = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== sample.id && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, [isVideo, sample.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (!isVideo || !videoRef.current || failed) {
        onOpenViewer?.(sample);
        return;
      }
      const v = videoRef.current;
      if (v.paused) {
        window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: sample.id }));
        v.muted = muted;
        void v.play().then(() => setPlaying(true)).catch(() => {});
      } else {
        v.pause();
        setPlaying(false);
      }
    },
    [isVideo, onOpenViewer, sample, muted, failed],
  );

  const onLike = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleLike?.(sample);
    },
    [onToggleLike, sample],
  );

  const tier = sample.qualityTier ?? null;
  const title = sample.title?.trim() || "Untitled";
  const description = sample.description?.trim() || "";
  const wide = ratio >= 1.35;

  // Failed media: still render a full card filled with title + detailed description (no black empty hole)
  if (failed) {
    return (
      <div
        className={cn(
          "flex w-full flex-col",
          !stripMode && (wide ? "col-span-2" : "col-span-1"),
          className,
        )}
      >
        <article
          className={cn(
            "group relative flex w-full flex-col justify-end overflow-hidden rounded-[14px]",
            "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 ring-1 ring-border/40",
            "min-h-[160px] p-3.5",
          )}
          style={stripMode ? { ...stripCardStyle(sample) } : { aspectRatio: String(Math.min(ratio, 1.2) || 0.75) }}
          data-sample-id={sample.id}
        >
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
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
              aria-label="Open details"
            >
              <Info className="h-3.5 w-3.5" />
            </Link>
          </div>

          {tier ? (
            <div className="pointer-events-none absolute left-2 top-2 z-10">
              <QualityTierBadge tier={tier} />
            </div>
          ) : null}

          <div className="relative z-10 space-y-1.5 pr-10 pt-8">
            <p className="text-[13px] font-bold leading-snug text-white">{title}</p>
            {description ? (
              <p className="text-[11px] leading-relaxed text-white/75 line-clamp-4">{description}</p>
            ) : null}
          </div>
        </article>

        <p className="mt-1.5 line-clamp-2 px-0.5 text-[12px] font-semibold leading-snug text-foreground">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 line-clamp-2 px-0.5 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        !stripMode && (wide ? "col-span-2" : "col-span-1"),
        className,
      )}
    >
      <article
        className={cn(
          "group relative w-full overflow-hidden rounded-[14px]",
          "bg-muted/20 ring-1 ring-border/30 transition duration-300",
          "hover:ring-primary/35 hover:shadow-md",
        )}
        style={
          stripMode
            ? { ...stripCardStyle(sample), aspectRatio: String(ratio) }
            : { aspectRatio: String(ratio) }
        }
        data-sample-id={sample.id}
        data-aspect={sample.aspectRatio}
      >
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
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
            aria-label="Open details"
          >
            <Info className="h-3.5 w-3.5" />
          </Link>
        </div>

        {tier ? (
          <div className="pointer-events-none absolute left-2 top-2 z-10">
            <QualityTierBadge tier={tier} />
          </div>
        ) : null}

        <button
          type="button"
          className="relative block h-full w-full overflow-hidden rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={togglePlay}
          aria-label={isVideo ? (playing ? "Pause" : "Play") : `View ${title}`}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={sample.url}
              muted={muted}
              playsInline
              loop
              preload="metadata"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                applyNaturalSize(v.videoWidth, v.videoHeight);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
            />
          ) : (
            <img
              src={sample.url}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onLoad={(e) => {
                const img = e.currentTarget;
                applyNaturalSize(img.naturalWidth, img.naturalHeight);
              }}
              onError={() => setFailed(true)}
            />
          )}

          {isVideo ? (
            <span
              className={cn(
                "absolute bottom-2.5 left-2.5 grid place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md",
                large ? "h-9 w-9" : "h-8 w-8",
              )}
              aria-hidden
            >
              {playing ? (
                <Pause className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", "fill-current")} />
              ) : (
                <Play className={cn(large ? "h-4 w-4" : "h-3.5 w-3.5", "fill-current")} />
              )}
            </span>
          ) : null}
        </button>

        {isVideo ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="absolute bottom-2.5 right-2.5 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </article>

      {/* Title + detailed description always visible under the card */}
      <p className="mt-1.5 line-clamp-2 px-0.5 text-[12px] font-semibold leading-snug text-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-0.5 line-clamp-2 px-0.5 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function stripWidthClassForSample(_sample: R2Sample): string {
  return "";
}
