/**
 * VIDEO gallery — Motion2AI Creation samples.
 * Media-first cards; native aspect; hover/touch preview; one unmuted video at a time.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import { getActiveR2VideoSamples, type R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";

function isPortraitRatio(aspectRatio: string): boolean {
  return (
    aspectRatio === "9:16" ||
    aspectRatio === "3:4" ||
    aspectRatio === "2:3" ||
    aspectRatio === "4:5"
  );
}

function VideoCard({
  sample,
  unmutedId,
  onRequestUnmute,
  onMuteAll,
  onActivate,
  onDeactivate,
  registerEl,
}: {
  sample: R2Sample;
  unmutedId: string | null;
  onRequestUnmute: (id: string, el: HTMLVideoElement) => void;
  onMuteAll: () => void;
  onActivate: (el: HTMLVideoElement) => void;
  onDeactivate: (el: HTMLVideoElement) => void;
  registerEl: (id: string, el: HTMLVideoElement | null) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const catalogPortrait = isPortraitRatio(sample.aspectRatio);
  const [portrait, setPortrait] = useState(catalogPortrait);
  const [failed, setFailed] = useState(false);
  const isUnmuted = unmutedId === sample.id;

  useEffect(() => {
    const v = ref.current;
    registerEl(sample.id, v);
    return () => registerEl(sample.id, null);
  }, [sample.id, registerEl]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
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

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !isUnmuted;
    if (isUnmuted) void v.play().catch(() => {});
  }, [isUnmuted]);

  const startPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    onActivate(v);
    v.muted = !isUnmuted;
    void v.play().catch(() => {});
  }, [onActivate, isUnmuted]);

  const stopPreview = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (!isUnmuted) v.pause();
    onDeactivate(v);
  }, [onDeactivate, isUnmuted]);

  const toggleMute = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const v = ref.current;
      if (!v) return;
      if (isUnmuted) {
        onMuteAll();
      } else {
        onRequestUnmute(sample.id, v);
      }
    },
    [isUnmuted, onMuteAll, onRequestUnmute, sample.id],
  );

  if (failed) return null;

  return (
    <article
      className={cn(
        "group w-full self-start overflow-hidden rounded-2xl border border-border/50 bg-transparent",
        "transition-[transform,opacity] duration-200 ease-out",
        "hover:scale-[1.01] active:scale-[0.98] active:opacity-90",
        portrait ? "max-w-[280px]" : "max-w-[400px]",
      )}
    >
      <div className="relative w-full">
        <Link
          to="/sample/$id"
          params={{ id: sample.id }}
          className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
            muted={!isUnmuted}
            playsInline
            loop
            preload="metadata"
            className="pointer-events-none block h-auto w-full"
          />
        </Link>
        <button
          type="button"
          onClick={toggleMute}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full",
            "border border-white/25 bg-black/45 text-white backdrop-blur-md",
            "transition-transform duration-150 active:scale-90",
          )}
          aria-label={isUnmuted ? "Mute" : "Unmute"}
        >
          {isUnmuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>
        {sample.qualityTier ? (
          <span
            className={cn(
              "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold shadow-sm backdrop-blur-sm",
              sample.qualityTier === "Premium" && "bg-amber-500/95 text-black",
              sample.qualityTier === "Ultra AI" && "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 text-white",
              sample.qualityTier === "Standard" && "bg-white/90 text-zinc-800",
            )}
          >
            {sample.qualityTier}
          </span>
        ) : null}
      </div>
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
    return all.filter((s) => {
      if (s.homepageCategory === "music") return false;
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }, []);

  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  const els = useRef(new Map<string, HTMLVideoElement>());

  const registerEl = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  }, []);

  const onMuteAll = useCallback(() => {
    setUnmutedId(null);
    els.current.forEach((v) => {
      v.muted = true;
    });
  }, []);

  const onRequestUnmute = useCallback((id: string, el: HTMLVideoElement) => {
    setUnmutedId(id);
    els.current.forEach((v, key) => {
      v.muted = key !== id;
    });
    el.muted = false;
    void el.play().catch(() => {});
  }, []);

  const onActivate = useCallback((_el: HTMLVideoElement) => {}, []);
  const onDeactivate = useCallback((_el: HTMLVideoElement) => {}, []);

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-creation-section="video">
      <h3 className="text-[14px] font-bold tracking-tight">Video</h3>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-start justify-items-center gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {samples.map((s) => (
          <VideoCard
            key={s.id}
            sample={s}
            unmutedId={unmutedId}
            onRequestUnmute={onRequestUnmute}
            onMuteAll={onMuteAll}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
            registerEl={registerEl}
          />
        ))}
      </div>
    </section>
  );
}
