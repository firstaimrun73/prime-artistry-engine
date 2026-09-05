/**
 * Imagine — premium visual discovery feed.
 *
 * Categories (explicit catalog only): SAMPLES · TRY NOW · TREND · …
 * Media type is separate (image/video).
 * No nested <button>. Media click ≠ action click.
 * Trend uses real generateMedia (auth + credits + I2I).
 */
import { useMemo, useState, useCallback, type KeyboardEvent } from "react";
import { Download, Share2, Info, X, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getImagineOnlySamples,
  getActiveR2VideoSamples,
  type R2Sample,
  type HomepageCategory,
} from "@/lib/r2-catalog";
import { generateMedia } from "@/lib/generate.functions";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FeedItem = R2Sample & {
  kind: "image" | "video";
  homepageCategory: HomepageCategory;
};

function resolveCategory(s: R2Sample, kind: "image" | "video"): HomepageCategory {
  if (s.homepageCategory) return s.homepageCategory;
  if (kind === "video") return "video";
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
      out.push({ ...s, kind: "image", homepageCategory: resolveCategory(s, "image") });
    }
    if (v < vids.length) {
      const s = vids[v++];
      out.push({ ...s, kind: "video", homepageCategory: resolveCategory(s, "video") });
    }
  }
  return out;
}

/** Native aspect from catalog ratio or width/height — never force 16:9 */
function aspectStyle(s: { aspectRatio: string; width?: number; height?: number }): React.CSSProperties {
  if (s.width && s.height && s.width > 0 && s.height > 0) {
    return { aspectRatio: `${s.width} / ${s.height}` };
  }
  const map: Record<string, string> = {
    "16:9": "16 / 9",
    "21:9": "21 / 9",
    "9:16": "9 / 16",
    "1:1": "1 / 1",
    "3:4": "3 / 4",
    "4:5": "4 / 5",
    "2:3": "2 / 3",
    "3:2": "3 / 2",
    "4:3": "4 / 3",
    "11:15": "11 / 15",
  };
  return { aspectRatio: map[s.aspectRatio] ?? "4 / 5" };
}

function categoryLabel(cat: HomepageCategory): string {
  switch (cat) {
    case "try-now":
      return "TRY NOW";
    case "trend":
      return "TREND";
    case "before-after":
      return "BEFORE & AFTER";
    case "new":
      return "NEW";
    case "popular":
      return "POPULAR";
    case "featured":
      return "FEATURED";
    case "inspiration":
      return "INSPIRATION";
    case "video":
      return "VIDEO";
    case "music":
      return "MUSIC";
    default:
      return "SAMPLES";
  }
}

function generationTypeLabel(s: FeedItem): string | null {
  if (s.kind === "video") return "Video";
  if (s.feature === "portrait" || s.feature === "image-generation") return "Text to Image";
  if (s.feature === "enhancement") return "Enhancement";
  if (s.feature === "circle-remove") return "Circle Remove";
  if (s.feature === "circle-add") return "Circle Add";
  return null;
}

function CompactIcon({
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        isDark
          ? "border-white/15 bg-black/30 text-white/90 hover:bg-black/50"
          : "border-white/50 bg-white/55 text-[#1A1C24] hover:bg-white/85",
      )}
    >
      {children}
    </button>
  );
}

