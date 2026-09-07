/**
 * Media-first discovery card.
 * Horizontal strips: fixed row height, width = height × ratio (Claude fix).
 * Bottoms align · no empty gap · native ratio · no crop when media matches card AR.
 */
import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Heart, Info, Play } from "lucide-react";
import type { R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

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

/** Fixed strip height (px). Width = height × ratio. */
export const STRIP_ROW_HEIGHT_PX = 200;
export const STRIP_ROW_HEIGHT_PX_SM = 220;

/** Inline style for strip cards — fixed height, width from aspect ratio. */
export function stripCardStyle(sample: R2Sample): React.CSSProperties {
  const r = parseRatio(sample.aspectRatio);
  return {
    height: "var(--strip-h, 200px)",
    aspectRatio: String(r),
    width: "auto",
    flexShrink: 0,
  };
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
  /** When true, card uses fixed-height strip layout (width from ratio). */
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
  const ratio = parseRatio(sample.aspectRatio);

  const openMedia = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      onOpenViewer?.(sample);
    },
    [onOpenViewer, sample],
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
  const span = stripMode ? "" : spanClassForSample(sample);
  const title = sample.title?.trim() || null;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[14px]",
        "bg-muted/15 ring-1 ring-border/25 transition duration-300",
        "hover:ring-primary/30 hover:shadow-md",
        !stripMode && "w-full self-start",
        span,
        className,
      )}
      style={stripMode ? stripCardStyle(sample) : undefined}
      data-sample-id={sample.id}
      data-aspect={sample.aspectRatio}
      data-ratio={sample.aspectRatio}
    >
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
        className={cn(
          "relative block overflow-hidden rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          stripMode ? "h-full w-full" : "w-full",
        )}
        onClick={openMedia}
        aria-label={isVideo ? `Open video ${title || ""}` : `View ${title || "media"}`}
      >
        {isVideo ? (
          <video
            src={sample.url}
            muted
            playsInline
            loop
            preload="metadata"
            className={cn(
              "pointer-events-none block",
              stripMode ? "h-full w-full object-cover" : "h-auto w-full",
            )}
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={sample.url}
            alt={title || "Sample"}
            className={cn(
              "block",
              stripMode ? "h-full w-full object-cover" : "h-auto w-full",
            )}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

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

// keep export for any legacy imports
export function stripWidthClassForSample(_sample: R2Sample): string {
  return "";
}
