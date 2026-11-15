import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { MusicAccessGate } from "@/components/MusicAccessGate";
import { MusicModeCards } from "@/components/music/MusicModeCards";
import { MusicResultCard } from "@/components/music/MusicResultCard";
import { type VoiceId } from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  generateMusic,
  getMusicCapabilities,
  MUSIC_GENRES,
  MUSIC_MOODS,
  type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { Sparkles, Loader2, Coins, Music2 } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";
import { readAdminTestPlan } from "@/lib/studio/image/admin-test-plan";
import type { PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 3,
  maxHeight = 220,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(next, minRows * 24)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={cn(
        "min-h-[72px] w-full resize-none rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm shadow-sm",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "touch-manipulation",
        className,
      )}
    />
  );
}

/** Safe search for embed in /music or /motion2ai */
function useMusicSearch(): { mode?: string; videoUrl?: string } {
  const search = useRouterState({ select: (s) => s.location.search }) as Record<
    string,
    unknown
  >;
  return {
    mode: typeof search?.mode === "string" ? search.mode : undefined,
    videoUrl: typeof search?.videoUrl === "string" ? search.videoUrl : undefined,
  };
}

export function MusicStudioPage() {
  return (
    <MusicAccessGate>
      <MusicStudio />
    </MusicAccessGate>
  );
}

