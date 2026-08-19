import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

function artworkGradient(mode: string, genre?: string | null, mood?: string | null) {
  const key = `${mode}-${genre || ""}-${mood || ""}`.toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i) * 17) % 360;
  const h2 = (h + 40) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${h2} 65% 35%))`;
}

export function MusicResultCard({
  audioUrl,
  trackTitle,
  mode,
  genre,
  mood,
  charged,
  model,
  videoUrl,
  onAgain,
}: {
  audioUrl: string;
  trackTitle: string;
  mode: string;
  genre?: string | null;
  mood?: string | null;
  charged?: number | null;
  model?: string | null;
  videoUrl?: string | null;
  onAgain: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [audioUrl]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number) => {
    if (!s || !Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(e) => {
          setProgress(e.currentTarget.currentTime);
          setDuration(e.currentTarget.duration || 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        className="hidden"
      />

      <div
        className="relative flex aspect-[2/1] items-end p-4 sm:aspect-[2.4/1]"
        style={{ background: artworkGradient(mode, genre, mood) }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="relative z-10 min-w-0">
          <p className="truncate text-base font-bold text-white drop-shadow">{trackTitle}</p>
          <p className="mt-0.5 text-xs text-white/85 capitalize">
            {mode}
            {genre ? ` · ${genre}` : ""}
            {mood ? ` · ${mood}` : ""}
            {charged != null ? ` · ${charged} credits` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md",
              "bg-gradient-to-r from-orange-500 to-purple-600 hover:opacity-95",
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={(e) => {
                const v = Number(e.target.value);
                setProgress(v);
                if (audioRef.current) audioRef.current.currentTime = v;
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-orange-500"
            />
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        </div>

        {model && (
          <p className="truncate text-[10px] text-muted-foreground">{model}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={audioUrl} download target="_blank" rel="noreferrer">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </a>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onAgain}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Generate again
          </Button>
          {videoUrl && (
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link to="/studio/video">Apply to Video</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
