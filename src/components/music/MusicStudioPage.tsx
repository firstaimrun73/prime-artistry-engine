import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
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
  DURATIONS, SFX_CATEGORIES, MUSIC_EXAMPLES as EXAMPLES, LOADING_STEPS as LOADING,
  type VoiceId,
} from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic, estimateMusicCost, MUSIC_GENRES, MUSIC_MOODS, type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { Sparkles, Loader2, Mic2, Video, ImagePlus, Coins, X, Music2 } from "lucide-react";
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
  const estimate = useServerFn(estimateMusicCost);

  const initialMode: MusicMode =
    search.mode === "video-music" ? "sfx" : ((search.mode as MusicMode) || "song");

  const [mode, setMode] = useState<MusicMode>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
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
  const [estCredits, setEstCredits] = useState<number | null>(null);
  const [estLoading, setEstLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [charged, setCharged] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (search.videoUrl) {
      setVideoUrl(search.videoUrl);
      setVideoName("From Video Studio");
      setMode("sfx");
    }
  }, [search.videoUrl]);

  const refreshEstimate = useCallback(async () => {
    setEstLoading(true);
    try {
      const res = await estimate({
        data: {
          mode, durationSeconds: duration, promptLength: prompt.length,
          hasVideo: !!videoUrl && (mode === "sfx" || mode === "song" || mode === "instrumental"),
          hasImage: !!imageUrl && (mode === "song" || mode === "instrumental"),
          qualityTier,
        },
      });
      setEstCredits(res.credits);
    } catch { setEstCredits(null); }
    finally { setEstLoading(false); }
  }, [estimate, mode, duration, prompt, videoUrl, imageUrl, qualityTier]);

  useEffect(() => {
    const t = setTimeout(() => void refreshEstimate(), 180);
    return () => clearTimeout(t);
  }, [refreshEstimate]);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = window.setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING.length - 1)), 2400);
    return () => window.clearInterval(id);
  }, [loading]);

  async function onImageFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image.");
    if (file.size > 12 * 1024 * 1024) return toast.error("Max 12 MB.");
    if (!user?.id) return toast.error("Sign in required.");
    setUploading(true);
    try {
      setImagePreview(URL.createObjectURL(file));
      setImageUrl(await uploadFile(file, user.id, "music-img"));
      toast.success("Image attached.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
      setImagePreview(null); setImageUrl(null);
    } finally { setUploading(false); }
  }

  async function onVideoFile(file: File) {
    if (!file.type.startsWith("video/")) return toast.error("Choose a video.");
    if (file.size > 80 * 1024 * 1024) return toast.error("Max 80 MB.");
    if (!user?.id) return toast.error("Sign in required.");
    setUploading(true);
    try {
      setVideoUrl(await uploadFile(file, user.id, "music-vid"));
      setVideoName(file.name);
      toast.success("Video attached — audio soundtrack only.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
      setVideoUrl(null); setVideoName(null);
    } finally { setUploading(false); }
  }

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setMode(ex.mode); setPrompt(ex.prompt);
    if (ex.genre) setGenre(ex.genre);
    if (ex.mood) setMood(ex.mood);
    toast.message("Example loaded.");
  }

  async function onGenerate() {
    if (loading || uploading) return;
    if (mode === "voiceover" && !prompt.trim()) return toast.error("Enter a script.");
    if (mode === "sfx" && !prompt.trim() && !videoUrl) return toast.error("Describe the sound or upload a video.");
    if ((mode === "song" || mode === "instrumental") && !prompt.trim() && !imageUrl && !videoUrl)
      return toast.error("Add a description, image, or video.");
    const need = estCredits ?? 50;
    if (profile && typeof profile.credits === "number" && profile.credits < need)
      return toast.error(`Not enough credits. Need ${need}.`);

    setLoading(true); setAudioUrl(null); setTrackTitle(null); setResultModel(null); setCharged(null);
    startGeneration("music", "/music");
    try {
      const res = await generate({
        data: {
          mode, prompt: prompt.trim(),
          lyrics: mode === "song" ? lyrics.trim() || undefined : undefined,
          genre: genre && (MUSIC_GENRES as readonly string[]).includes(genre) ? (genre as (typeof MUSIC_GENRES)[number]) : undefined,
          mood: mood && (MUSIC_MOODS as readonly string[]).includes(mood) ? (mood as (typeof MUSIC_MOODS)[number]) : undefined,
          instrument: instrument || undefined,
          durationSeconds: duration, imageUrl: imageUrl || undefined, videoUrl: videoUrl || undefined,
          voice: mode === "voiceover" ? voice : undefined,
          instrumental: mode === "instrumental",
          qualityTier: mode === "song" || mode === "instrumental" ? qualityTier : "standard",
        },
      });
      if (!res?.outputUrl) throw new Error("No audio returned.");
      setAudioUrl(res.outputUrl); setTrackTitle(res.trackTitle ?? "Generated track");
      setResultModel(res.model ?? null); setCharged(res.creditsCharged ?? null);
      void refreshProfile?.();
      toast.success(res.creditsCharged ? `Ready · ${res.creditsCharged} credits` : "Track ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false); endGeneration();
    }
  }

  const canAfford = estCredits == null || (profile?.credits ?? 0) >= estCredits;
  const promptLabel =
    mode === "voiceover" ? "Script" :
    mode === "sfx" ? "Sound description" :
    mode === "song" ? "Describe the music…" :
    "Describe the instrumental…";

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-background">
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8">
        {/* Header with icon + divider line */}
        <header className="mb-5">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-sm">
                <Music2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  Music{" "}
                  <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                    Studio
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Songs · Instrumentals · AI Voice · Sound
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
          <div className="mt-4 h-px w-full bg-gradient-to-r from-orange-500/40 via-rose-500/30 to-purple-600/40" />
        </header>

        {/* Mode cards — compact */}
        <section className="mb-5">
          <MusicModeCards mode={mode} onChange={setMode} />
        </section>

        {/* Examples — single row, less visual weight */}
        <section className="mb-5">
          <Label>Quick start</Label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                onClick={() => applyExample(ex)}
                className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-orange-500/40 hover:text-foreground"
              >
                {ex.title}
              </button>
            ))}
          </div>
        </section>

        <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="min-w-0 space-y-4">
            {/* Prompt */}
            <section>
              <Label>{promptLabel}</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={mode === "voiceover" ? 5 : 3}
                placeholder={
                  mode === "voiceover"
                    ? "Write the script…"
                    : mode === "sfx"
                      ? "e.g. soft rain, distant thunder"
                      : "e.g. nostalgic piano for a family photo"
                }
                className="min-h-[80px] w-full resize-y rounded-xl border-border/60 bg-card shadow-sm"
              />
            </section>

            {mode === "song" && (
              <section>
                <Label>Lyrics (optional)</Label>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={2}
                  placeholder={"[Verse]\n…\n[Chorus]\n…"}
                  className="w-full resize-y rounded-xl border-border/60 bg-card font-mono text-sm shadow-sm"
                />
              </section>
            )}

            {mode === "voiceover" && (
              <MusicVoiceLibrary value={voice} onChange={setVoice} />
            )}

            {(mode === "song" || mode === "instrumental") && (
              <>
                <section className="min-w-0">
                  <Label>Genre</Label>
                  <MusicScrollChips items={MUSIC_GENRES} value={genre} onChange={setGenre} />
                </section>
                <section className="min-w-0">
                  <Label>Mood</Label>
                  <MusicScrollChips
                    items={MUSIC_MOODS}
                    value={mood}
                    onChange={setMood}
                    activeClass="border-transparent bg-gradient-to-r from-violet-500 to-purple-700 text-white shadow-sm"
                  />
                </section>
              </>
            )}

            {mode === "instrumental" && (
              <section className="min-w-0">
                <Label>Instrument</Label>
                <MusicInstrumentCards value={instrument} onChange={setInstrument} />
              </section>
            )}

            {mode === "sfx" && (
              <section className="min-w-0">
                <Label>Category</Label>
                <MusicScrollChips
                  items={SFX_CATEGORIES}
                  value={sfxCategory}
                  onChange={(v) => {
                    setSfxCategory(v);
                    if (v && !prompt.trim()) setPrompt(`${v} sound effect`);
                  }}
                />
              </section>
            )}

            {mode !== "voiceover" && (
              <section>
                <Label>Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.filter((d) => mode !== "sfx" || d.s <= 30).map((d) => (
                    <button
                      key={d.s}
                      type="button"
                      onClick={() => setDuration(d.s)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                        duration === d.s
                          ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                          : "border-border/60 bg-card",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {(mode === "song" || mode === "instrumental") && (
              <section>
                <Label>Quality</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQualityTier("standard")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left",
                      qualityTier === "standard"
                        ? "ring-2 ring-orange-500/40 border-transparent bg-orange-500/10"
                        : "border-border/60 bg-card",
                    )}
                  >
                    <p className="text-sm font-bold">Standard</p>
                    <p className="text-[11px] text-muted-foreground">Fast · ~50 credits</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQualityTier("premium")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left",
                      qualityTier === "premium"
                        ? "ring-2 ring-purple-500/50 border-transparent bg-purple-500/10"
                        : "border-border/60 bg-card",
                    )}
                  >
                    <p className="text-sm font-bold">Premium</p>
                    <p className="text-[11px] text-muted-foreground">Higher quality · ~100 credits</p>
                  </button>
                </div>
              </section>
            )}

            {/* Simplified file inputs — one compact row */}
            {(mode === "song" || mode === "instrumental" || mode === "sfx") && (
              <section className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-3">
                <Label>Optional files</Label>
                <div className="flex flex-wrap gap-2">
                  {(mode === "song" || mode === "instrumental") && (
                    <>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onImageFile(f);
                        }}
                      />
                      {imagePreview ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                          <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageUrl(null);
                              setImagePreview(null);
                            }}
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => imageInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-orange-500/40"
                        >
                          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                          Photo
                        </button>
                      )}
                    </>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onVideoFile(f);
                    }}
                  />
                  {videoUrl ? (
                    <div className="inline-flex max-w-[200px] items-center gap-1.5 rounded-lg border bg-card px-2.5 py-2 text-xs">
                      <Video className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                      <span className="truncate font-medium">{videoName || "Video"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl(null);
                          setVideoName(null);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => videoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-purple-500/40"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                      Video → audio
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Photo sets mood. Video creates soundtrack only (not video-to-video).
                </p>
              </section>
            )}

            {/* Generate bar */}
            <section className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Estimated cost</span>
                {estLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : estCredits != null ? (
                  <span className="font-bold tabular-nums">{estCredits} credits</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              {!canAfford && estCredits != null && (
                <p className="text-xs text-destructive">
                  Not enough credits.{" "}
                  <Link to="/checkout" className="underline underline-offset-2">
                    Get credits
                  </Link>
                </p>
              )}
              <Button
                type="button"
                disabled={loading || uploading || !canAfford}
                onClick={() => void onGenerate()}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-base font-semibold text-white shadow-md hover:opacity-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {LOADING[loadingStep]}
                  </>
                ) : !canAfford ? (
                  "Not enough credits"
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate{estCredits != null ? ` · ${estCredits} cr` : ""}
                  </>
                )}
              </Button>
            </section>
          </div>

          {/* Result column */}
          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            {loading && (
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-semibold">{LOADING[loadingStep]}</p>
              </div>
            )}
            {!loading && audioUrl && (
              <MusicResultCard
                audioUrl={audioUrl}
                trackTitle={trackTitle || "Generated track"}
                mode={mode}
                genre={genre}
                mood={mood}
                charged={charged}
                model={resultModel}
                videoUrl={videoUrl}
                onAgain={() => {
                  setAudioUrl(null);
                  setTrackTitle(null);
                }}
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
          Need video?{" "}
          <Link to="/studio/video" className="text-primary underline-offset-2 hover:underline">
            Video Studio
          </Link>
        </p>
        <EditorDisclaimer className="mt-4" />
      </main>
      <Footer />
    </div>
  );
}
