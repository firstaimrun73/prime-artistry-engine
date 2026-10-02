import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICES, type VoiceId } from "@/components/music/musicStudioData";

/**
 * AI Voice library — static R2 CDN previews only.
 * Never calls getVoicePreview / xAI / fal for sample playback.
 * One voice at a time; race-safe play token.
 */

export function MusicVoiceLibrary({
  value,
  onChange,
}: {
  value: VoiceId;
  onChange: (id: VoiceId) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);
  const [playingId, setPlayingId] = useState<VoiceId | null>(null);
  const [loadingId, setLoadingId] = useState<VoiceId | null>(null);

  const stop = useCallback(() => {
    playTokenRef.current += 1;
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.oncanplay = null;
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const play = useCallback(
    async (id: VoiceId, staticSrc: string) => {
      if (playingId === id) {
        stop();
        return;
      }

      stop();
      const token = ++playTokenRef.current;
      setLoadingId(id);

      const url = (staticSrc || "").trim();
      if (!url.startsWith("https://") && !url.startsWith("/")) {
        setLoadingId(null);
        return;
      }

      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.src = url;
        audioRef.current = audio;

        audio.onended = () => {
          if (playTokenRef.current === token) {
            setPlayingId(null);
            setLoadingId(null);
          }
        };
        audio.onerror = () => {
          if (playTokenRef.current === token) {
            setPlayingId(null);
            setLoadingId(null);
          }
        };

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            audio.removeEventListener("canplaythrough", onReady);
            audio.removeEventListener("error", onErr);
            resolve();
          };
          const onErr = () => {
            audio.removeEventListener("canplaythrough", onReady);
            audio.removeEventListener("error", onErr);
            reject(new Error("preview load failed"));
          };
          if (audio.readyState >= 3) resolve();
          else {
            audio.addEventListener("canplaythrough", onReady);
            audio.addEventListener("error", onErr);
            window.setTimeout(() => resolve(), 2500);
          }
        });

        if (playTokenRef.current !== token) return;

        await audio.play();
        if (playTokenRef.current !== token) {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          return;
        }
        setPlayingId(id);
        setLoadingId(null);
      } catch {
        if (playTokenRef.current === token) {
          setLoadingId(null);
          setPlayingId(null);
        }
      }
    },
    [playingId, stop],
  );

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">AI Voice</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VOICES.map((v) => {
          const active = value === v.id;
          const playing = playingId === v.id;
          const loading = loadingId === v.id;
          return (
            <div
              key={v.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 transition",
                active
                  ? "border-transparent bg-gradient-to-r from-orange-500/15 to-purple-600/15 ring-1 ring-orange-500/40"
                  : "border-border/60 bg-card hover:border-orange-500/30",
              )}
            >
              <button
                type="button"
                onClick={() => onChange(v.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm text-white shadow-sm",
                    v.color,
                  )}
                >
                  {v.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{v.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{v.desc}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label={playing ? `Stop ${v.label} preview` : `Play ${v.label} preview`}
                disabled={loading}
                onClick={() => void play(v.id, v.previewSrc)}
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
                  playing
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-600"
                    : "border-border/60 bg-background text-muted-foreground hover:border-orange-500/40 hover:text-foreground",
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
