/**
 * VIDEO STUDIO section — signed-in homepage.
 * Real R2 videos from central catalog. Deduped. Glass controls. Muted previews.
 */
import { useMemo, useState } from "react";
import { Download, Share2, Info, X, Film, Play, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getActiveR2VideoSamples, HOMEPAGE_WATCH_DEMO, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function VideoDetailSheet({
  sample,
  onClose,
  isDark,
}: {
  sample: R2Sample;
  onClose: () => void;
  isDark: boolean;
}) {
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
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-500">Video</p>
            <h3 className="text-[17px] font-extrabold tracking-tight">{sample.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border",
              isDark ? "border-white/12" : "border-black/10",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <video src={sample.url} controls playsInline className="h-full w-full object-contain" />
        </div>
        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
            <dd className="font-semibold">{sample.quality ?? "HD"}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect</dt>
            <dd className="font-semibold">{sample.aspectRatio}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Format</dt>
            <dd className="font-semibold">{sample.format}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Audio</dt>
            <dd className="font-semibold">{sample.hasAudio ? "Present (AAC stereo)" : "Not verified"}</dd>
          </div>
          {sample.durationLabel ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Duration</dt>
              <dd className="font-semibold">{sample.durationLabel}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5">
          <Link
            to={"/studio/video" as "/studio/video"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-red-600 px-4 py-3 text-[14px] font-semibold text-white shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Try Now
          </Link>
        </div>
      </div>
    </>
  );
}

function VideoCard({ sample, isDark }: { sample: R2Sample; isDark: boolean }) {
  const [detail, setDetail] = useState(false);
  const arClass = sample.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video";

  const onDownload = async () => {
    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-video-${sample.id}.mp4`;
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
          "flex w-[min(100%,320px)] shrink-0 flex-col overflow-hidden rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/70 backdrop-blur-sm",
        )}
      >
        <div className={cn("relative w-full overflow-hidden bg-black", arClass)}>
          <video src={sample.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </span>
          <span
            className={cn(
              "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/45 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            Video
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
          <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{sample.title}</h3>
        </div>
      </article>
      {detail ? <VideoDetailSheet sample={sample} onClose={() => setDetail(false)} isDark={isDark} /> : null}
    </>
  );
}

export function VideoStudioGallery() {
  const samples = useMemo(() => {
    const all = getActiveR2VideoSamples();
    const seen = new Set<string>();
    const unique: R2Sample[] = [];
    for (const s of all) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      unique.push(s);
    }
    unique.sort((a, b) => {
      if (a.url === HOMEPAGE_WATCH_DEMO.url) return -1;
      if (b.url === HOMEPAGE_WATCH_DEMO.url) return 1;
      return a.sortOrder - b.sortOrder;
    });
    return unique;
  }, []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (samples.length === 0) return null;

  return (
    <section
      className="mt-10 space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      data-video-studio-section="post-login"
    >
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <Film className="h-4 w-4 text-red-500" />
          Video Studio
        </h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Motion samples · muted preview · open for sound
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {samples.map((s) => (
          <div key={s.id} className="snap-start">
            <VideoCard sample={s} isDark={isDark} />
          </div>
        ))}
      </div>
    </section>
  );
}
