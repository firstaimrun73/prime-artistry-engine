/**
 * VIDEO gallery — Motion2AI Creation.
 * Large native-aspect cards. Muted hover/touch preview.
 * Click → /sample/$id. No Download/Share on homepage.
 */
import { useMemo, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { getActiveR2VideoSamples, HOMEPAGE_WATCH_DEMO, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function aspectStyle(s: R2Sample): React.CSSProperties {
  if (s.width && s.height) return { aspectRatio: `${s.width} / ${s.height}` };
  const map: Record<string, string> = {
    "16:9": "16 / 9",
    "9:16": "9 / 16",
    "1:1": "1 / 1",
    "4:5": "4 / 5",
    "3:4": "3 / 4",
  };
  return { aspectRatio: map[s.aspectRatio] ?? "16 / 9" };
}

function VideoCard({
  sample,
  isDark,
  onActivate,
  onDeactivate,
}: {
  sample: R2Sample;
  isDark: boolean;
  onActivate: (el: HTMLVideoElement) => void;
  onDeactivate: (el: HTMLVideoElement) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const isPortrait = sample.aspectRatio === "9:16" || sample.aspectRatio === "4:5";

  const startPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    onActivate(v);
    v.muted = true;
    void v.play().catch(() => {});
  }, [onActivate]);

  const stopPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    onDeactivate(v);
  }, [onDeactivate]);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border",
        isDark ? "border-white/10 bg-white/[0.02]" : "border-black/5 bg-white/80",
        isPortrait ? "sm:col-span-1" : "sm:col-span-2",
      )}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        style={aspectStyle(sample)}
        aria-label={`Open ${sample.title}`}
        onMouseEnter={startPreview}
        onMouseLeave={stopPreview}
        onTouchStart={startPreview}
        onFocus={startPreview}
        onBlur={stopPreview}
      >
        <video
          ref={ref}
          src={sample.url}
          muted
          playsInline
          loop
          preload="metadata"
          className="pointer-events-none h-full w-full object-contain"
        />
        <span
          className={cn(
            "pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border backdrop-blur-md",
            isDark
              ? "border-white/15 bg-black/35 text-white/90"
              : "border-white/50 bg-white/60 text-[#1A1C24]",
          )}
          aria-hidden
        >
          <Info className="h-3 w-3" strokeWidth={2.25} />
        </span>
      </Link>
      <div className="px-2 py-1.5">
        <h3 className="text-[11px] font-medium leading-tight line-clamp-1">{sample.title}</h3>
      </div>
    </article>
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
  const activeRef = useRef<HTMLVideoElement | null>(null);

  const onActivate = useCallback((el: HTMLVideoElement) => {
    if (activeRef.current && activeRef.current !== el) {
      activeRef.current.pause();
    }
    activeRef.current = el;
  }, []);

  const onDeactivate = useCallback((el: HTMLVideoElement) => {
    if (activeRef.current === el) activeRef.current = null;
  }, []);

  if (samples.length === 0) return null;

  return (
    <section className="space-y-3" data-creation-section="video">
      <h3 className="text-[13px] font-bold tracking-tight">Video</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((s) => (
          <VideoCard
            key={s.id}
            sample={s}
            isDark={isDark}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
          />
        ))}
      </div>
    </section>
  );
}