function DetailSheet({
  sample,
  displayUrl,
  onClose,
  isDark,
}: {
  sample: FeedItem;
  displayUrl: string;
  onClose: () => void;
  isDark: boolean;
}) {
  const genType = generationTypeLabel(sample);
  const tryRoute = sample.tryNowRoute;
  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/55"
        role="button"
        tabIndex={0}
        aria-label="Close"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") onClose();
        }}
      />
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
              {categoryLabel(sample.homepageCategory)}
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

        <div
          className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-black/5"
          style={aspectStyle(sample)}
        >
          {sample.kind === "video" ? (
            <video src={displayUrl} controls playsInline className="h-full w-full object-contain" />
          ) : (
            <img src={displayUrl} alt={sample.title} className="h-full w-full object-contain" />
          )}
        </div>

        <p className={cn("mt-3 text-[13px] leading-relaxed", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          {sample.description}
        </p>

        <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          What is this?
        </h4>
        <p className={cn("mt-1 text-[12px]", isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]")}>
          A Motio2edit discovery sample. View, download, or share. Generation prompts are not shown.
        </p>

        <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Details</h4>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          {genType ? (
            <div>
              <dt className={isDark ? "text-[#9AA0B0]" : "text-[#5C6170]"}>Generation type</dt>
              <dd className="font-semibold">{genType}</dd>
            </div>
          ) : null}
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

        {tryRoute ? (
          <div className="mt-5">
            <a
              href={tryRoute}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-sm"
            >
              Try this edit
            </a>
          </div>
        ) : sample.kind === "video" ? (
          <div className="mt-5">
            <Link
              to="/studio/video"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-[14px] font-semibold text-white shadow-sm"
            >
              Open Video Studio
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

function useSampleActions(url: string, id: string, title: string, description: string, format?: string) {
  const onDownload = useCallback(async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `motio2edit-${id}.${format?.toLowerCase() === "mp4" ? "mp4" : "png"}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  }, [url, id, format]);

  const onShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: description, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.message("Link copied");
      }
    } catch {
      /* cancelled */
    }
  }, [url, title, description]);

  return { onDownload, onShare };
}

function TrendCard({ sample, isDark }: { sample: FeedItem; isDark: boolean }) {
  const [detail, setDetail] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [displayUrl, setDisplayUrl] = useState(sample.url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generate = useServerFn(generateMedia);
  const { user, profile, refreshProfile } = useAuth();

  const openDetail = () => setDetail(true);

  const onMediaKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail();
    }
  };

  const runTrend = async () => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Describe your change first.");
      return;
    }
    if (!user) {
      toast.error("Sign in to generate.", {
        action: { label: "Sign in", onClick: () => { window.location.href = "/auth"; } },
      });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await generate({
        data: {
          type: "image",
          prompt: text,
          imageUrl: displayUrl,
          sourceKind: "image",
          strength: 0.72,
          studioTier: "standard",
        },
      });
      const out = (res as { outputUrl?: string })?.outputUrl;
      if (!out) throw new Error("No output returned.");
      setDisplayUrl(out);
      setPrompt("");
      void refreshProfile?.();
      toast.success("Trend edit ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      if (/credit/i.test(msg)) {
        toast.error(msg, {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
      } else if (/sign|auth|session|account/i.test(msg)) {
        toast.error(msg, {
          action: { label: "Sign in", onClick: () => { window.location.href = "/auth"; } },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const isWide =
    sample.aspectRatio === "16:9" || sample.aspectRatio === "21:9" || sample.aspectRatio === "3:2";

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/80",
          isWide && "sm:col-span-2",
        )}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openDetail}
          onKeyDown={onMediaKey}
          className="relative w-full cursor-pointer overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          style={aspectStyle(sample)}
          aria-label={`Open ${sample.title}`}
        >
          <img
            src={displayUrl}
            alt={sample.title}
            className="pointer-events-none h-full w-full object-cover"
            loading="lazy"
          />
          {busy ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : null}
          <span
            className={cn(
              "pointer-events-none absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/40 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            TREND
          </span>
          <div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
            <CompactIcon onClick={openDetail} label={`About ${sample.title}`} isDark={isDark}>
              <Info className="h-3 w-3" strokeWidth={2.25} />
            </CompactIcon>
          </div>
        </div>

        <div className="space-y-1.5 px-2.5 py-2">
          <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{sample.title}</h3>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) void runTrend();
              }}
              disabled={busy}
              placeholder="Describe your change…"
              className={cn(
                "min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary/50",
                isDark
                  ? "border-white/10 bg-black/30 text-white placeholder:text-white/40"
                  : "border-black/10 bg-white text-[#1A1C24] placeholder:text-[#9AA0B0]",
              )}
              aria-label="Trend edit prompt"
            />
            <button
              type="button"
              disabled={busy || !prompt.trim()}
              onClick={() => void runTrend()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition disabled:opacity-40"
              aria-label="Generate trend edit"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
          {error ? (
            <p className="text-[10px] text-red-500 line-clamp-2">{error}</p>
          ) : profile ? (
            <p className={cn("text-[9px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              Uses Image Studio credits · {profile.credits} left
            </p>
          ) : (
            <p className={cn("text-[9px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              Sign in to generate
            </p>
          )}
        </div>
      </article>
      {detail ? (
        <DetailSheet
          sample={sample}
          displayUrl={displayUrl}
          onClose={() => setDetail(false)}
          isDark={isDark}
        />
      ) : null}
    </>
  );
}

function SampleCard({ sample, isDark }: { sample: FeedItem; isDark: boolean }) {
  const [detail, setDetail] = useState(false);
  const { onDownload, onShare } = useSampleActions(
    sample.url,
    sample.id,
    sample.title,
    sample.description,
    sample.format,
  );
  const cat = sample.homepageCategory;
  const isWide =
    sample.aspectRatio === "16:9" || sample.aspectRatio === "21:9" || sample.aspectRatio === "3:2";

  const openDetail = () => setDetail(true);
  const onMediaKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail();
    }
  };

  const showDownloadShare =
    cat === "samples" ||
    cat === "new" ||
    cat === "popular" ||
    cat === "featured" ||
    cat === "inspiration" ||
    cat === "video";

  const showTry = cat === "try-now" && !!sample.tryNowRoute;

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-black/5 bg-white/80",
          isWide && "sm:col-span-2",
        )}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openDetail}
          onKeyDown={onMediaKey}
          className="relative w-full cursor-pointer overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          style={aspectStyle(sample)}
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
              className="pointer-events-none h-full w-full object-cover"
              loading="lazy"
            />
          )}

          <span
            className={cn(
              "pointer-events-none absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] backdrop-blur-md",
              isDark ? "bg-black/40 text-white/90" : "bg-white/70 text-[#3A3E4C]",
            )}
          >
            {categoryLabel(cat)}
          </span>

          <div
            className="absolute bottom-2 right-2 z-10 flex gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CompactIcon onClick={openDetail} label={`About ${sample.title}`} isDark={isDark}>
              <Info className="h-3 w-3" strokeWidth={2.25} />
            </CompactIcon>
            {showDownloadShare ? (
              <>
                <CompactIcon onClick={() => void onDownload()} label="Download" isDark={isDark}>
                  <Download className="h-3 w-3" strokeWidth={2.25} />
                </CompactIcon>
                <CompactIcon onClick={() => void onShare()} label="Share" isDark={isDark}>
                  <Share2 className="h-3 w-3" strokeWidth={2.25} />
                </CompactIcon>
              </>
            ) : null}
          </div>
        </div>

        <div className="px-2.5 py-2">
          <h3 className="text-[12px] font-semibold leading-tight line-clamp-1">{sample.title}</h3>
          {sample.description ? (
            <p className={cn("mt-0.5 line-clamp-1 text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              {sample.description}
            </p>
          ) : null}
          {showTry && sample.tryNowRoute ? (
            <a href={sample.tryNowRoute} className="mt-1.5 inline-flex text-[11px] font-semibold text-primary">
              Try Now →
            </a>
          ) : null}
        </div>
      </article>
      {detail ? (
        <DetailSheet
          sample={sample}
          displayUrl={sample.url}
          onClose={() => setDetail(false)}
          isDark={isDark}
        />
      ) : null}
    </>
  );
}

export function ImagineGallery() {
  const feed = useMemo(
    () => interleaveFeed(getImagineOnlySamples(), getActiveR2VideoSamples()),
    [],
  );
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
        {feed.map((s) =>
          s.homepageCategory === "trend" && s.kind === "image" ? (
            <TrendCard key={s.id} sample={s} isDark={isDark} />
          ) : (
            <SampleCard key={s.id} sample={s} isDark={isDark} />
          ),
        )}
      </div>
    </section>
  );
}
