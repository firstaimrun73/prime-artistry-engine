import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic,
  estimateMusicCost,
  MUSIC_GENRES,
  MUSIC_MOODS,
  type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import {
  Music as MusicIcon,
  Sparkles,
  Download,
  Loader2,
  Play,
  Pause,
  Mic2,
  Waves,
  Video,
  ImagePlus,
  Coins,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Music Studio — Song, Voiceover & Sound | MOTIO2EDIT" },
      {
        name: "description",
        content:
          "Create songs, instrumentals, voiceovers, and sound effects. Text, image, or video can inspire the track.",
      },
      { property: "og:title", content: "Music Studio — MOTIO2EDIT" },
    ],
  }),
  component: MusicPage,
});

const MODES: { id: MusicMode; label: string; hint: string; icon: typeof MusicIcon }[] = [
  { id: "song", label: "Song", hint: "Vocals + arrangement", icon: MusicIcon },
  { id: "instrumental", label: "Instrumental", hint: "No vocals", icon: Waves },
  { id: "voiceover", label: "Voiceover", hint: "Script → speech", icon: Mic2 },
  { id: "sfx", label: "Sound", hint: "SFX / ambience", icon: Sparkles },
];

const VOICES = [
  { id: "eve", label: "Eve" },
  { id: "ara", label: "Ara" },
  { id: "rex", label: "Rex" },
  { id: "sal", label: "Sal" },
  { id: "leo", label: "Leo" },
] as const;

const DURATIONS = [
  { s: 8, label: "8s" },
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
  { s: 60, label: "60s" },
];

const LOADING_STEPS = [
  "Preparing…",
  "Creating music…",
  "Processing…",
  "Finalizing…",
];

async function uploadToSupabase(file: File, userId: string, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(error.message || "Upload failed.");
  const { data: signed } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!signed?.signedUrl) throw new Error("Could not create a secure file URL.");
  return signed.signedUrl;
}

