import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { CREDIT_COST } from "@/lib/plans";

import {
  generateMusic,
  MUSIC_GENRES,
  MUSIC_MOODS,
} from "@/lib/music.functions";
import { toast } from "sonner";
import { Music, Sparkles, Download, Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/studio/music")({
  head: () => ({
    meta: [
      { title: "AI Music Studio — Generate Original Tracks | MOTIO2EDIT" },
      {
        name: "description",
        content:
          "Generate original AI music from a prompt. Pick genre, mood and duration. Preview instantly and download as MP3.",
      },
      { property: "og:title", content: "AI Music Studio — MOTIO2EDIT" },
      {
        property: "og:description",
        content:
          "Generate original AI music from a prompt. Genre, mood, duration — preview and download as MP3.",
      },
    ],
  }),
  component: MusicStudio,
});

const EXAMPLES: { label: string; prompt: string; genre?: string; mood?: string }[] = [
  { label: "Cinematic trailer", prompt: "Epic cinematic orchestral trailer with powerful drums and soaring strings", genre: "cinematic", mood: "epic" },
  { label: "Lo-fi study beat", prompt: "Warm lo-fi hip-hop beat with mellow piano, vinyl crackle and soft drums", genre: "lofi", mood: "chill" },
  { label: "Uplifting EDM", prompt: "Uplifting festival EDM drop with big synths and driving four-on-the-floor kick", genre: "edm", mood: "uplifting" },
  { label: "Ambient dream", prompt: "Ethereal ambient soundscape with soft pads, gentle bells and airy textures", genre: "ambient", mood: "dreamy" },
  { label: "Retro synthwave", prompt: "80s synthwave with pulsing analog bass, gated snare and neon lead synths", genre: "synthwave", mood: "nostalgic" },
  { label: "Acoustic folk", prompt: "Warm acoustic folk with fingerpicked guitar, subtle strings and a hopeful feel", genre: "acoustic", mood: "hopeful" },
];

type GenState = "idle" | "loading" | "success" | "error";

function MusicStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMusic);

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [duration, setDuration] = useState<number>(20);
  const [state, setState] = useState<GenState>("idle");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated progress bar with realistic phased labels — fal.ai does not
  // stream progress for stable-audio, so we animate a smooth expectation
  // curve capped at 92% until the real response arrives.
  useEffect(() => {
    if (state !== "loading") {
      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = null;
      return;
    }
    setProgress(4);
    setProgressLabel("Sending your prompt to the AI…");
    const started = Date.now();
    // Rough expected total scales with duration (longer clips take longer).
    const expectedMs = 15_000 + duration * 900;
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(92, (elapsed / expectedMs) * 100);
      setProgress(pct);
      if (pct < 25) setProgressLabel("Sending your prompt to the AI…");
      else if (pct < 55) setProgressLabel("Composing your track…");
      else if (pct < 80) setProgressLabel("Rendering audio…");
      else setProgressLabel("Finalizing your mix…");
    }, 400);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [state, duration]);

  const cost = CREDIT_COST.music;
  const canAfford =
    !!profile && (isAdminEmail(profile.email) || profile.credits >= cost || profile.plan === "business");

  const hasPrompt = prompt.trim().length > 0;

  const applyExample = (e: (typeof EXAMPLES)[number]) => {
    setPrompt(e.prompt);
    if (e.genre) setGenre(e.genre);
    if (e.mood) setMood(e.mood);
  };

  const handleGenerate = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: undefined } });
      return;
    }
    if (!hasPrompt) {
      toast.error("Please describe the music you want.");
      return;
    }
    if (!canAfford) {
      toast.error(`Not enough credits. Music generation costs ${cost} credits.`);
      return;
    }
    setState("loading");
    setOutputUrl(null);
    setErrorMsg("");
    try {
      const res = await generate({
        data: {
          prompt: prompt.trim(),
          genre: (genre || undefined) as never,
          mood: (mood || undefined) as never,
          durationSeconds: duration,
        },
      });
      setProgress(100);
      setProgressLabel("Done");
      setOutputUrl(res.outputUrl);
      setState("success");
      refreshProfile();
      toast.success("Your track is ready.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Music generation failed.";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  };

  const handleDownload = async () => {
    if (!outputUrl) return;
    try {
      const res = await fetch(outputUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-music-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(outputUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link
          to="/studio"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← All studios
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-border bg-card p-2.5">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  AI Music <span className="text-primary">Studio</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate original instrumental tracks from a prompt.
                </p>
              </div>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Cost per track
            </div>
            <div className="text-lg font-bold">{cost} credits</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* ── LEFT: Controls ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Describe your track
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder="e.g. Warm lo-fi hip-hop beat with mellow piano, vinyl crackle and soft drums"
              className="mt-2 min-h-[110px] resize-none"
              disabled={state === "loading"}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Be specific: instruments, tempo, feel.</span>
              <span>{prompt.length}/1000</span>
            </div>

            {/* Examples */}
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Try an example
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e.label}
                    type="button"
                    onClick={() => applyExample(e)}
                    disabled={state === "loading"}
                    className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre */}
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Genre <span className="normal-case text-muted-foreground/70">(optional)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MUSIC_GENRES.map((g) => {
                  const active = genre === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(active ? "" : g)}
                      disabled={state === "loading"}
                      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                      } disabled:opacity-50`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood */}
            <div className="mt-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Mood <span className="normal-case text-muted-foreground/70">(optional)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MUSIC_MOODS.map((m) => {
                  const active = mood === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(active ? "" : m)}
                      disabled={state === "loading"}
                      className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                      } disabled:opacity-50`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Duration
                </div>
                <div className="text-sm font-semibold">{duration}s</div>
              </div>
              <Slider
                value={[duration]}
                min={5}
                max={47}
                step={1}
                onValueChange={([v]) => setDuration(v)}
                disabled={state === "loading"}
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>5s</span>
                <span>47s (max)</span>
              </div>
            </div>

            {/* Generate button */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={state === "loading" || !hasPrompt}
                className="flex-1"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate music · {cost} credits
                  </>
                )}
              </Button>
              {profile && (
                <div className="text-xs text-muted-foreground sm:text-right">
                  Balance: <span className="font-semibold text-foreground">{isAdminEmail(profile.email) ? "∞" : profile.credits.toLocaleString()}</span> credits
                </div>
              )}

            </div>
            {!user && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                <Link to="/auth" search={{ redirect: undefined }} className="text-primary hover:underline">Sign in</Link> to generate — new accounts get 40 free credits.
              </p>
            )}
          </section>

          {/* ── RIGHT: Output ──────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </h2>
              {outputUrl && state === "success" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Save className="h-3 w-3" /> Saved to history
                </span>
              )}
            </div>

            {state === "idle" && !outputUrl && (
              <EmptyState />
            )}

            {state === "loading" && <LoadingState progress={progress} label={progressLabel} />}

            {state === "error" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Generation failed</p>
                <p className="mt-1 text-xs">{errorMsg}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No credits were charged. You can adjust your prompt and try again.
                </p>
              </div>
            )}

            {state === "success" && outputUrl && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <audio
                    controls
                    src={outputUrl}
                    preload="metadata"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download MP3
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOutputUrl(null);
                      setState("idle");
                      setProgress(0);
                    }}
                  >
                    New track
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Also available anytime from{" "}
                  <Link to="/history" className="text-primary hover:underline">
                    your history
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
      <div className="rounded-full border border-border bg-background/60 p-3">
        <Music className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-3 text-sm font-semibold">Your track will play here</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Describe the vibe, pick a genre and mood, then hit Generate.
      </p>
    </div>
  );
}

function LoadingState({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-300"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Music generation usually takes 20–60 seconds. Please keep this tab open.
      </p>
    </div>
  );
}
