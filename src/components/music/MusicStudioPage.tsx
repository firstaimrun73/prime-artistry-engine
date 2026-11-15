import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { MusicAccessGate } from "@/components/MusicAccessGate";
import { MusicModeCards } from "@/components/music/MusicModeCards";
import { MusicScrollChips } from "@/components/music/MusicScrollChips";
import { MusicInstrumentCards } from "@/components/music/MusicInstrumentCards";
import { MusicResultCard } from "@/components/music/MusicResultCard";
import { MusicVoiceLibrary } from "@/components/music/MusicVoiceLibrary";
import {
  DURATIONS, SFX_DURATIONS, SFX_CATEGORIES, LOADING_STEPS as LOADING,
  MOOD_CHIPS,
  type VoiceId,
} from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic, getMusicCapabilities, MUSIC_GENRES, MUSIC_MOODS, type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { StudioBackLink } from "@/components/StudioBackLink";
import { Sparkles, Loader2, Mic2, Video, ImagePlus, Coins, X, Music2, Lock } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";
import {
  ADMIN_TEST_PLAN_OPTIONS,
  readAdminTestPlan,
  writeAdminTestPlan,
} from "@/lib/studio/image/admin-test-plan";
import type { PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

async function uploadFile(file: File, userId: string, folder: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream", upsert: true,
  });
  if (error) throw new Error(error.message || "Upload failed.");
  const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) throw new Error("Could not create a secure file URL.");
  return data.signedUrl;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">{children}</p>;
}

