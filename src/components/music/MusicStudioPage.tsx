import { Link, useSearch } from "@tanstack/react-router";
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
  const search = useSearch({ from: "/_authenticated/music" }) as { mode?: string; videoUrl?: string };
  const generate = useServerFn(generateMusic);
  const getCaps = useServerFn(getMusicCapabilities);

  const initialMode: MusicMode =
    search.mode === "video-music" || search.mode === "video_music"
      ? "video_music"
      : ((search.mode as MusicMode) || "song");

  const [mode, setMode] = useState<MusicMode>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [instrument, setInstrument] = useState("");
  const [duration, setDuration] = useState(30);
  const [voice, setVoice] = useState<VoiceId>("eve");
  const [qualityTier, setQualityTier] = useState<"standard" | "premium">("standard");
  const [sfxCategory, setSfxCategory] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(search.videoUrl ?? null);
  const [videoName, setVideoName] = useState<string | null>(search.videoUrl ? "Attached video" : null);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [charged, setCharged] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = isAdminEmail(profile?.email);
  const [adminTestPlan, setAdminTestPlan] = useState<PlanId | null>(() => (typeof window !== "undefined" ? readAdminTestPlan() : null));
  const [musicCaps, setMusicCaps] = useState<{
    qualityTiers: ("standard" | "premium")[];
    promptMaxChars: number;
    lyricsMaxChars: number;
    modes: MusicMode[];
    maxTrackDurationSeconds: number;
    maxSfxDurationSeconds: number;
    maxVideoAudioDurationSeconds: number;
    historyEnabled: boolean;
    imageToMusic: boolean;
    videoToMusic: boolean;
    videoAudioReplacement: boolean;
    bgmEnabled: boolean;
    voiceoverEnabled: boolean;
  } | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultOutputType, setResultOutputType] = useState<"audio" | "video" | null>(null);
  const [resultMode, setResultMode] = useState<MusicMode | null>(null);
  const [videoAudioMode, setVideoAudioMode] = useState<"replace" | "mix">("replace");
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (search.videoUrl) {
      setVideoUrl(search.videoUrl);
      setVideoName("From Video Studio");
      setMode("video_music");
    }
  }, [search.videoUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getCaps({ data: { adminTestPlan: isAdmin ? (adminTestPlan ?? undefined) : undefined } });
        if (cancelled || !res) return;
        setMusicCaps({
          qualityTiers: (res.qualityTiers as ("standard" | "premium")[]) ?? ["standard"],
          promptMaxChars: typeof res.promptMaxChars === "number" ? res.promptMaxChars : 0,
          lyricsMaxChars: typeof res.lyricsMaxChars === "number" ? res.lyricsMaxChars : 0,
          modes: (res.modes as MusicMode[]) ?? ["song", "instrumental"],
          maxTrackDurationSeconds: typeof res.maxTrackDurationSeconds === "number" ? res.maxTrackDurationSeconds : 30,
          maxSfxDurationSeconds: typeof res.maxSfxDurationSeconds === "number" ? res.maxSfxDurationSeconds : 0,
          maxVideoAudioDurationSeconds: typeof res.maxVideoAudioDurationSeconds === "number" ? res.maxVideoAudioDurationSeconds : 0,
          historyEnabled: res.historyEnabled === true,
          imageToMusic: res.imageToMusic === true,
          videoToMusic: res.videoToMusic === true,
          videoAudioReplacement: res.videoAudioReplacement === true,
          bgmEnabled: res.bgmEnabled === true,
          voiceoverEnabled: res.voiceoverEnabled === true,
        });
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [getCaps, adminTestPlan]);

  const premiumAllowed = !musicCaps || musicCaps.qualityTiers.includes("premium");
  const promptMax = musicCaps?.promptMaxChars && musicCaps.promptMaxChars > 0 ? musicCaps.promptMaxChars : null;
  const lyricsMax = musicCaps?.lyricsMaxChars && musicCaps.lyricsMaxChars > 0 ? musicCaps.lyricsMaxChars : null;

  useEffect(() => {
    if (!premiumAllowed && qualityTier === "premium") setQualityTier("standard");
  }, [premiumAllowed, qualityTier]);

  useEffect(() => {
    if (!musicCaps) return;
    const max =
      mode === "sfx"
        ? musicCaps.maxSfxDurationSeconds
        : mode === "video_music"
          ? musicCaps.maxVideoAudioDurationSeconds
          : musicCaps.maxTrackDurationSeconds;
    if (max > 0 && duration > max) setDuration(max);
  }, [mode, musicCaps, duration]);

  useEffect(() => {
    if (mode !== "song") {
      setLyrics("");
      setShowLyrics(false);
    }
    if (mode !== "instrumental") setInstrument("");
    if (mode !== "sfx") setSfxCategory("");
  }, [mode]);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = window.setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING.length - 1)), 2400);
    return () => window.clearInterval(id);
  }, [loading]);

  async function onImageFile(file: File) {
    if (musicCaps && !musicCaps.imageToMusic) return toast.error("Image→Music is not available on your plan.");
    if (!file.type.startsWith("image/")) return toast.error("Choose an image.");
    if (file.size > 12 * 1024 * 1024) return toast.error("Max 12 MB.");
    if (!user?.id) return toast.error("Sign in required.");
    if (imagePreview) {
      try { URL.revokeObjectURL(imagePreview); } catch { /* ignore */ }
    }
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setImageUrl(null);
    setImageUploading(true);
    setUploading(true);
    try {
      setImageUrl(await uploadFile(file, user.id, "music-img"));
      toast.success("Image attached.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
      try { URL.revokeObjectURL(localPreview); } catch { /* ignore */ }
      setImagePreview(null);
      setImageUrl(null);
    } finally {
      setImageUploading(false);
      setUploading(false);
    }
  }

  async function onVideoFile(file: File) {
    if (mode === "video_music" && musicCaps && !musicCaps.videoToMusic) {
      return toast.error("Video→Music is not available on your plan. Upgrade to Lite or higher.");
    }
    if (!file.type.startsWith("video/")) return toast.error("Choose a video.");
    if (file.size > 80 * 1024 * 1024) return toast.error("Max 80 MB.");
    if (!user?.id) return toast.error("Sign in required.");
    setVideoName(file.name);
    setVideoUrl(null);
    setVideoUploading(true);
    setUploading(true);
    try {
      const url = await uploadFile(file, user.id, "music-vid");
      setVideoUrl(url);
      toast.success("Video attached — audio soundtrack only.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
      setVideoUrl(null);
      setVideoName(null);
    } finally {
      setVideoUploading(false);
      setUploading(false);
    }
  }

  async function onGenerate() {
    if (loading || uploading || videoUploading || imageUploading) return;
    if (mode === "voiceover" && !prompt.trim()) return toast.error("Enter a script.");
    if (mode === "sfx" && !prompt.trim() && !videoUrl) return toast.error("Describe the sound or upload a video.");
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
    idempotencyKeyRef.current = idempotencyKey;
    startGeneration("music", "/music");
    try {
      const res = await generate({
        data: {
          mode,
          prompt: prompt.trim(),
          lyrics: mode === "song" ? lyrics.trim() || undefined : undefined,
          genre: genre && (MUSIC_GENRES as readonly string[]).includes(genre) ? (genre as (typeof MUSIC_GENRES)[number]) : undefined,
          mood: mood && (MUSIC_MOODS as readonly string[]).includes(mood) ? (mood as (typeof MUSIC_MOODS)[number]) : undefined,
          instrument: instrument || undefined,
          durationSeconds: duration,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          voice: mode === "voiceover" ? voice : undefined,
          instrumental: mode === "instrumental" || mode === "bgm",
          qualityTier: mode === "song" || mode === "instrumental" || mode === "bgm" ? qualityTier : "standard",
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
      toast.success(res.creditsCharged ? `Ready · ${res.creditsCharged} credits` : "Track ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
      endGeneration();
    }
  }

  const promptLabel =
    mode === "voiceover" ? "📝 Script" :
    mode === "sfx" ? "🔊 Sound description" :
    mode === "video_music" ? "🎬 Soundtrack description" :
    mode === "bgm" ? "📻 BGM description" :
    mode === "song" ? "🎵 Describe the music" :
    "🎹 Describe the instrumental";

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-background">
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8">
        <header className="mb-5">
          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <StudioBackLink />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-sm sm:h-10 sm:w-10">
                <Music2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  Music{" "}
                  <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Studio</span>
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

        <section className="mb-5">
          <MusicModeCards mode={mode} onChange={setMode} allowedModes={musicCaps?.modes ?? null} />
        </section>

        {isAdmin && profile?.email && isAdminEmail(profile.email) && (
          <section className="mb-4 rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 p-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-orange-600 dark:text-orange-400">
              Admin · Music plan test matrix (server-enforced)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { writeAdminTestPlan(null); setAdminTestPlan(null); }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  adminTestPlan == null
                    ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                    : "border-border/60 bg-card text-muted-foreground",
                )}
              >
                Real plan
              </button>
              {ADMIN_TEST_PLAN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { writeAdminTestPlan(opt.id); setAdminTestPlan(opt.id); }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition",
                    adminTestPlan === opt.id
                      ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                      : "border-border/60 bg-card text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Uses the same getMusicPlanCapabilities / quoteMusicGeneration path as real users. Test plans are charged against your admin credits.
            </p>
          </section>
        )}

        <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="min-w-0 space-y-4">
            <section>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">{promptLabel}</p>
                {promptMax != null && (
                  <span className={cn("text-[10px] tabular-nums text-muted-foreground", prompt.length > promptMax && "text-destructive")}>
                    {String(prompt.length)} / {String(promptMax)}
                  </span>
                )}
              </div>
              <AutoGrowTextarea
                value={prompt}
                onChange={setPrompt}
                minRows={mode === "voiceover" ? 4 : 3}
                maxHeight={mode === "voiceover" ? 280 : 200}
                placeholder={
                  mode === "voiceover" ? "Write the script…" :
                  mode === "sfx" ? "e.g. soft rain, distant thunder" :
                  mode === "video_music" ? "e.g. uplifting soundtrack matching the scene" :
                  "e.g. nostalgic piano for a family photo"
                }
              />
            </section>

            {mode === "song" && (
              <section>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">Lyrics (optional)</p>
                  {lyricsMax != null && (
                    <span className={cn("text-[10px] tabular-nums text-muted-foreground", lyrics.length > lyricsMax && "text-destructive")}>
                      {String(lyrics.length)} / {String(lyricsMax)}
                    </span>
                  )}
                </div>
                <AutoGrowTextarea value={lyrics} onChange={setLyrics} minRows={2} maxHeight={160} mono placeholder={"[Verse]\n…\n[Chorus]\n…"} />
              </section>
            )}

            {mode === "voiceover" && (<MusicVoiceLibrary value={voice} onChange={setVoice} />)}

            {(mode === "song" || mode === "instrumental" || mode === "bgm") && (
              <>
                <section className="min-w-0"><Label>Genre</Label><MusicScrollChips items={MUSIC_GENRES} value={genre} onChange={setGenre} /></section>
                <section className="min-w-0"><Label>Mood</Label>
                  <MusicScrollChips items={MOOD_CHIPS} value={mood} onChange={setMood}
                    activeClass="border-transparent bg-gradient-to-r from-violet-500 to-purple-700 text-white shadow-sm" />
                </section>
              </>
            )}

            {mode === "instrumental" && (
              <section className="min-w-0"><Label>Instrument</Label><MusicInstrumentCards value={instrument} onChange={setInstrument} /></section>
            )}

            {mode === "sfx" && (
              <section className="min-w-0"><Label>Category</Label><MusicScrollChips items={[...SFX_CATEGORIES]} value={sfxCategory} onChange={setSfxCategory} /></section>
            )}

            {(mode === "song" || mode === "instrumental" || mode === "sfx" || mode === "bgm" || mode === "video_music") && (
              <section>
                <Label>Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {(mode === "sfx" || mode === "video_music" ? SFX_DURATIONS : DURATIONS).map((d) => {
                    const maxAllowed = !musicCaps ? d.s : mode === "sfx" ? musicCaps.maxSfxDurationSeconds : mode === "video_music" ? musicCaps.maxVideoAudioDurationSeconds : musicCaps.maxTrackDurationSeconds;
                    const locked = maxAllowed > 0 && d.s > maxAllowed;
                    return (
                    <button key={d.s} type="button" disabled={locked} title={locked ? `Upgrade to unlock ${d.label}` : undefined} onClick={() => { if (!locked) setDuration(d.s); }}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        locked && "cursor-not-allowed opacity-45", !locked && duration === d.s ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm" : !locked ? "border-border/60 bg-card text-muted-foreground hover:border-orange-500/40" : "border-border/40 bg-card/60 text-muted-foreground")}>{locked ? (<span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />{d.label}</span>) : d.label}</button>);})}
                </div>
              </section>
            )}

            {mode === "video_music" && (
              <section>
                <Label>🎬 Video audio</Label>
                <div className="flex flex-wrap gap-2">
                  {([{ id: "replace" as const, label: "Replace" }, { id: "mix" as const, label: "Mix" }]).map((opt) => {
                    const locked = opt.id === "replace" && musicCaps && !musicCaps.videoAudioReplacement;
                    return (
                      <button key={opt.id} type="button" disabled={!!locked} onClick={() => !locked && setVideoAudioMode(opt.id)} className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.97]",
                        locked && "cursor-not-allowed opacity-40",
                        videoAudioMode === opt.id && !locked ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm" : "border-border/60 bg-card text-muted-foreground hover:border-orange-500/40",
                      )}>{opt.label}</button>
                    );
                  })}
                </div>
              </section>
            )}

            {(mode === "song" || mode === "instrumental" || mode === "bgm") && (
              <section>
                <Label>💎 Quality</Label>
                <div className="flex flex-wrap gap-2">
                  {(["standard", "premium"] as const).map((q) => {
                    const locked = q === "premium" && !premiumAllowed;
                    return (
                      <button key={q} type="button" disabled={locked} onClick={() => !locked && setQualityTier(q)} className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition active:scale-[0.97]",
                        locked && "cursor-not-allowed opacity-40",
                        qualityTier === q && !locked ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-sm" : "border-border/60 bg-card text-muted-foreground hover:border-orange-500/40",
                      )}>{locked ? <><Lock className="mr-1 inline h-3 w-3" />{q}</> : q}</button>
                    );
                  })}
                </div>
              </section>
            )}

            {(mode === "song" || mode === "instrumental" || mode === "bgm" || mode === "sfx") && (
              <section className="space-y-2">
                <Label>📎 Media (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImageFile(f); e.target.value = ""; }} />
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onVideoFile(f); e.target.value = ""; }} />
                  <Button type="button" size="sm" variant="outline" disabled={imageUploading || videoUploading || (musicCaps ? !musicCaps.imageToMusic : false)} onClick={() => imageInputRef.current?.click()}>
                    {imageUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
                    {imageUploading ? "Uploading…" : "Image"}
                  </Button>
                  
                  {(imageUrl || videoUrl || videoName || imagePreview) && (
                    <Button type="button" size="sm" variant="ghost" disabled={videoUploading || imageUploading} onClick={() => {
                      if (imagePreview) { try { URL.revokeObjectURL(imagePreview); } catch { /* ignore */ } }
                      setImageUrl(null); setImagePreview(null); setVideoUrl(null); setVideoName(null);
                    }}>
                      <X className="mr-1 h-3.5 w-3.5" /> Clear
                    </Button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    {imageUploading && <span className="text-[11px] text-muted-foreground">Uploading image…</span>}
                    {!imageUploading && imageUrl && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Image ready</span>}
                  </div>
                )}
                {videoName && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1.5 text-[11px]">
                    <Video className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="min-w-0 truncate font-medium">{videoName}</span>
                    {videoUploading && (
                      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                      </span>
                    )}
                    {!videoUploading && videoUrl && (
                      <span className="ml-auto text-emerald-600 dark:text-emerald-400">Ready</span>
                    )}
                  </div>
                )}
              </section>
            )}

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-95"
                disabled={loading || uploading || videoUploading || imageUploading}
                onClick={() => void onGenerate()}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                ) : videoUploading || imageUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading media…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate</>
                )}
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            {loading && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="mt-3 text-sm font-medium">{LOADING[loadingStep]}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Please wait…</p>
              </div>
            )}
            {!loading && audioUrl && (
              <MusicResultCard
                audioUrl={audioUrl}
                videoUrl={resultVideoUrl}
                outputType={resultOutputType}
                trackTitle={trackTitle}
                model={resultModel}
                credits={charged}
                mode={resultMode ?? mode}
              />
            )}
            {!loading && !audioUrl && (
              <div className="hidden rounded-xl border border-dashed border-border/50 p-8 text-center lg:block">
                <Mic2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-xs text-muted-foreground">Your track appears here after generation.</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need video? <Link to="/studio/video" className="text-primary underline-offset-2 hover:underline">Video Studio</Link>
        </p>
        <EditorDisclaimer className="mt-4" />
      </main>
      <Footer />
    </div>
  );
}
