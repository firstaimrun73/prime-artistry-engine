import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICES, type VoiceId } from "@/components/music/musicStudioData";
import { getVoicePreview } from "@/lib/music.functions";

/** Module-level URL cache so previews never re-fetch across remounts in the same session. */
const urlCache = new Map<VoiceId, string>();

async function resolvePreviewUrl(
  voiceId: VoiceId,
  staticSrc: string,
  fetchPreview: (id: VoiceId) => Promise<string>,
): Promise<string> {
  const cached = urlCache.get(voiceId);
  if (cached) return cached;

  // Prefer static public assets when present (instant).
  try {
    const head = await fetch(staticSrc, { method: "HEAD", cache: "force-cache" });
    if (head.ok) {
      urlCache.set(voiceId, staticSrc);
      return staticSrc;
    }
  } catch {
    /* fall through to server TTS cache */
  }

  const url = await fetchPreview(voiceId);
  urlCache.set(voiceId, url);
  return url;
}

/**
 * Voiceover-only voice picker.
 * - Card click → select voice (does not touch Music/SFX state).
 * - Speaker → play real xAI voice sample (cached); never charges credits.
 */
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

  const play = useCallback(
    async (id: VoiceId, staticSrc: string) => {
      // Toggle off if same voice is playing
      if (playingId === id) {
        stop();
        return;
      }

      stop();
      setLoadingId(id);

      try {
        const url = await resolvePreviewUrl(id, staticSrc, async (voiceId) => {
          const res = await getPreview({ data: { voice: voiceId } });
          if (!res?.url) throw new Error("No preview URL");
          return res.url;
        });

        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;

        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          setPlayingId(null);
          setLoadingId(null);
          urlCache.delete(id);
        };

        await audio.play();
        setPlayingId(id);
      } catch {
        setPlayingId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [getPreview, playingId, stop],
  );

  // Warm first voice in background for snappier first click
  useEffect(() => {
    const first = VOICES[0];
    if (!first || urlCache.has(first.id)) return;
    void resolvePreviewUrl(first.id, first.previewSrc, async (voiceId) => {
      const res = await getPreview({ data: { voice: voiceId } });
      if (!res?.url) throw new Error("No preview URL");
      return res.url;
    }).catch(() => undefined);
  }, [getPreview]);

  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">Voice library</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VOICES.map((v) => {
          const active = value === v.id;
          const isPlaying = playingId === v.id;
          const isLoading = loadingId === v.id;
          return (
            <div
              key={v.id}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition-colors",
                active
                  ? "border-transparent bg-gradient-to-r from-orange-500/15 to-purple-600/15 ring-2 ring-orange-500/50"
                  : "border-border/70 bg-card",
              )}
            >
              <button
                type="button"
                onClick={() => onChange(v.id)}
                className="min-w-0 flex-1 text-left"
                aria-pressed={active}
              >
                <p className="text-sm font-semibold">{v.label}</p>
                <p className="text-[11px] text-muted-foreground">{v.desc}</p>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void play(v.id, v.previewSrc);
                }}
                disabled={isLoading}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors",
                  isPlaying && "border-orange-500/60 bg-orange-500/15 text-orange-600",
                )}
                aria-label={isPlaying ? `Stop ${v.label} preview` : `Preview ${v.label}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Preview uses the real voice sample. Generate uses the same selected voice — no credits for preview.
      </p>
    </section>
  );
}