function AutoGrowTextarea({
  value, onChange, placeholder, className, minRows = 3, maxHeight = 220, mono,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
  minRows?: number; maxHeight?: number; mono?: boolean;
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
        mono && "font-mono",
        className,
      )}
    />
  );
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
  // Embed-safe: works under /music and /motion2ai (never pass workspace mode "music" as MusicMode)
  const search = useRouterState({ select: (s) => s.location.search }) as {
    mode?: string;
    videoUrl?: string;
  };
  const generate = useServerFn(generateMusic);
  const getCaps = useServerFn(getMusicCapabilities);

  const VALID_MUSIC: MusicMode[] = [
    "song",
    "instrumental",
    "bgm",
    "voiceover",
    "sfx",
    "video_music",
  ];
  // Workspace query ?mode=music must NOT become MusicMode "music"
  const initialMode: MusicMode =
    search.mode === "video-music" || search.mode === "video_music"
      ? "video_music"
      : search.mode && VALID_MUSIC.includes(search.mode as MusicMode)
        ? (search.mode as MusicMode)
        : "song";

  const [mode, setMode] = useState<MusicMode>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [instrument, setInstrument] = useState("");
  const [duration, setDuration] = useState(30);
  const [voice, setVoice] = useState<VoiceId>("eve");
  const [qualityTier, setQualityTier] = useState<"standard" | "premium">("standard");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(search.videoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [charged, setCharged] = useState<number | null>(null);
  const isAdmin = isAdminEmail(profile?.email);
  const [adminTestPlan, setAdminTestPlan] = useState<PlanId | null>(() =>
    typeof window !== "undefined" ? readAdminTestPlan() : null,
  );
  const [musicCaps, setMusicCaps] = useState<{
    qualityTiers: ("standard" | "premium")[];
    promptMaxChars: number;
    modes: MusicMode[];
    maxTrackDurationSeconds: number;
  } | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultOutputType, setResultOutputType] = useState<"audio" | "video" | null>(null);
  const [resultMode, setResultMode] = useState<MusicMode | null>(null);
  const [videoAudioMode, setVideoAudioMode] = useState<"replace" | "mix">("replace");
  const [sfxCategory, setSfxCategory] = useState<string>("");

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
          data: { adminTestPlan: isAdmin ? (adminTestPlan ?? undefined) : undefined },
        });
        if (cancelled || !res) return;
        setMusicCaps({
          qualityTiers: (res.qualityTiers as ("standard" | "premium")[]) ?? ["standard"],
          promptMaxChars: typeof res.promptMaxChars === "number" ? res.promptMaxChars : 0,
          modes: (res.modes as MusicMode[]) ?? ["song", "instrumental"],
          maxTrackDurationSeconds:
            typeof res.maxTrackDurationSeconds === "number" ? res.maxTrackDurationSeconds : 30,
        });
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getCaps, adminTestPlan, isAdmin]);

  const premiumAllowed = !musicCaps || musicCaps.qualityTiers.includes("premium");
  const promptMax =
    musicCaps?.promptMaxChars && musicCaps.promptMaxChars > 0 ? musicCaps.promptMaxChars : null;

  useEffect(() => {
    if (!premiumAllowed && qualityTier === "premium") setQualityTier("standard");
  }, [premiumAllowed, qualityTier]);

  async function onGenerate() {
    if (loading || uploading) return;
    if (mode === "voiceover" && !prompt.trim()) return toast.error("Enter a script.");
    if ((mode === "song" || mode === "instrumental" || mode === "bgm") && !prompt.trim() && !imageUrl && !videoUrl)
      return toast.error("Add a description, image, or video.");
    if (mode === "video_music" && !videoUrl) return toast.error("Upload or attach a video for Video Music.");

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
            mode === "song" || mode === "instrumental" || mode === "bgm" ? qualityTier : "standard",
          videoAudioMode: mode === "video_music" ? videoAudioMode : undefined,
          sfxCategory: mode === "sfx" ? sfxCategory || undefined : undefined,
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
      toast.success(res.creditsCharged ? `Ready · ${res.creditsCharged} credits` : "Track ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
      endGeneration();
    }
  }

  async function handleImageUpload(file: File) {
    if (!user?.id) return toast.error("Sign in required");
    setUploading(true);
    try {
      const url = await uploadFile(file, user.id, "music-image");
      setImageUrl(url);
      toast.success("Image attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(file: File) {
    if (!user?.id) return toast.error("Sign in required");
    setUploading(true);
    try {
      const url = await uploadFile(file, user.id, "music-video");
      setVideoUrl(url);
      toast.success("Video attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const durationOptions = mode === "sfx" ? SFX_DURATIONS : DURATIONS;

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
                {profile?.credits != null ? profile.credits.toLocaleString() : "—"}
              </span>
            </div>
          </div>
          <div className="mt-3 h-px w-full bg-gradient-to-r from-orange-500/40 via-rose-500/30 to-purple-600/40" />
        </header>

        {isAdmin && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
            <Lock className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-semibold text-amber-700 dark:text-amber-400">Admin test plan</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1"
              value={adminTestPlan ?? ""}
              onChange={(e) => {
                const v = (e.target.value || null) as PlanId | null;
                setAdminTestPlan(v);
                writeAdminTestPlan(v);
              }}
            >
              <option value="">Live profile plan</option>
              {ADMIN_TEST_PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        <section className="mb-5">
          <MusicModeCards mode={mode} onChange={setMode} allowedModes={musicCaps?.modes ?? null} />
        </section>

        <section className="space-y-4">
          <div>
            <Label>{mode === "voiceover" ? "Script" : "Prompt"}</Label>
            <AutoGrowTextarea
              value={prompt}
              onChange={setPrompt}
              placeholder={
                mode === "voiceover"
                  ? "Write the spoken script…"
                  : "Describe the track, mood, or scene…"
              }
              maxHeight={220}
            />
            {promptMax != null && (
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {prompt.length}/{promptMax}
              </p>
            )}
          </div>

          {mode === "song" && (
            <div>
              <Label>Lyrics (optional)</Label>
              <AutoGrowTextarea
                value={lyrics}
                onChange={setLyrics}
                placeholder="Paste or write lyrics…"
                maxHeight={180}
                mono
              />
            </div>
          )}

          {(mode === "song" || mode === "instrumental" || mode === "bgm") && (
            <>
              <div>
                <Label>Genre</Label>
                <MusicScrollChips
                  options={[...MUSIC_GENRES]}
                  value={genre}
                  onChange={setGenre}
                />
              </div>
              <div>
                <Label>Mood</Label>
                <MusicScrollChips
                  options={MOOD_CHIPS.map((m) => (typeof m === "string" ? m : m.id))}
                  value={mood}
                  onChange={setMood}
                />
              </div>
              <div>
                <Label>Instrument focus</Label>
                <MusicInstrumentCards value={instrument} onChange={setInstrument} />
              </div>
            </>
          )}

          {mode === "voiceover" && (
            <div>
              <Label>Voice</Label>
              <MusicVoiceLibrary value={voice} onChange={setVoice} />
            </div>
          )}

          {mode === "sfx" && (
            <div>
              <Label>SFX category</Label>
              <MusicScrollChips
                options={[...SFX_CATEGORIES]}
                value={sfxCategory}
                onChange={setSfxCategory}
              />
            </div>
          )}

          <div>
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    duration === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/40 p-4 text-center transition hover:border-primary/40">
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-semibold">Reference image</span>
              {imageUrl && <span className="truncate text-[10px] text-primary">Attached</span>}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageUpload(f);
                }}
              />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/40 p-4 text-center transition hover:border-primary/40">
              <Video className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-semibold">Reference video</span>
              {videoUrl && <span className="truncate text-[10px] text-primary">Attached</span>}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleVideoUpload(f);
                }}
              />
            </label>
          </div>

          {mode === "video_music" && videoUrl && (
            <div className="flex gap-2 rounded-2xl border border-border/60 bg-card/50 p-1">
              <button
                type="button"
                onClick={() => setVideoAudioMode("replace")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-semibold",
                  videoAudioMode === "replace"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                Replace audio
              </button>
              <button
                type="button"
                onClick={() => setVideoAudioMode("mix")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-semibold",
                  videoAudioMode === "mix"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                Mix with original
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
