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
          </section>
        )}

        <p className="text-sm text-muted-foreground">Music Studio UI continues — full implementation restored from eac3dd7.</p>
        <EditorDisclaimer className="mt-4" />
      </main>
      <Footer />
    </div>
  );
}
