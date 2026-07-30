import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2 } from "lucide-react";
import track1 from "@/assets/samples/track-1.mp3.asset.json";
import track2 from "@/assets/samples/track-2.mp3.asset.json";
import track3 from "@/assets/samples/track-3.mp3.asset.json";
import styleTransfer from "@/assets/samples/style-transfer.png.asset.json";
import aiUpscaling from "@/assets/samples/ai-upscaling.png.asset.json";
import photoRestoration from "@/assets/samples/photo-restoration.webp.asset.json";

type Track = { id: string; title: string; genre: string; src: string; cover: string };

const TRACKS: Track[] = [
  { id: "t1", title: "Neon Skyline", genre: "Cinematic Electronic", src: track1.url, cover: styleTransfer.url },
  { id: "t2", title: "Golden Hour Drift", genre: "Lo-fi Chill", src: track2.url, cover: aiUpscaling.url },
  { id: "t3", title: "Heritage Strings", genre: "Orchestral", src: track3.url, cover: photoRestoration.url },
];

function fmt(s: number) {
  if (!Number.isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="waveform" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={i} className={`wave-bar ${active ? "" : "wave-bar-paused"}`} />
      ))}
    </div>
  );
}

function TrackCard({
  track,
  index,
  playingId,
  setPlayingId,
}: {
  track: Track;
  index: number;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [ready, setReady] = useState(false);
  const isPlaying = playingId === track.id;

  const fadeTo = (target: number, onDone?: () => void) => {
    const el = audioRef.current;
    if (!el) return;
    if (fadeRef.current) clearInterval(fadeRef.current);
    fadeRef.current = setInterval(() => {
      const diff = target - el.volume;
      if (Math.abs(diff) < 0.06) {
        el.volume = target;
        if (fadeRef.current) clearInterval(fadeRef.current);
        onDone?.();
        return;
      }
      el.volume = Math.min(1, Math.max(0, el.volume + Math.sign(diff) * 0.06));
    }, 30);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.volume = 0;
      void el.play().catch(() => setPlayingId(null));
      fadeTo(volume);
    } else if (!el.paused) {
      fadeTo(0, () => el.pause());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  return (
    <div
      className="reveal-up group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-2xl"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {!ready && <div className="absolute inset-0 animate-pulse bg-secondary" />}
        <img
          src={track.cover}
          alt={`${track.title} cover art`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setReady(true)}
          className={`protected-image h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-background/40" />
        <button
          type="button"
          onClick={() => setPlayingId(isPlaying ? null : track.id)}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-300 group-hover:scale-110">
            {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </span>
        </button>
        <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
          {fmt(duration)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{track.title}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{track.genre}</p>
          </div>
          <Equalizer active={isPlaying} />
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label={`Seek ${track.title}`}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTime(v);
            if (audioRef.current) audioRef.current.currentTime = v;
          }}
          className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
        <div className="mt-1.5 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>{fmt(time)}</span>
          <span>{fmt(duration)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label={`Volume for ${track.title}`}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          />
        </div>

        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setTime(0);
            setPlayingId(null);
          }}
        />
      </div>
    </div>
  );
}

export function MusicSamples() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
          <Music className="h-3.5 w-3.5 text-primary" /> AI Music Samples
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Tracks made in Music Studio</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Full playback with seek, volume, and live equalizer — one track at a time.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t, i) => (
          <TrackCard key={t.id} track={t} index={i} playingId={playingId} setPlayingId={setPlayingId} />
        ))}
      </div>
    </section>
  );
}
