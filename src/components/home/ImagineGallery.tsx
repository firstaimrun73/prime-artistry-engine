/**
 * Imagine section — signed-in homepage only.
 * Distinct from Circle 2edit. Responsive grid (≈2 on mobile, more on desktop).
 * Per card: image + Download + Share + ⓘ. No Try Now.
 */
import { useMemo, useState } from "react";
import { Download, Share2, Info, X } from "lucide-react";
import {
  getActiveImagineSamples,
  resolveImagineMediaUrl,
  type ImagineSample,
} from "@/lib/circle-edit/imagine-samples";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function aspectClass(ar: string): string {
  if (ar === "16:9") return "aspect-video";
  if (ar === "1:1") return "aspect-square";
  if (ar === "3:4") return "aspect-[3/4]";
  if (ar === "21:9") return "aspect-[21/9]";
  return "aspect-[4/5]";
}

function ImagineDetailSheet({
  sample,
  onClose,
  isDark,
}: {
  sample: ImagineSample;
  onClose: () => void;
  isDark: boolean;
}) {
  const src = resolveImagineMediaUrl(sample);
  return (
    <>
      <button type="button" className="fixed inset-0 z-[80] bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t px-4 py-5 shadow-2xl",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
        role="dialog"
        aria-label={sample.title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#7B6FE0]">Imagine</p>
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
        <div className={cn("overflow-hidden rounded-2xl", aspectClass(sample.aspectRatio))}>
          <img src={src} alt={sample.title} className="h-full w-full object-cover" />
        </div>
        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Quality</dt>
            <dd className="font-semibold">{sample.quality}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Aspect ratio</dt>
            <dd className="font-semibold">{sample.aspectRatio}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Generation mode</dt>
            <dd className="font-semibold">{sample.generationMode}</dd>
          </div>
          <div>
            <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Build duration</dt>
            <dd className="font-semibold">{sample.buildDuration}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}

function ImagineCard({ sample, isDark }: { sample: ImagineSample; isDark: boolean }) {
  const src = useMemo(() => resolveImagineMediaUrl(sample), [sample]);
  const [detail, setDetail] = useState(false);

  const onDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-imagine-${sample.id}.jpg`;
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
        await navigator.share({ title: sample.title, text: sample.description, url: src });
      } else {
        await navigator.clipboard.writeText(src);
        toast.message("Link copied");
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <>
      <article
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border shadow-sm",
          isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white",
        )}
      >
        <div className={cn("relative w-full overflow-hidden bg-muted", aspectClass(sample.aspectRatio))}>
          <img src={src} alt={sample.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="text-[13px] font-bold leading-tight tracking-tight">{sample.title}</h3>
          <div className="mt-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onDownload()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setDetail(true)}
              aria-label={`About ${sample.title}`}
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                isDark ? "border-white/12 text-[#C5C7D0]" : "border-black/10 text-[#3A3E4C]",
              )}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>
      {detail ? <ImagineDetailSheet sample={sample} onClose={() => setDetail(false)} isDark={isDark} /> : null}
    </>
  );
}

export function ImagineGallery() {
  const samples = useMemo(() => getActiveImagineSamples(), []);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (samples.length === 0) return null;

  return (
    <section className="mt-10 space-y-4" data-imagine-section="post-login-only">
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight">Imagine</h2>
        <p className={cn("mt-0.5 text-[13px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
          Generated looks · download · share
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {samples.map((s) => (
          <ImagineCard key={s.id} sample={s} isDark={isDark} />
        ))}
      </div>
    </section>
  );
}
