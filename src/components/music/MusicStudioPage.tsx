import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { MusicAccessGate } from "@/components/MusicAccessGate";
import { MusicModeCards } from "@/components/music/MusicModeCards";
import { MusicScrollChips } from "@/components/music/MusicScrollChips";
import { MusicResultCard } from "@/components/music/MusicResultCard";
import {
  VOICES, DURATIONS, SFX_CATEGORIES, MUSIC_EXAMPLES as EXAMPLES, LOADING_STEPS as LOADING,
} from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic, estimateMusicCost, MUSIC_GENRES, MUSIC_MOODS, MUSIC_INSTRUMENTS, type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { Sparkles, Loader2, Mic2, Video, ImagePlus, Coins, X, ChevronDown, Volume2 } from "lucide-react";
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
  return <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">{children}</p>;
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
  const [voice, setVoice] = useState("eve");
  const [qualityTier, setQualityTier] = useState<"standard" | "premium">("standard");
  const [sfxCategory, setSfxCategory] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tempo, setTempo] = useState<"auto" | "slow" | "medium" | "fast">("auto");
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

  function previewVoice(id: string) {
    try {
      const u = new SpeechSynthesisUtterance(`Hello, I am ${id}. Browser preview only.`);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { toast.message("Preview unavailable."); }
  }

  async function onGenerate() {
    if (loading || uploading) return;
    if (mode === "voiceover" && !prompt.trim()) return toast.error("Enter a script.");
    if (mode === "sfx" && !prompt.trim() && !videoUrl) return toast.error("Describe the sound or upload a video.");
    if ((mode === "song" || mode === "instrumental") && !prompt.trim() && !imageUrl && !videoUrl)
      return toast.error("Add a description, image, or video.");
    const need = estCredits ?? 35;
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
          instrument: instrument && (MUSIC_INSTRUMENTS as readonly string[]).includes(instrument) ? (instrument as (typeof MUSIC_INSTRUMENTS)[number]) : undefined,
          durationSeconds: duration, imageUrl: imageUrl || undefined, videoUrl: videoUrl || undefined,
          voice: mode === "voiceover" ? voice : undefined, instrumental: mode === "instrumental",
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
  const promptLabel = mode === "voiceover" ? "Script" : mode === "sfx" ? "Sound description" : mode === "song" ? "Describe the music you want…" : "Describe the instrumental…";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Music{" "}
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Studio</span>
            </h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Turn ideas into sound — songs, instrumentals, voiceovers, and cinematic effects.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-sm">
            <Coins className="h-4 w-4 text-orange-500" />
            <span className="tabular-nums font-semibold">{profile?.credits != null ? profile.credits.toLocaleString() : "—"}</span>
            <span className="text-muted-foreground">credits</span>
          </div>
        </div>

        <section className="mb-6"><MusicModeCards mode={mode} onChange={setMode} /></section>

        <section className="mb-6">
          <Label>Try an example</Label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {EXAMPLES.map((ex) => (
              <button key={ex.title} type="button" onClick={() => applyExample(ex)}
                className="min-w-[150px] shrink-0 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition hover:border-orange-500/40">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{ex.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{ex.prompt}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(280px,340px)]">
          <div className="space-y-5">
            <section>
              <Label>{promptLabel}</Label>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={mode === "voiceover" ? 6 : 3}
                placeholder={mode === "voiceover" ? "Write the script…" : mode === "sfx" ? "e.g. soft rain, distant thunder" : "e.g. nostalgic piano for a family photo"}
                className="min-h-[88px] resize-y rounded-2xl border-border/70 bg-card shadow-sm" />
            </section>

            {mode === "song" && (
              <section>
                <Label>Lyrics (optional)</Label>
                <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={3}
                  placeholder={"[Verse]\n…\n[Chorus]\n…"}
                  className="resize-y rounded-2xl border-border/70 bg-card font-mono text-sm shadow-sm" />
              </section>
            )}

            {mode === "voiceover" && (
              <section>
                <Label>Voice library</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {VOICES.map((v) => (
                    <div key={v.id} className={cn("flex items-center gap-3 rounded-2xl border p-3",
                      voice === v.id ? "border-transparent bg-gradient-to-r from-orange-500/15 to-purple-600/15 ring-2 ring-orange-500/50" : "border-border/70 bg-card")}>
                      <button type="button" onClick={() => setVoice(v.id)} className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-semibold">{v.label}</p>
                        <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                      </button>
                      <button type="button" onClick={() => previewVoice(v.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border" aria-label={`Preview ${v.label}`}>
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">Browser preview only. Final audio is xAI TTS on Generate.</p>
              </section>
            )}

            {(mode === "song" || mode === "instrumental") && (
              <>
                <section><Label>Genre</Label><MusicScrollChips items={MUSIC_GENRES} value={genre} onChange={setGenre} /></section>
                <section><Label>Mood</Label>
                  <MusicScrollChips items={MUSIC_MOODS} value={mood} onChange={setMood}
                    activeClass="border-transparent bg-gradient-to-r from-violet-500 to-purple-700 text-white shadow-sm" />
                </section>
              </>
            )}

            {mode === "instrumental" && (
              <section><Label>Instrument</Label>
                <MusicScrollChips items={MUSIC_INSTRUMENTS} value={instrument} onChange={setInstrument}
                  activeClass="border-transparent bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm" />
              </section>
            )}

            {mode === "sfx" && (
              <section><Label>Category</Label>
                <MusicScrollChips items={SFX_CATEGORIES} value={sfxCategory} onChange={(v) => {
                  setSfxCategory(v); if (v && !prompt.trim()) setPrompt(`${v} sound effect`);
                }} />
              </section>
            )}

            {mode !== "voiceover" && (
              <section>
                <Label>Duration{(mode === "song" || mode === "instrumental") && !videoUrl ? " (style preference)" : ""}</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.filter((d) => mode !== "sfx" || d.s <= 30).map((d) => (
                    <button key={d.s} type="button" onClick={() => setDuration(d.s)}
                      className={cn("rounded-full border px-3.5 py-2 text-xs font-semibold",
                        duration === d.s ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white" : "border-border/70 bg-card")}>
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
                  <button type="button" onClick={() => setQualityTier("standard")}
                    className={cn("rounded-2xl border p-3 text-left", qualityTier === "standard" ? "ring-2 ring-orange-500/40 border-transparent bg-orange-500/10" : "border-border/70 bg-card")}>
                    <p className="text-sm font-bold">Standard</p>
                    <p className="text-[11px] text-muted-foreground">Fast · 35 credits</p>
                  </button>
                  <button type="button" onClick={() => setQualityTier("premium")}
                    className={cn("rounded-2xl border p-3 text-left", qualityTier === "premium" ? "ring-2 ring-purple-500/50 border-transparent bg-purple-500/10" : "border-border/70 bg-card")}>
                    <p className="text-sm font-bold">Premium</p>
                    <p className="text-[11px] text-muted-foreground">Higher quality · 75 credits</p>
                  </button>
                </div>
              </section>
            )}

            {(mode === "song" || mode === "instrumental") && (
              <section className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2"><ImagePlus className="h-4 w-4 text-orange-500" /><p className="text-sm font-semibold">Image → atmosphere</p></div>
                <p className="mb-3 text-[11px] text-muted-foreground">Vision analysis shapes mood and direction.</p>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImageFile(f); }} />
                {imagePreview ? (
                  <div className="relative overflow-hidden rounded-xl border">
                    <img src={imagePreview} alt="" className="max-h-36 w-full object-cover" />
                    <button type="button" onClick={() => { setImageUrl(null); setImagePreview(null); }} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button type="button" disabled={uploading} onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card py-6 text-sm text-muted-foreground">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload photo
                  </button>
                )}
              </section>
            )}

            {(mode === "sfx" || mode === "song" || mode === "instrumental") && (
              <section className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2"><Video className="h-4 w-4 text-purple-500" /><p className="text-sm font-semibold">Video → soundtrack</p></div>
                <p className="mb-3 text-[11px] text-muted-foreground">Creates <strong>audio only</strong> — not video-to-video.</p>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onVideoFile(f); }} />
                {videoUrl ? (
                  <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2.5 text-sm">
                    <span className="truncate font-medium">{videoName || "Video attached"}</span>
                    <button type="button" onClick={() => { setVideoUrl(null); setVideoName(null); }}><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button type="button" disabled={uploading} onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card py-6 text-sm text-muted-foreground">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} Upload video
                  </button>
                )}
              </section>
            )}

            {(mode === "song" || mode === "instrumental") && (
              <section>
                <button type="button" onClick={() => setAdvancedOpen((o) => !o)} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  Advanced <ChevronDown className={cn("h-3.5 w-3.5 transition", advancedOpen && "rotate-180")} />
                </button>
                {advancedOpen && (
                  <div className="mt-3 space-y-2 rounded-2xl border bg-card p-3">
                    <Label>Tempo feel</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["auto", "slow", "medium", "fast"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setTempo(t)}
                          className={cn("rounded-full border px-3 py-1.5 text-xs capitalize", tempo === t ? "bg-orange-500 text-white border-transparent" : "border-border")}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Embedded in the brief — MiniMax has no separate BPM API.</p>
                  </div>
                )}
              </section>
            )}

            <section className="sticky bottom-16 z-10 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-md sm:static sm:shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Estimated </span>
                  {estLoading ? "…" : estCredits != null ? <span className="font-bold tabular-nums">{estCredits} credits</span> : "—"}
                </div>
                {!canAfford && <Link to="/pricing" className="text-xs font-semibold text-orange-600 underline-offset-2 hover:underline">Get credits</Link>}
              </div>
              <Button type="button" disabled={loading || uploading || !canAfford} onClick={() => void onGenerate()}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-base font-semibold text-white shadow-md hover:opacity-95">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{LOADING[loadingStep]}</>
                  : !canAfford ? "Not enough credits"
                  : <><Sparkles className="mr-2 h-4 w-4" />Generate{estCredits != null ? ` · ${estCredits} credits` : ""}</>}
              </Button>
            </section>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            {loading && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-semibold">{LOADING[loadingStep]}</p>
              </div>
            )}
            {!loading && audioUrl && (
              <MusicResultCard audioUrl={audioUrl} trackTitle={trackTitle || "Generated track"} mode={mode}
                genre={genre} mood={mood} charged={charged} model={resultModel} videoUrl={videoUrl}
                onAgain={() => { setAudioUrl(null); setTrackTitle(null); }} />
            )}
            {!loading && !audioUrl && (
              <div className="hidden rounded-2xl border border-dashed border-border/50 p-8 text-center lg:block">
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
