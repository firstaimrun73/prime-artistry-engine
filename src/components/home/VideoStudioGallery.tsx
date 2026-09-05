/**
 * VIDEO STUDIO section — signed-in homepage.
 * Real R2 videos from central catalog. No duplicates.
 */
import { useMemo, useState } from "react";
import { Download, Share2, Info, X, Film, Play } from "lucide-react";
import { getActiveR2VideoSamples, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t px-4 py-5 shadow-2xl",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
        role="dialog"
        aria-label={sample.title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-500">Video Studio</p>
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
            <dd className="font-semibold">{sample.hasAudio ? "Present" : "Check clip"}</dd>
          </div>
        </dl>
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
          "flex w-[min(100%,280px)] shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
      >
        <div className={cn("relative w-full overflow-hidden bg-black", arClass)}>
          <video src={sample.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <h3 className="text-[12px] font-bold leading-tight">{sample.title}</h3>
          <p className={cn("text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
            Video Studio · {sample.quality ?? "HD"} · {sample.aspectRatio}
          </p>
          <div className="mt-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => void onDownload()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Download className="h-3 w-3" />
              Download
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setDetail(true)}
              aria-label={`About ${sample.title}`}
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>
      {detail ? <VideoDetailSheet sample={sample} onClose={() => setDetail(false)} isDark={isDark} /> : null}
    </>
  );
}

export function VideoStudioGallery() {
  const samples = useMemo(() => getActiveR2VideoSamples(), []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (samples.length === 0) return null;

  return (
    <section className="mt-10 space-y-4" data-video-studio-section="post-login">
      <div>
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <Film className="h-4 w-4 text-red-500" />
          Video Studio
        </h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Motion samples · download · share
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
