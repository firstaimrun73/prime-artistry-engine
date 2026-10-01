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

  if (staticSrc && staticSrc.startsWith("/")) {
    urlCache.set(voiceId, staticSrc);
    return staticSrc;
  }

  const url = await fetchPreview(voiceId);
  urlCache.set(voiceId, url);
  return url;
}

/**
 * Voiceover-only voice picker — horizontal sticker cards with color + play animation.
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
          urlCache.delete(id);
          setPlayingId(null);
          setLoadingId(null);
        };

        try {
          await audio.play();
          setPlayingId(id);
        } catch {
          urlCache.delete(id);
          const res = await getPreview({ data: { voice: id } });
          if (res?.url) {
            urlCache.set(id, res.url);
            const a2 = new Audio(res.url);
            a2.preload = "auto";
            audioRef.current = a2;
            a2.onended = () => setPlayingId(null);
            await a2.play();
            setPlayingId(id);
          }
        }
      } catch {
        setPlayingId(null);
      } finally {
        setLoadingId(null);
      }
    },
    [getPreview, playingId, stop],
  );

  useEffect(() => {
    const first = VOICES[0];
    if (!first || urlCache.has(first.id)) return;
    if (first.previewSrc.startsWith("/")) urlCache.set(first.id, first.previewSrc);
  }, []);

  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
        🎙 Voice library
      </p>
      <div className="w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2.5">
          {VOICES.map((v) => {
            const active = value === v.id;
            const isPlaying = playingId === v.id;
            const isLoading = loadingId === v.id;
            return (
              <div
                key={v.id}
                className={cn(
                  "relative flex w-[140px] shrink-0 flex-col rounded-2xl border p-3 transition-all",
                  active
                    ? "border-transparent bg-gradient-to-br shadow-md ring-2 ring-orange-500/40 " + v.color
                    : "border-border/70 bg-card hover:border-orange-500/40",
                )}
              >
                {isPlaying && (
                  <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-2xl">
                    <div className="h-full w-full animate-pulse bg-white/80" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onChange(v.id)}
                  className="min-w-0 text-left"
                  aria-pressed={active}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="text-base leading-none" aria-hidden>
                      {v.emoji}
                    </span>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        active ? "text-white" : "text-foreground",
                      )}
                    >
                      {v.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-[10px] leading-snug",
                      active ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {v.desc}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void play(v.id, v.previewSrc);
                  }}
                  disabled={isLoading}
                  className={cn(
                    "mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition-colors",
                    active
                      ? "border-white/30 bg-white/20 text-white hover:bg-white/30"
                      : "border-border bg-muted/50 text-foreground hover:border-orange-500/40",
                    isPlaying && !active && "border-orange-500/50 bg-orange-500/10 text-orange-600",
                  )}
                  aria-label={isPlaying ? `Stop ${v.label} preview` : `Preview ${v.label}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      Preview
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Free preview · same voice used on generate
      </p>
    </section>
  );
}
