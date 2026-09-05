/**
 * VIDEO gallery — Motion2AI Creation.
 * Media-driven size (no forced wrapper letterbox). One sound toggle top-right.
 * Real title under card. Desktop max-w caps — more columns, not bigger cards.
 */
import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import { getActiveR2VideoSamples, type R2Sample } from "@/lib/r2-catalog";
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
  onActivate,
  onDeactivate,
}: {
  sample: R2Sample;
  onActivate: (el: HTMLVideoElement) => void;
  onDeactivate: (el: HTMLVideoElement) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const catalogPortrait = isPortraitRatio(sample.aspectRatio);
  const [ratio, setRatio] = useState<string | null>(() =>
    sample.width && sample.height
      ? `${sample.width} / ${sample.height}`
      : sample.aspectRatio
        ? sample.aspectRatio.replace(":", " / ")
        : null,
  );
  const [portrait, setPortrait] = useState(catalogPortrait);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setRatio(`${v.videoWidth} / ${v.videoHeight}`);
        setPortrait(v.videoHeight > v.videoWidth);
      }
    };
    const onErr = () => setFailed(true);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("error", onErr);
    if (v.readyState >= 1) onMeta();
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onErr);
    };
  }, []);

  const startPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    onActivate(v);
    v.muted = muted;
    void v.play().catch(() => {});
  }, [onActivate, muted]);

  const stopPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    onDeactivate(v);
  }, [onDeactivate]);

  const toggleMute = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const v = ref.current;
      if (!v) return;
      const next = !v.muted;
      v.muted = next;
      setMuted(next);
      if (!next) void v.play().catch(() => {});
    },
    [],
  );

  if (failed) return null;

  return (
    <article
      className={cn(
        "group w-full overflow-hidden rounded-2xl border border-border/50 bg-transparent",
        "transition-[transform,opacity] duration-200 ease-out",
        "hover:scale-[1.01] active:scale-[0.98] active:opacity-90",
        portrait ? "max-w-[280px]" : "max-w-[400px]",
      )}
    >
      <div className="relative w-full" style={ratio ? { aspectRatio: ratio } : undefined}>
        <Link
          to="/sample/$id"
          params={{ id: sample.id }}
          className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
            muted={muted}
            playsInline
            loop
            preload="metadata"
            // object-cover fills the ratio box from real metadata — no black bars
            className="pointer-events-none h-full w-full object-cover"
          />
        </Link>
        {/* B2: single glassy sound control top-right */}
        <button
          type="button"
          onClick={toggleMute}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full",
            "border border-white/25 bg-black/45 text-white backdrop-blur-md",
            "transition-transform duration-150 active:scale-90",
          )}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* A4: real title under card */}
      {sample.title ? (
        <p className="truncate px-1.5 pt-1.5 text-[11px] font-medium leading-tight text-foreground/80">
          {sample.title}
        </p>
      ) : null}
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
    return unique.sort((a, b) => a.sortOrder - b.sortOrder);
  }, []);
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
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {samples.map((s) => (
          <VideoCard
            key={s.id}
            sample={s}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
          />
        ))}
      </div>
    </section>
  );
}