function MusicStudio() {
  const { profile, user, refreshProfile } = useAuth();
  const search = useMusicSearch();
  const generate = useServerFn(generateMusic);
  const getCaps = useServerFn(getMusicCapabilities);

  const initialMode: MusicMode =
    search.mode === "video-music" || search.mode === "video_music"
      ? "video_music"
      : ((search.mode as MusicMode) || "song");

  const [mode, setMode] = useState<MusicMode>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [lyrics] = useState("");
  const [genre] = useState("");
  const [mood] = useState("");
  const [instrument] = useState("");
  const [duration] = useState(30);
  const [voice] = useState<VoiceId>("eve");
  const [qualityTier, setQualityTier] = useState<"standard" | "premium">(
    "standard",
  );
  const [imageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(search.videoUrl ?? null);
  const [uploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [charged, setCharged] = useState<number | null>(null);
  const isAdmin = isAdminEmail(profile?.email);
  const [adminTestPlan] = useState<PlanId | null>(() =>
    typeof window !== "undefined" ? readAdminTestPlan() : null,
  );
  const [musicCaps, setMusicCaps] = useState<{
    qualityTiers: ("standard" | "premium")[];
    promptMaxChars: number;
    modes: MusicMode[];
    maxTrackDurationSeconds: number;
  } | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultOutputType, setResultOutputType] = useState<
    "audio" | "video" | null
  >(null);
  const [resultMode, setResultMode] = useState<MusicMode | null>(null);
  const [videoAudioMode] = useState<"replace" | "mix">("replace");

  useEffect(() => {
    if (search.videoUrl) {
      setVideoUrl(search.videoUrl);
      setMode("video_music");
    }
  }, [search.videoUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getCaps({
          data: {
            adminTestPlan: isAdmin ? (adminTestPlan ?? undefined) : undefined,
          },
        });
        if (cancelled || !res) return;
        setMusicCaps({
          qualityTiers:
            (res.qualityTiers as ("standard" | "premium")[]) ?? ["standard"],
          promptMaxChars:
            typeof res.promptMaxChars === "number" ? res.promptMaxChars : 0,
          modes: (res.modes as MusicMode[]) ?? ["song", "instrumental"],
          maxTrackDurationSeconds:
            typeof res.maxTrackDurationSeconds === "number"
              ? res.maxTrackDurationSeconds
              : 30,
        });
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getCaps, adminTestPlan, isAdmin]);

  const premiumAllowed =
    !musicCaps || musicCaps.qualityTiers.includes("premium");
  const promptMax =
    musicCaps?.promptMaxChars && musicCaps.promptMaxChars > 0
      ? musicCaps.promptMaxChars
      : null;

  useEffect(() => {
    if (!premiumAllowed && qualityTier === "premium") setQualityTier("standard");
  }, [premiumAllowed, qualityTier]);

  async function onGenerate() {
    if (loading || uploading) return;
    if (mode === "voiceover" && !prompt.trim())
      return toast.error("Enter a script.");
    if (
      (mode === "song" || mode === "instrumental" || mode === "bgm") &&
      !prompt.trim() &&
      !imageUrl &&
      !videoUrl
    )
      return toast.error("Add a description, image, or video.");
    if (mode === "video_music" && !videoUrl)
      return toast.error("Upload or attach a video for Video Music.");

    setLoading(true);
    setAudioUrl(null);
    setResultVideoUrl(null);
    setResultOutputType(null);
    setResultMode(null);
    setTrackTitle(null);
    setResultModel(null);
    setCharged(null);
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    startGeneration("music", "/music");
    try {
      const res = await generate({
        data: {
          mode,
          prompt: prompt.trim(),
          lyrics: mode === "song" ? lyrics.trim() || undefined : undefined,
          genre:
            genre && (MUSIC_GENRES as readonly string[]).includes(genre)
              ? (genre as (typeof MUSIC_GENRES)[number])
              : undefined,
          mood:
            mood && (MUSIC_MOODS as readonly string[]).includes(mood)
              ? (mood as (typeof MUSIC_MOODS)[number])
              : undefined,
          instrument: instrument || undefined,
          durationSeconds: duration,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          voice: mode === "voiceover" ? voice : undefined,
          instrumental: mode === "instrumental" || mode === "bgm",
          qualityTier:
            mode === "song" || mode === "instrumental" || mode === "bgm"
              ? qualityTier
              : "standard",
          videoAudioMode: mode === "video_music" ? videoAudioMode : undefined,
          idempotencyKey,
          adminTestPlan: isAdmin ? (adminTestPlan ?? undefined) : undefined,
        },
      });
      if (!res?.outputUrl) throw new Error("No media returned.");
      setAudioUrl(res.outputUrl);
      setResultVideoUrl(res.videoUrl ?? null);
      setResultOutputType((res.outputType as "audio" | "video") ?? "audio");
      setResultMode((res.mode as MusicMode) ?? mode);
      setTrackTitle(res.trackTitle ?? "Generated track");
      setResultModel(res.model ?? null);
      setCharged(res.creditsCharged ?? null);
      void refreshProfile?.();
      toast.success(
        res.creditsCharged
          ? `Ready · ${res.creditsCharged} credits`
          : "Track ready",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
      endGeneration();
    }
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col overflow-x-clip bg-background">
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8">
        <header className="mb-5">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-sm sm:h-10 sm:w-10">
                <Music2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  Music{" "}
                  <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                    Studio
                  </span>
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Songs · Instrumentals · BGM · AI Voice · Sound · Video Music
                </p>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-sm shadow-sm">
              <Coins className="h-3.5 w-3.5 text-orange-500" />
              <span className="tabular-nums font-semibold">
                {profile?.credits != null
                  ? profile.credits.toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
          <div className="mt-3 h-px w-full bg-gradient-to-r from-orange-500/40 via-rose-500/30 to-purple-600/40" />
        </header>

        <section className="mb-5">
          <MusicModeCards
            mode={mode}
            onChange={setMode}
            allowedModes={musicCaps?.modes ?? null}
          />
        </section>

        <section className="space-y-4">
          <div>
            <Label>{mode === "voiceover" ? "Script" : "Prompt"}</Label>
            <AutoGrowTextarea
              value={prompt}
              onChange={setPrompt}
              placeholder="Describe the track, mood, or scene…"
              maxHeight={220}
            />
            {promptMax != null && (
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {prompt.length}/{promptMax}
              </p>
            )}
          </div>

          {(mode === "song" || mode === "instrumental" || mode === "bgm") && (
            <div className="flex gap-2 rounded-2xl border border-border/60 bg-card/50 p-1">
              <button
                type="button"
                onClick={() => setQualityTier("standard")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-semibold transition",
                  qualityTier === "standard"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Standard
              </button>
              <button
                type="button"
                disabled={!premiumAllowed}
                onClick={() => premiumAllowed && setQualityTier("premium")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-semibold transition",
                  qualityTier === "premium"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                    : "text-muted-foreground",
                  !premiumAllowed && "opacity-50",
                )}
              >
                Premium{!premiumAllowed ? " · upgrade" : ""}
              </button>
            </div>
          )}

          <Button
            className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20"
            disabled={loading || uploading}
            onClick={() => void onGenerate()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {audioUrl && (
            <MusicResultCard
              audioUrl={audioUrl}
              trackTitle={trackTitle ?? "Generated track"}
              mode={resultMode ?? mode}
              charged={charged}
              model={resultModel}
              videoUrl={resultVideoUrl}
              outputType={resultOutputType}
              onAgain={() => {
                setAudioUrl(null);
                setResultVideoUrl(null);
                setTrackTitle(null);
                setCharged(null);
              }}
            />
          )}
        </section>

        <EditorDisclaimer className="mt-8" />
      </main>
    </div>
  );
}
