/**
 * Imagine — visual-first discovery gallery (signed-in homepage).
 * Glass cards · tiny type labels · icon controls · real aspect ratios · R2 only.
 * Full CTAs live on the detail sheet, not the homepage card.
 */
import { useMemo, useState } from "react";
import { Download, Share2, Info, X, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  getImagineOnlySamples,
  getActiveR2VideoSamples,
  type R2Sample,
} from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FeedItem = R2Sample & { kind: "image" | "video" };

function interleaveFeed(images: R2Sample[], videos: R2Sample[]): FeedItem[] {
  const img = images.filter((s) => s.active);
  const vid = videos.filter((s) => s.active);
  const seen = new Set<string>();
  const dedupe = <T extends { url: string }>(arr: T[]) =>
    arr.filter((x) => {
      if (seen.has(x.url)) return false;
      seen.add(x.url);
      return true;
    });
  const imgs = dedupe(img);
  const vids = dedupe(vid);
  const out: FeedItem[] = [];
  let i = 0;
  let v = 0;
  while (i < imgs.length || v < vids.length) {
    for (let n = 0; n < 2 && i < imgs.length; n++) {
      out.push({ ...imgs[i++], kind: "image" });
    }
    if (v < vids.length) {
      out.push({ ...vids[v++], kind: "video" });
    }
  }
  return out;
}

function aspectClass(ar: string): string {
  if (ar === "16:9" || ar === "21:9") return "aspect-video";
  if (ar === "1:1") return "aspect-square";
  if (ar === "3:4") return "aspect-[3/4]";
  if (ar === "9:16") return "aspect-[9/16]";
  if (ar === "3:2") return "aspect-[3/2]";
  if (ar === "2:3") return "aspect-[2/3]";
  if (ar === "4:3") return "aspect-[4/3]";
  if (ar === "11:15") return "aspect-[11/15]";
  return "aspect-[4/5]";
}

function typeLabel(s: FeedItem): string {
  if (s.kind === "video") return "VIDEO";
  if (s.feature === "portrait") return "TEXT TO IMAGE";
  if (s.feature === "image-generation") return "TEXT TO IMAGE";
  if (s.feature === "enhancement") return "IMAGE TO IMAGE";
  return "IMAGE";
}

function tryNowHref(s: FeedItem): string {
  if (s.kind === "video") return "/studio/video";
  return "/studio/image";
}

function GlassIconBtn({
  onClick,
  label,
  children,
  isDark,
}: {
  onClick: () => void;
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
        "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition active:scale-95",
        isDark
          ? "border-white/20 bg-black/35 text-white hover:bg-black/50"
          : "border-white/40 bg-white/55 text-[#1A1C24] hover:bg-white/80 shadow-sm",
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
  const tryHref = tryNowHref(sample);
  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/55" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[88vh] overflow-y-auto rounded-t-3xl border-t px-4 py-5 shadow-2xl",
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
        role="dialog"
        aria-label={sample.title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.16em]",
                sample.kind === "video" ? "text-red-500" : "text-[oklch(0.70_0.19_45)]",
              )}
            >
              {typeLabel(sample)}
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

        <div className={cn("overflow-hidden rounded-2xl bg-black/5", aspectClass(sample.aspectRatio))}>
          {sample.kind === "video" ? (
            <video src={sample.url} controls playsInline className="h-full w-full object-contain" />
          ) : (
            <img src={sample.url} alt={sample.title} className="h-full w-full object-cover" />
          )}
        </div>

        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>

        <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Technical details</h4>
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
          {sample.kind === "video" ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Audio</dt>
              <dd className="font-semibold">{sample.hasAudio ? "Present" : "Not verified"}</dd>
            </div>
          ) : null}
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Studio</dt>
            <dd className="font-semibold">{sample.studio}</dd>
          </div>
        </dl>
        <p className={cn("mt-3 text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Generated / edited with Motio2edit. Original generation prompts are not shown.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            to={tryHref as "/studio/image" | "/studio/video"}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Try Now
          </Link>
        </div>
      </div>
    </>
  );
}

function ImagineCard({ sample, isDark }: { sample: FeedItem; isDark: boolean }) {
  const [detail, setDetail] = useState(false);

  const onDownload = async () => {
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

  const onShare = async () => {
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

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/70 backdrop-blur-sm",
        )}
      >
        <div className={cn("relative w-full overflow-hidden bg-muted", aspectClass(sample.aspectRatio))}>
          {sample.kind === "video" ? (
            <video
              src={sample.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={sample.url} alt={sample.title} className="h-full w-full object-cover" loading="lazy" />
          )}

          <span
            className={cn(
              "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/45 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            {typeLabel(sample)}
          </span>

          <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
            <GlassIconBtn onClick={() => setDetail(true)} label={`About ${sample.title}`} isDark={isDark}>
              <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
            <GlassIconBtn onClick={() => void onDownload()} label="Download" isDark={isDark}>
              <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
            <GlassIconBtn onClick={() => void onShare()} label="Share" isDark={isDark}>
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            </GlassIconBtn>
          </div>
        </div>

        <div className="px-2.5 py-2">
          <h3 className="text-[12px] font-semibold leading-tight tracking-tight line-clamp-1">{sample.title}</h3>
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
      className="mt-10 space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      data-imagine-section="post-login-only"
    >
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight">Imagine</h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          See something. Make it yours.
        </p>
      </div>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [column-fill:_balance]">
        {feed.map((s) => (
          <div key={s.id} className="mb-3 break-inside-avoid">
            <ImagineCard sample={s} isDark={isDark} />
          </div>
        ))}
      </div>
    </section>
  );
}
