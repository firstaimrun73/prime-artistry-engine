/**
 * Music section — instrumental performance video samples from R2 catalog.
 * Media-first cards; native aspect; inline play.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { getMusicVideoSamples, type R2Sample } from "@/lib/r2-catalog";
import { cn } from "@/lib/utils";
import {
  homeVideoRegister,
  homeVideoRequestPlay,
  homeVideoPause,
  homeVideoGetActiveId,
  homeVideoSubscribe,
} from "@/lib/home-video-controller";

function MusicVideoCard({ sample }: { sample: R2Sample }) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [unmuted, setUnmuted] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => homeVideoSubscribe(() => tick((n) => n + 1)), []);
  useEffect(() => {
    homeVideoRegister(sample.id, videoRef.current);
    return () => homeVideoRegister(sample.id, null);
  }, [sample.id]);

  useEffect(() => {
    const el = videoRef.current;
    const active = homeVideoGetActiveId() === sample.id;
    setPlaying(!!(active && el && !el.paused));
    if (!active) setUnmuted(false);
  });

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      if (homeVideoGetActiveId() === sample.id && !el.paused) {
        homeVideoPause(sample.id);
        setPlaying(false);
        setUnmuted(false);
        el.muted = true;
      } else {
        homeVideoRequestPlay(sample.id, el, { unmuted: false });
        setPlaying(true);
      }
    },
    [sample.id],
  );

  const toggleSound = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = videoRef.current;
      if (!el) return;
      if (!playing) {
        homeVideoRequestPlay(sample.id, el, { unmuted: true });
        setPlaying(true);
        setUnmuted(true);
        return;
      }
      if (unmuted) {
        el.muted = true;
        setUnmuted(false);
      } else {
        el.muted = false;
        setUnmuted(true);
        homeVideoRequestPlay(sample.id, el, { unmuted: true });
      }
    },
    [sample.id, playing, unmuted],
  );

  if (failed) return null;

  return (
    <article className="group relative w-full self-start overflow-hidden rounded-2xl bg-muted/20 ring-1 ring-border/30">
      <button type="button" onClick={toggle} className="relative block w-full text-left" aria-label={playing ? "Pause" : "Play"}>
        <video
          ref={videoRef}
          src={sample.url}
          muted
          playsInline
          loop
          preload="metadata"
          className="pointer-events-none block h-auto w-full"
          onError={() => setFailed(true)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        <span
          className={cn(
            "absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md",
            playing && "border-primary/50 bg-primary/85",
          )}
        >
          {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        </span>
        {playing && (
          <span
            role="button"
            tabIndex={0}
            onClick={toggleSound}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md"
            aria-label={unmuted ? "Mute" : "Unmute"}
          >
            {unmuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </span>
        )}
        <div className={cn("absolute inset-x-0 bottom-0 px-2.5 pb-2.5", "pl-12")}>
          <p className="line-clamp-1 text-[12px] font-semibold text-white drop-shadow-sm">{sample.title}</p>
          {sample.durationLabel ? (
            <p className="text-[10px] text-white/70">
              {sample.durationLabel}
              {sample.fileSizeLabel ? ` · ${sample.fileSizeLabel}` : ""}
            </p>
          ) : null}
        </div>
      </button>
    </article>
  );
}

export function MusicStudioGallery() {
  const samples = useMemo(() => getMusicVideoSamples(), []);
  if (samples.length === 0) return null;

  return (
    <section className="mt-10 space-y-3" data-creation-section="music">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold tracking-tight sm:text-[18px]">
          <Music className="h-4 w-4" />
          Music
        </h2>
        <p className="text-[11px] text-muted-foreground">Instrumental samples</p>
      </div>
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 items-start gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {samples.map((s) => (
          <MusicVideoCard key={s.id} sample={s} />
        ))}
      </div>
    </section>
  );
}
