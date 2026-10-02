import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICES, type VoiceId } from "@/components/music/musicStudioData";
import { getVoicePreview } from "@/lib/music.functions";

/** Session cache — never re-fetch the same voice. */
const urlCache = new Map<VoiceId, string>();
/** In-flight fetch promises so double-taps share one request. */
const inflight = new Map<VoiceId, Promise<string>>();

async function resolvePreviewUrl(
  voiceId: VoiceId,
  staticSrc: string,
  fetchPreview: (id: VoiceId) => Promise<string>,
): Promise<string> {
  const cached = urlCache.get(voiceId);
  if (cached) return cached;

  const pending = inflight.get(voiceId);
  if (pending) return pending;

  const work = (async () => {
    // Prefer permanent CDN / public static previews — never generate for samples.
    if (staticSrc && (staticSrc.startsWith("/") || staticSrc.startsWith("https://"))) {
      urlCache.set(voiceId, staticSrc);
      return staticSrc;
    }
    const url = await fetchPreview(voiceId);
    urlCache.set(voiceId, url);
    return url;
  })();

  inflight.set(voiceId, work);
  try {
    return await work;
  } finally {
    inflight.delete(voiceId);
  }
}

export function MusicVoiceLibrary({
  value,
  onChange,
}: {
  value: VoiceId;
  onChange: (id: VoiceId) => void;
}) {
  const getPreview = useServerFn(getVoicePreview);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<VoiceId | null>(null);
  const [loadingId, setLoadingId] = useState<VoiceId | null>(null);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const first = VOICES[0];
    if (!first || urlCache.has(first.id)) return;
    if (first.previewSrc.startsWith("/") || first.previewSrc.startsWith("https://")) {
      urlCache.set(first.id, first.previewSrc);
    }
  }, []);

  const play = useCallback(
    async (id: VoiceId, staticSrc: string) => {
      if (playingId === id) {
        stop();
        return;
      }

      stop();
      setLoadingId(id);

      try {
        const url = await resolvePreviewUrl(id, staticSrc, async (voiceId) => {
          // Fallback only if static CDN missing — still returns R2 static URL from server.
          const res = await getPreview({ data: { voice: voiceId } });
          if (!res?.url) throw new Error("No preview URL");
          return res.url;
        });

        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        audioRef.current = audio;

        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          setPlayingId(null);
          setLoadingId(null);
        };

        const tryPlay = async () => {
          try {
            await audio.play();
            setPlayingId(id);
            setLoadingId(null);
          } catch {
            setLoadingId(null);
            setPlayingId(null);
          }
        };

        if (audio.readyState >= 2) {
          void tryPlay();
        } else {
          audio.oncanplay = () => {
            void tryPlay();
          };
          // Safety timeout so spinner does not stick if CDN is slow
          window.setTimeout(() => {
            if (loadingId === id) setLoadingId(null);
          }, 8000);
        }
      } catch {
        setLoadingId(null);
        setPlayingId(null);
      }
    },
    [getPreview, playingId, stop, loadingId],
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
