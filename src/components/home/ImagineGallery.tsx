/**
 * Imagine — premium visual discovery feed.
 * Categories: SAMPLES (download/share only) · VIDEO
 * Media click opens detail. No universal Try Now on cards.
 * Native aspect ratios. Controlled grid (not chaotic masonry).
 */
import { useMemo, useState } from "react";
import { Download, Share2, Info, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  getImagineOnlySamples,
  getActiveR2VideoSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Homepage interaction category — determines controls & behaviour */
export type HomepageCategory = "samples" | "try-now" | "trend" | "video" | "music";

type FeedItem = R2Sample & {
  kind: "image" | "video";
  homepageCategory: HomepageCategory;
};

function classify(s: R2Sample, kind: "image" | "video"): HomepageCategory {
  if (kind === "video") return "video";
  const cat = (s as R2Sample & { homepageCategory?: HomepageCategory }).homepageCategory;
  if (cat === "try-now" || cat === "trend") return cat;
  return "samples";
}

function interleaveFeed(images: R2Sample[], videos: R2Sample[]): FeedItem[] {
  const seen = new Set<string>();
  const dedupe = <T extends { url: string }>(arr: T[]) =>
    arr.filter((x) => {
      if (seen.has(x.url)) return false;
      seen.add(x.url);
      return true;
    });
  const imgs = dedupe(images.filter((s) => s.active));
  const vids = dedupe(videos.filter((s) => s.active));
  const out: FeedItem[] = [];
  let i = 0;
  let v = 0;
  while (i < imgs.length || v < vids.length) {
    for (let n = 0; n < 2 && i < imgs.length; n++) {
      const s = imgs[i++];
      out.push({ ...s, kind: "image", homepageCategory: classify(s, "image") });
    }
    if (v < vids.length) {
      const s = vids[v++];
      out.push({ ...s, kind: "video", homepageCategory: classify(s, "video") });
    }
  }
  return out;
}

/** Container aspect must match source — never force 16:9 */
function aspectClass(ar: string): string {
  switch (ar) {
    case "16:9":
    case "21:9":
      return "aspect-video";
    case "9:16":
      return "aspect-[9/16]";
    case "1:1":
      return "aspect-square";
    case "3:4":
      return "aspect-[3/4]";
    case "4:5":
      return "aspect-[4/5]";
    case "2:3":
      return "aspect-[2/3]";
    case "3:2":
      return "aspect-[3/2]";
    case "4:3":
      return "aspect-[4/3]";
    case "11:15":
      return "aspect-[11/15]";
    default:
      return "aspect-[4/5]";
  }
}

function categoryLabel(s: FeedItem): string {
  if (s.homepageCategory === "video") return "VIDEO";
  if (s.homepageCategory === "try-now") return "TRY NOW";
  if (s.homepageCategory === "trend") return "TREND";
  if (s.homepageCategory === "music") return "MUSIC";
  return "SAMPLES";
}

function studioHref(s: FeedItem): "/studio/image" | "/studio/video" {
  if (s.kind === "video") return "/studio/video";
  return "/studio/image";
}

function CompactAction({
  onClick,
  label,
  children,
  isDark,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        isDark
          ? "border-white/15 bg-black/30 text-white/90 hover:bg-black/50"
          : "border-white/50 bg-white/50 text-[#1A1C24] hover:bg-white/80",
      )}
    >
      {children}
    </button>
  );
}

