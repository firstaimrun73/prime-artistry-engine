/**
 * VIDEO gallery — Motion2AI Creation.
 * Each video owns its native-ratio card (16:9 wide, 9:16 portrait).
 * No black letterbox, no crop, no forced uniform height.
 * Muted one-at-a-time preview. Click → /sample/$id.
 * Tiny SAMPLE label only — no caption, no Info overlay.
 */
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { getActiveR2VideoSamples, HOMEPAGE_WATCH_DEMO, type R2Sample } from "@/lib/r2-catalog";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function isPortraitRatio(aspectRatio: string): boolean {
  return (
    aspectRatio === "9:16" ||
    aspectRatio === "4:5" ||
    aspectRatio === "3:4" ||
    aspectRatio === "2:3"
  );
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
  const catalogPortrait = isPortraitRatio(sample.aspectRatio);
  const [ratio, setRatio] = useState<string>(() => {
    if (sample.width && sample.height) return `${sample.width} / ${sample.height}`;
    return sample.aspectRatio.replace(":", " / ");
  });
  const [portrait, setPortrait] = useState(catalogPortrait);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setRatio(`${v.videoWidth} / ${v.videoHeight}`);
        setPortrait(v.videoHeight > v.videoWidth);
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    if (v.readyState >= 1) onMeta();
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

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
        "group overflow-hidden rounded-3xl",
        portrait ? "sm:col-span-1" : "col-span-1 sm:col-span-2",
      )}
    >
      <Link
        to="/sample/$id"
        params={{ id: sample.id }}
        className="relative block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        style={{ aspectRatio: ratio }}
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
      </Link>
      <p
        className={cn(
          "px-1.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
          isDark ? "text-white/45" : "text-black/40",
        )}
      >
        Sample
      </p>
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
    <section className="space-y-4" data-creation-section="video">
      <h3 className="text-[14px] font-bold tracking-tight">Video</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
