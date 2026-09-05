/**
 * VIDEO gallery — Motion2AI Creation.
 * Native video size drives card height (no aspect-ratio wrapper, no object-cover).
 * Single shared unmuted source — unmuting one mutes every other video immediately.
 * Real title under card. items-start grid so no white stretch under shorter cards.
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
    const unique: R2Sample[] = [];
    for (const s of all) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      unique.push(s);
    }
    return unique.sort((a, b) => a.sortOrder - b.sortOrder);
  }, []);

  const activeRef = useRef<HTMLVideoElement | null>(null);
  const videoEls = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  const registerEl = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) videoEls.current.set(id, el);
    else videoEls.current.delete(id);
  }, []);

  const onActivate = useCallback((el: HTMLVideoElement) => {
    if (activeRef.current && activeRef.current !== el && activeRef.current.muted) {
      activeRef.current.pause();
    }
    activeRef.current = el;
  }, []);

  const onDeactivate = useCallback((el: HTMLVideoElement) => {
    if (activeRef.current === el) activeRef.current = null;
  }, []);

  const onRequestUnmute = useCallback((id: string, el: HTMLVideoElement) => {
    videoEls.current.forEach((other, otherId) => {
      if (otherId !== id) other.muted = true;
    });
    el.muted = false;
    void el.play().catch(() => {});
    videoEls.current.set(id, el);
    setUnmutedId(id);
  }, []);

  const onMuteAll = useCallback(() => {
    videoEls.current.forEach((v) => {
      v.muted = true;
    });
    setUnmutedId(null);
  }, []);

  if (samples.length === 0) return null;

  return (
    <section className="space-y-4" data-creation-section="video">
      <h3 className="text-[14px] font-bold tracking-tight">Video</h3>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-start justify-items-center gap-3 sm:gap-5 lg:grid-cols-3">
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