function MusicPage() {
  const { profile, user } = useAuth();
  const generate = useServerFn(generateMusic);
  const estimate = useServerFn(estimateMusicCost);

  const [mode, setMode] = useState<MusicMode>("instrumental");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [duration, setDuration] = useState(30);
  const [voice, setVoice] = useState<string>("eve");

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [estCredits, setEstCredits] = useState<number | null>(null);
  const [estProvider, setEstProvider] = useState<number | null>(null);
  const [estLoading, setEstLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const refreshEstimate = useCallback(async () => {
    setEstLoading(true);
    try {
      const res = await estimate({
        data: {
          mode,
          durationSeconds: duration,
          promptLength: prompt.length,
          hasVideo: !!videoUrl && (mode === "sfx" || mode === "song" || mode === "instrumental"),
        },
      });
      setEstCredits(res.credits);
      setEstProvider(res.providerUsd);
    } catch {
      setEstCredits(null);
      setEstProvider(null);
    } finally {
      setEstLoading(false);
    }
  }, [estimate, mode, duration, prompt, videoUrl]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshEstimate();
    }, 250);
    return () => clearTimeout(t);
  }, [refreshEstimate]);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = window.setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [loading]);

  async function onImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image is too large (max 12 MB).");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in required to upload.");
      return;
    }
    setUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      const url = await uploadToSupabase(file, user.id, "music-img");
      setImageUrl(url);
      toast.success("Image attached — it will influence the music atmosphere.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed.");
      setImagePreview(null);
      setImageUrl(null);
    } finally {
      setUploading(false);
    }
  }

  async function onVideoFile(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file (MP4, MOV, WebM).");
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      toast.error("Video is too large (max 80 MB).");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in required to upload.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToSupabase(file, user.id, "music-vid");
      setVideoUrl(url);
      setVideoName(file.name);
      toast.success("Video attached — music will sync to this video.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Video upload failed.");
      setVideoUrl(null);
      setVideoName(null);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageUrl(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function clearVideo() {
    setVideoUrl(null);
    setVideoName(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  }

  async function onGenerate() {
    if (loading || uploading) return;

    if (mode === "voiceover" && !prompt.trim()) {
      toast.error("Enter a script for the voiceover.");
      return;
    }
    if (mode === "sfx" && !prompt.trim() && !videoUrl) {
      toast.error("Describe the sound, or upload a video for video→music.");
      return;
    }
    if ((mode === "song" || mode === "instrumental") && !prompt.trim() && !imageUrl && !videoUrl) {
      toast.error("Add a description, image, or video to inspire the track.");
      return;
    }

    const creditsNeeded = estCredits ?? 1;
    if (profile && typeof profile.credits === "number" && profile.credits < creditsNeeded) {
      toast.error(`Not enough credits. This job needs about ${creditsNeeded} credits.`);
      return;
    }

    setLoading(true);
    setAudioUrl(null);
    setResultModel(null);
    setPlaying(false);
    startGeneration("music", "/music");

    try {
      const res = await generate({
        data: {
          mode,
          prompt: prompt.trim(),
          lyrics: mode === "song" ? lyrics.trim() || undefined : undefined,
          genre: genre && (MUSIC_GENRES as readonly string[]).includes(genre)
            ? (genre as (typeof MUSIC_GENRES)[number])
            : undefined,
          mood: mood && (MUSIC_MOODS as readonly string[]).includes(mood)
            ? (mood as (typeof MUSIC_MOODS)[number])
            : undefined,
          durationSeconds: duration,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          voice: mode === "voiceover" ? voice : undefined,
          instrumental: mode === "instrumental",
        },
      });

      if (!res?.outputUrl) {
        throw new Error("No audio was returned.");
      }
      setAudioUrl(res.outputUrl);
      setResultModel(res.model ?? null);
      toast.success(
        res.creditsCharged
          ? `Track ready · ${res.creditsCharged} credits used`
          : "Track ready",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
      endGeneration();
    }
  }

  const showMusicFields = mode === "song" || mode === "instrumental";
  const showLyrics = mode === "song";
  const showVoice = mode === "voiceover";
  const showDuration = mode !== "voiceover";
  const promptLabel =
    mode === "voiceover"
      ? "Script"
      : mode === "sfx"
        ? "Sound / effect description"
        : mode === "song"
          ? "Song description / brief"
          : "Instrumental description";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Music Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Song, instrumental, voiceover, and sound — text, image, or video can inspire the result.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span className="tabular-nums">
              {profile?.credits != null ? `${profile.credits} credits` : "—"}
            </span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map((m) => {
            const active = mode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={
                  "flex flex-col items-start rounded-xl border p-3 text-left transition " +
                  (active
                    ? "border-transparent bg-gradient-to-br from-orange-500/90 to-purple-600/90 text-white shadow-md"
                    : "border-border bg-card hover:border-primary/40")
                }
              >
                <Icon className={"mb-1 h-5 w-5 " + (active ? "text-white" : "text-primary")} />
                <span className="text-sm font-semibold">{m.label}</span>
                <span className={"text-xs " + (active ? "text-white/80" : "text-muted-foreground")}>
                  {m.hint}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {promptLabel}
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={mode === "voiceover" ? 6 : 3}
                placeholder={
                  mode === "voiceover"
                    ? "Write the script to speak…"
                    : mode === "sfx"
                      ? "e.g. soft rain on a window, distant thunder"
                      : "e.g. nostalgic piano for an old family photo"
                }
                className="resize-y"
              />
            </div>

            {showLyrics && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lyrics (optional structure tags)
                </label>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={5}
                  placeholder={"[Verse]\n...\n[Chorus]\n..."}
                  className="resize-y font-mono text-sm"
                />
              </div>
            )}

            {showVoice && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Voice
                </label>
                <div className="flex flex-wrap gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      className={
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                        (voice === v.id
                          ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                          : "border-border hover:border-primary/40")
                      }
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showMusicFields && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Genre
                  </label>
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {MUSIC_GENRES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenre(genre === g ? "" : g)}
                        className={
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition " +
                          (genre === g
                            ? "border-transparent bg-orange-500 text-white"
                            : "border-border hover:border-primary/40")
                        }
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mood
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSIC_MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(mood === m ? "" : m)}
                        className={
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition " +
                          (mood === m
                            ? "border-transparent bg-purple-600 text-white"
                            : "border-border hover:border-primary/40")
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {showDuration && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.s}
                      type="button"
                      onClick={() => setDuration(d.s)}
                      className={
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                        (duration === d.s
                          ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white"
                          : "border-border hover:border-primary/40")
                      }
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(mode === "song" || mode === "instrumental") && (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Image → atmosphere (optional)
                </label>
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
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <img src={imagePreview} alt="Mood reference" className="max-h-40 w-full object-cover" />
                    <button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white" aria-label="Remove image">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Upload photo
                  </button>
                )}
              </div>
            )}

            {(mode === "sfx" || mode === "song" || mode === "instrumental") && (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Video className="h-3.5 w-3.5" />
                  Video → music (optional)
                </label>
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
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="truncate">{videoName || "Video attached"}</span>
                    <button type="button" onClick={clearVideo} className="ml-2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-6 text-sm text-muted-foreground hover:border-primary/40"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    Upload video for synced audio
                  </button>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Uses MMAudio V2 — not video-to-video. Your video gets a matching soundtrack.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Estimated cost: </span>
                {estLoading ? (
                  <span className="text-muted-foreground">…</span>
                ) : estCredits != null ? (
                  <span className="font-semibold tabular-nums">~{estCredits} credits</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                {estProvider != null && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    (provider ≈ ${estProvider.toFixed(3)})
                  </span>
                )}
              </div>
              <Button
                type="button"
                disabled={loading || uploading}
                onClick={() => void onGenerate()}
                className="bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-95"
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
            </div>
          </div>

          <div className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Result</h2>
            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-medium">{LOADING_STEPS[loadingStep]}</p>
              </div>
            )}
            {!loading && !audioUrl && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <MusicIcon className="h-10 w-10 opacity-40" />
                <p className="text-sm">Your track will appear here after generation.</p>
              </div>
            )}
            {!loading && audioUrl && (
              <div className="flex flex-1 flex-col gap-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setPlaying(false)}
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                  className="hidden"
                />
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Generated audio</p>
                    {resultModel && (
                      <p className="truncate text-[11px] text-muted-foreground">{resultModel}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={audioUrl} download target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need video editing?{" "}
          <Link to="/editor" className="text-primary underline-offset-2 hover:underline">
            Open Image / Video Studio
          </Link>
          . Music stays separate from Image and Video editors.
        </p>
        <EditorDisclaimer className="mt-4" />
      </main>
      <Footer />
    </div>
  );
}
