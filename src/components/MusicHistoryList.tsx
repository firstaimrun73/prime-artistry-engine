// Music tab for the history page: lists saved tracks from music_history with
// inline playback (spinning vinyl), download and delete.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VinylDisc } from "@/components/VinylDisc";
import { toast } from "sonner";
import { Download, Trash2, Play, Pause, Music } from "lucide-react";

type Track = {
  id: string;
  track_title: string;
  prompt: string | null;
  genre: string | null;
  mood: string | null;
  bpm: number | null;
  duration: number | null;
  audio_url: string;
  created_at: string;
};

export function MusicHistoryList({ userId }: { userId: string | undefined }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    void supabase
      .from("music_history")
      .select("id, track_title, prompt, genre, mood, bpm, duration, audio_url, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[music-history]", error.message);
        setTracks((data ?? []) as Track[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = (t: Track) => {
    const el = audioRef.current;
    if (!el) return;
    if (playingId === t.id) {
      el.pause();
      setPlayingId(null);
      return;
    }
    el.src = t.audio_url;
    void el.play().catch(() => toast.error("Could not play this track."));
    setPlayingId(t.id);
  };

  const download = async (t: Track) => {
    try {
      const res = await fetch(t.audio_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${t.track_title.replace(/\s+/g, "-").toLowerCase()}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(t.audio_url, "_blank");
    }
  };

  const remove = async (t: Track) => {
    const { error } = await supabase.from("music_history").delete().eq("id", t.id);
    if (error) {
      toast.error("Could not delete this track.");
      return;
    }
    if (playingId === t.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    setTracks((prev) => prev.filter((x) => x.id !== t.id));
    toast.success("Track deleted.");
  };

  if (loading) return <p className="mt-8 text-sm text-muted-foreground">Loading tracks…</p>;

  if (tracks.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
        <Music className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No tracks yet. Create one in the Music Studio.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      {tracks.map((t) => (
        <div
          key={t.id}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <VinylDisc playing={playingId === t.id} size={64} />
            <button
              onClick={() => toggle(t)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label={playingId === t.id ? "Pause" : "Play"}
            >
              {playingId === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t.track_title}</p>
            {t.prompt && <p className="truncate text-xs text-muted-foreground">{t.prompt}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              {t.genre && (
                <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">{t.genre}</span>
              )}
              {t.mood && (
                <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">{t.mood}</span>
              )}
              {t.bpm && <span className="rounded-full bg-secondary px-2 py-0.5">{t.bpm} BPM</span>}
              {t.duration && (
                <span className="rounded-full bg-secondary px-2 py-0.5">{t.duration}s</span>
              )}
              <span className="text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => download(t)}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(t)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