function DetailSheet({
  sample,
  onClose,
  isDark,
}: {
  sample: FeedItem;
  onClose: () => void;
  isDark: boolean;
}) {
  const showTry = sample.homepageCategory === "try-now" || sample.kind === "video";
  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/55" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[90vh] overflow-y-auto rounded-t-3xl border-t px-4 py-5 shadow-2xl",
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
        role="dialog"
        aria-label={sample.title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {categoryLabel(sample)}
            </p>
            <h3 className="text-[17px] font-extrabold tracking-tight">{sample.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border",
              isDark ? "border-white/12" : "border-black/10",
            )}
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn("mx-auto max-w-lg overflow-hidden rounded-2xl bg-black/5", aspectClass(sample.aspectRatio))}>
          {sample.kind === "video" ? (
            <video src={sample.url} controls playsInline className="h-full w-full object-contain" />
          ) : (
            <img src={sample.url} alt={sample.title} className="h-full w-full object-contain" />
          )}
        </div>

        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>

        <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Details</h4>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
            <dd className="font-semibold">{sample.quality ?? "—"}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect</dt>
            <dd className="font-semibold">{sample.aspectRatio}</dd>
          </div>
          {sample.width && sample.height ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Dimensions</dt>
              <dd className="font-semibold">
                {sample.width}×{sample.height}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Format</dt>
            <dd className="font-semibold">{sample.format}</dd>
          </div>
          {sample.fileSizeLabel ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>File size</dt>
              <dd className="font-semibold">{sample.fileSizeLabel}</dd>
            </div>
          ) : null}
          {sample.durationLabel ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Duration</dt>
              <dd className="font-semibold">{sample.durationLabel}</dd>
            </div>
          ) : null}
        </dl>
        <p className={cn("mt-3 text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Motio2edit sample. Generation prompts are not shown.
        </p>

        {showTry ? (
          <div className="mt-5">
            <Link
              to={studioHref(sample)}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm"
            >
              Open studio
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ImagineCard({ sample, isDark }: { sample: FeedItem; isDark: boolean }) {
  const [detail, setDetail] = useState(false);

  const onDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-${sample.id}.${sample.format?.toLowerCase() === "mp4" ? "mp4" : "png"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const onShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({ title: sample.title, text: sample.description, url: sample.url });
      } else {
        await navigator.clipboard.writeText(sample.url);
        toast.message("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  const openDetail = () => setDetail(true);
  const isWide = sample.aspectRatio === "16:9" || sample.aspectRatio === "21:9" || sample.aspectRatio === "3:2";

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/80",
          isWide && "sm:col-span-2",
        )}
      >
        <button
          type="button"
          onClick={openDetail}
          className={cn(
            "relative w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            aspectClass(sample.aspectRatio),
          )}
          aria-label={`Open ${sample.title}`}
        >
          {sample.kind === "video" ? (
            <video
              src={sample.url}
              muted
              playsInline
              preload="metadata"
              className="pointer-events-none h-full w-full object-contain"
            />
          ) : (
            <img
              src={sample.url}
              alt={sample.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}

          <span
            className={cn(
              "pointer-events-none absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/40 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            {categoryLabel(sample)}
          </span>

          <div
            className="absolute bottom-2 right-2 z-10 flex gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CompactAction onClick={(e) => { e.stopPropagation(); setDetail(true); }} label={`About ${sample.title}`} isDark={isDark}>
              <Info className="h-3 w-3" strokeWidth={2.25} />
            </CompactAction>
            <CompactAction onClick={onDownload} label="Download" isDark={isDark}>
              <Download className="h-3 w-3" strokeWidth={2.25} />
            </CompactAction>
            <CompactAction onClick={onShare} label="Share" isDark={isDark}>
              <Share2 className="h-3 w-3" strokeWidth={2.25} />
            </CompactAction>
          </div>
        </button>

        <div className="px-2.5 py-2">
          <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{sample.title}</h3>
          {sample.description ? (
            <p className={cn("mt-0.5 line-clamp-1 text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              {sample.description}
            </p>
          ) : null}
        </div>
      </article>
      {detail ? <DetailSheet sample={sample} onClose={() => setDetail(false)} isDark={isDark} /> : null}
    </>
  );
}

export function ImagineGallery() {
  const feed = useMemo(() => interleaveFeed(getImagineOnlySamples(), getActiveR2VideoSamples()), []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (feed.length === 0) return null;

  return (
    <section
      className="mt-10 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-imagine-section="discovery"
    >
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight">Imagine</h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          See something. Make it yours.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {feed.map((s) => (
          <ImagineCard key={s.id} sample={s} isDark={isDark} />
        ))}
      </div>
    </section>
  );
}
