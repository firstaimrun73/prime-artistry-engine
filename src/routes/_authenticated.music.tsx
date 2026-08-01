import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { isAdminEmail } from "@/lib/admin-config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_COST } from "@/lib/plans";
import { generateMusic, MUSIC_GENRES, MUSIC_MOODS } from "@/lib/music.functions";
import { toast } from "sonner";
import {
  Music as MusicIcon,
  Sparkles,
  Download,
  Loader2,
  Play,
  Pause,
  Share2,
  RotateCcw,
  Coins,
  Zap,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "AI Music — Generate Original Tracks | MOTIO2EDIT" },
      {
        name: "description",
        content:
          "Generate original AI music from a prompt. Pick instruments, mood, and duration. Preview instantly and download as MP3.",
      },
      { property: "og:title", content: "AI Music — MOTIO2EDIT" },
      {
        property: "og:description",
        content: "Generate original AI music tracks from a text prompt.",
      },
    ],
  }),
  component: MusicPage,
});

// ── Quick-pick chips (labels + emojis for the new colorful section) ────
type Chip = { key: string; label: string; emoji: string; promptAdd?: string };

const INSTRUMENTS: Chip[] = [
  { key: "guitar", label: "Guitar", emoji: "🎸", promptAdd: "acoustic and electric guitar as the lead instrument" },
  { key: "piano", label: "Piano", emoji: "🎹", promptAdd: "grand piano melody as the lead instrument" },
  { key: "drums", label: "Drums", emoji: "🥁", promptAdd: "prominent drum kit and percussion" },
  { key: "trumpet", label: "Trumpet", emoji: "🎺", promptAdd: "brass trumpet as the lead instrument" },
  { key: "violin", label: "Violin", emoji: "🎻", promptAdd: "expressive solo violin" },
  { key: "orchestral", label: "Orchestral", emoji: "🎵", promptAdd: "full orchestral arrangement with strings and brass" },
  { key: "vocal", label: "Vocal", emoji: "🎤", promptAdd: "with vocal harmonies" },
  { key: "electronic", label: "Electronic", emoji: "🎧", promptAdd: "electronic synths and modern production" },
  { key: "trailer", label: "Trailer", emoji: "🎬", promptAdd: "epic movie trailer style with rising tension" },
  { key: "wedding", label: "Wedding", emoji: "🎊", promptAdd: "romantic wedding ceremony style" },
  { key: "sad", label: "Sad", emoji: "😢", promptAdd: "melancholic and emotional" },
  { key: "energetic", label: "Energetic", emoji: "⚡", promptAdd: "high energy and driving rhythm" },
  { key: "calm", label: "Calm", emoji: "🧘", promptAdd: "calm, ambient and relaxing" },
  { key: "gaming", label: "Gaming", emoji: "🎮", promptAdd: "video game soundtrack style" },
];

const MOODS: { key: string; label: string }[] = [
  { key: "happy", label: "Happy" },
  { key: "sad", label: "Sad" },
  { key: "energetic", label: "Energetic" },
  { key: "calm", label: "Calm" },
  { key: "epic", label: "Epic" },
];

const DURATIONS = [
  { s: 15, label: "15s" },
  { s: 30, label: "30s" },
  { s: 60, label: "60s" },
  { s: 120, label: "2 min" },
];

const MUSIC_EXAMPLES = [
  "Wedding ceremony music",
  "Epic movie trailer",
  "Lo-fi study beats",
  "Gaming background music",
  "Meditation and calm",
  "Birthday celebration",
];

const LOADING_STEPS = [
  "Composing your melody...",
  "Adding instruments...",
  "Mixing your track...",
  "Finalizing your music...",
];

// Map a UI mood to the backend MUSIC_MOODS enum (best-effort match).
function mapMoodToBackend(m: string | null): (typeof MUSIC_MOODS)[number] | undefined {
  if (!m) return undefined;
  const set = new Set<string>(MUSIC_MOODS as readonly string[]);
  const lower = m.toLowerCase();
  if (set.has(lower)) return lower as (typeof MUSIC_MOODS)[number];
  if (lower === "happy") return "uplifting" as (typeof MUSIC_MOODS)[number];
  return undefined;
}

// Map a UI instrument chip to the backend MUSIC_GENRES enum when possible.
function mapInstrumentToGenre(k: string | null): (typeof MUSIC_GENRES)[number] | undefined {
  if (!k) return undefined;
  const set = new Set<string>(MUSIC_GENRES as readonly string[]);
  const table: Record<string, string> = {
    orchestral: "orchestral",
    trailer: "trailer",
    electronic: "electronic",
    gaming: "cinematic",
    wedding: "classical",
    piano: "classical",
    violin: "classical",
    trumpet: "jazz",
  };
  const mapped = table[k];
  if (mapped && set.has(mapped)) return mapped as (typeof MUSIC_GENRES)[number];
  return undefined;
}

// Enhance short prompts with instrument, mood, duration and quality descriptors.
function enhancePrompt(opts: {
  prompt: string;
  instrument: Chip | null;
  mood: string | null;
  duration: number;
}): string {
  const base = opts.prompt.trim();
  const parts: string[] = [];
  parts.push(
    base.length > 0
      ? `Create a professional, high quality music track: ${base}.`
      : "Create a professional, high quality music track.",
  );
  if (opts.instrument?.promptAdd) parts.push(`${opts.instrument.promptAdd}.`);
  if (opts.mood) parts.push(`${opts.mood} atmosphere.`);
  parts.push(`Approximately ${opts.duration} seconds long.`);
  parts.push("High audio quality, studio recording sound, clean mix, instrumental.");
  return parts.join(" ");
}

function MusicPage() {
  const { profile } = useAuth();
  const generate = useServerFn(generateMusic);

  const [prompt, setPrompt] = useState("");
  const [instrument, setInstrument] = useState<Chip | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [bpm, setBpm] = useState<number>(120);
  const [tier, setTier] = useState<"lite" | "pro">("pro");
  const [customDuration, setCustomDuration] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingStart, setLoadingStart] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showRestore, setShowRestore] = useState<null | { prompt?: string; instrument?: Chip | null; mood?: string | null; duration?: number; bpm?: number; tier?: "lite" | "pro"; audioUrl?: string | null; customDuration?: boolean }>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cost = tier === "lite" ? CREDIT_COST.music_lite : CREDIT_COST.music;
  const isAdmin = isAdminEmail(profile?.email);
  const credits = profile?.credits ?? 0;
  const insufficient = !isAdmin && credits < cost;

  useEffect(() => {
    if (!loading) return;
    setNow(Date.now());
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
      setNow(Date.now());
    }, 1000);
    const stepId = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2000);
    return () => {
      clearInterval(id);
      clearInterval(stepId);
    };
  }, [loading]);

  // Pre-fill prompt from Studio sample clicks (sessionStorage bridge).
  // Restore session: read localStorage but ASK before applying so users can start fresh.
  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("prefill-prompt");
      if (pre) {
        setPrompt(pre);
        sessionStorage.removeItem("prefill-prompt");
      }
      const raw = localStorage.getItem("motio2edit-music-session");
      if (raw) {
        const s = JSON.parse(raw);
        const hasSomething =
          (typeof s.prompt === "string" && s.prompt.length > 0) ||
          s.instrument || s.mood || s.audioUrl;
        if (!pre && hasSomething) setShowRestore(s);
      }
    } catch { /* ignore */ }
  }, []);

  function applyRestore() {
    const s = showRestore;
    if (!s) return;
    if (typeof s.prompt === "string") setPrompt(s.prompt);
    if (s.instrument) setInstrument(s.instrument);
    if (typeof s.mood === "string") setMood(s.mood);
    if (typeof s.duration === "number") setDuration(s.duration);
    if (typeof s.bpm === "number") setBpm(s.bpm);
    if (s.tier === "lite" || s.tier === "pro") setTier(s.tier);
    if (typeof s.audioUrl === "string") setAudioUrl(s.audioUrl);
    if (typeof s.customDuration === "boolean") setCustomDuration(s.customDuration);
    setShowRestore(null);
  }
  function dismissRestore() {
    setShowRestore(null);
    try { localStorage.removeItem("motio2edit-music-session"); } catch { /* ignore */ }
  }

  // Persist every change so the workspace is restored on next visit.
  useEffect(() => {
    try {
      localStorage.setItem(
        "motio2edit-music-session",
        JSON.stringify({ prompt, instrument, mood, duration, bpm, tier, audioUrl, customDuration }),
      );
    } catch { /* ignore */ }
  }, [prompt, instrument, mood, duration, bpm, tier, audioUrl, customDuration]);




  const isFree = (profile?.plan ?? "free") === "free";
  const filename = (() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `${isFree ? "motio2edit-free-" : ""}motio2edit-${stamp}.mp3`;
    return base;
  })();

  async function onGenerate() {
    if (loading) return;
    if (insufficient) {
      toast.error(`Not enough credits. Music generation costs ${cost} credits. Buy credits or upgrade your plan.`);
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setLoadingStart(Date.now());
    setNow(Date.now());
    setAudioUrl(null);
    setPlaying(false);
    toast("🎵 Composing your music...");
    startGeneration("music", "/music");
    try {
      const enhanced = `${enhancePrompt({ prompt, instrument, mood, duration })} Tempo around ${bpm} BPM.`;
      const backendMood = mapMoodToBackend(mood);
      const backendGenre = mapInstrumentToGenre(instrument?.key ?? null);
      const res = await generate({
        data: {
          prompt: enhanced,
          durationSeconds: duration,
          tier,
          ...(backendGenre ? { genre: backendGenre } : {}),
          ...(backendMood ? { mood: backendMood } : {}),
        },
      });
      setAudioUrl(res.outputUrl);
      toast.success("✅ Music ready!");

      // Save the finished track to the user's music history.
      if (profile?.id && res.outputUrl) {
        const { error: saveErr } = await supabase.from("music_history").insert({
          user_id: profile.id,
          track_title: `Track ${new Date().toLocaleDateString("en-IN")}`,
          prompt,
          genre: backendGenre ?? null,
          mood: backendMood ?? null,
          bpm,
          duration,
          audio_url: res.outputUrl,
        });
        if (saveErr) {
          console.error("[music] history save failed:", saveErr.message);
        } else {
          toast.success("🎵 Track saved to history!");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? `❌ ${err.message}` : "❌ Failed. Credits not charged.";
      toast.error(msg);
    } finally {
      setLoading(false);
      endGeneration();
    }
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  async function onDownload() {
    if (!audioUrl) return;
    try {
      const resp = await fetch(audioUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the track. Try again.");
    }
  }

  async function onShare() {
    if (!audioUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MOTIO2EDIT — AI Music", url: audioUrl });
      } else {
        await navigator.clipboard.writeText(audioUrl);
        toast.success("Track link copied to clipboard.");
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {/* Header block with orange→purple gradient accent — music section only */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              background:
                "radial-gradient(600px circle at 15% 20%, rgba(249,115,22,0.35), transparent 60%), radial-gradient(600px circle at 85% 80%, rgba(168,85,247,0.35), transparent 60%)",
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-lg">
                <MusicIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  AI Music
                </h1>
                <p className="text-sm text-muted-foreground">
                  Powered by Motion2AI. Every generation costs{" "}
                  <span className="font-semibold text-foreground">{cost} credits</span>.
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                  Motion2AI can make mistakes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Coins className="h-3.5 w-3.5 text-primary" />
              {isAdmin ? "∞ credits" : `${credits} credits`}
            </div>
          </div>
        </div>

        {/* Prompt input */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          {/* Audio quality: Standard (Stable Audio, 50cr) vs High Quality (100cr) */}
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold">Describe your track</label>
            <div className="inline-flex rounded-full border border-border bg-background/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setTier("lite")}
                title="Stable Audio — faster, lower cost"
                className={
                  "flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition " +
                  (tier === "lite"
                    ? "bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Zap className="h-3 w-3" /> Standard · {CREDIT_COST.music_lite}
              </button>
              <button
                type="button"
                onClick={() => setTier("pro")}
                title="Studio-grade model — richest detail and mix"
                className={
                  "flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition " +
                  (tier === "pro"
                    ? "bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Crown className="h-3 w-3" /> High Quality · {CREDIT_COST.music}
              </button>
            </div>
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            {tier === "lite"
              ? "Standard — fast generation, MP3 44.1 kHz."
              : "High Quality — studio-grade detail and mix, MP3 44.1 kHz."}
          </p>

          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Energetic guitar music for wedding" · "Sad piano melody 30 seconds" · "Epic trailer music with drums" · Any language supported'
              rows={3}
              className="resize-none pr-12"
            />
            <div className="absolute right-2 top-2">
              <VoiceInputButton
                disabled={loading}
                onTranscript={(t) => setPrompt((p) => (p ? `${p} ${t}` : t))}
              />
            </div>
          </div>
          <div
            className={
              "mt-1.5 text-right text-xs " +
              (prompt.length > 900 ? "font-semibold text-destructive" : "text-muted-foreground")
            }
          >
            {prompt.length > 900
              ? `Prompt too long, will be trimmed to 900 · ${prompt.length}/900`
              : `${prompt.length}/900 characters`}
          </div>

          {/* Example prompts */}
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Try an example
            </div>
            <div className="flex flex-wrap gap-2">
              {MUSIC_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="btn-animate rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>


          {/* Instrument / genre chips */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instruments & vibes
            </div>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((c) => {
                const active = instrument?.key === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setInstrument(active ? null : c)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                        : "border-border bg-background hover:border-primary/40")
                    }
                  >
                    <span className="mr-1">{c.emoji}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mood
            </div>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const active = mood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMood(active ? null : m.key)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                        : "border-border bg-background hover:border-primary/40")
                    }
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BPM */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Tempo</span>
              <span className="tabular-nums text-foreground">{bpm} BPM</span>
            </div>
            <Slider
              min={60}
              max={180}
              step={1}
              value={[bpm]}
              onValueChange={(v) => setBpm(v[0] ?? 120)}
            />
          </div>

          {/* Duration — presets + Custom */}
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duration
            </div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => {
                const active = !customDuration && duration === d.s;
                return (
                  <button
                    key={d.s}
                    type="button"
                    onClick={() => { setCustomDuration(false); setDuration(d.s); }}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                        : "border-border bg-background hover:border-primary/40")
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCustomDuration(true)}
                className={
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition " +
                  (customDuration
                    ? "border-transparent bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow"
                    : "border-border bg-background hover:border-primary/40")
                }
              >
                Custom
              </button>
              {customDuration && (
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={duration}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isFinite(v)) setDuration(Math.max(5, Math.min(180, v)));
                  }}
                  placeholder="Enter seconds"
                  className="w-32 rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                />
              )}
            </div>
          </div>


          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {cost} credits per generation · credits refunded on failure
            </div>
            <Button
              onClick={onGenerate}
              disabled={loading || insufficient}
              className="bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Composing…
                </>
              ) : (
                <>
                  <MusicIcon className="mr-2 h-4 w-4" />
                  Generate music
                </>
              )}
            </Button>
          </div>

          {insufficient && (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              Not enough credits. Music generation costs {cost} credits.{" "}
              <Link to="/pricing" className="font-semibold text-primary underline">
                Buy credits or upgrade your plan
              </Link>
              .
            </div>
          )}
        </section>

        {/* Loading: progress bar + spinning vinyl + rotating messages + timer */}
        {loading && (() => {
          const elapsedMs = Math.max(0, now - loadingStart);
          const elapsedS = Math.floor(elapsedMs / 1000);
          const mm = Math.floor(elapsedS / 60).toString().padStart(2, "0");
          const ss = (elapsedS % 60).toString().padStart(2, "0");
          // Estimate: lite ~15s, pro ~30s baseline; asymptote to 95% until real completion.
          const estimate = tier === "lite" ? 20 : 35;
          const pct = Math.min(95, (elapsedS / estimate) * 95);
          return (
            <section className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center">
                <div
                  className="relative h-24 w-24 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 shadow-inner"
                  style={{ animation: "vinyl-spin 2s linear infinite" }}
                >
                  <div className="absolute inset-2 rounded-full border border-neutral-600" />
                  <div className="absolute inset-4 rounded-full border border-neutral-600" />
                  <div className="absolute inset-6 rounded-full border border-neutral-600" />
                  <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-500 to-purple-600" />
                </div>
              </div>
              <div className="mt-4 text-base font-semibold">{LOADING_STEPS[loadingStep]}</div>
              <div className="mt-3 mx-auto h-2 w-full max-w-[400px] overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-purple-600 transition-[width] duration-1000 ease-out animate-pulse"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground mx-auto max-w-[400px]">
                <span className="tabular-nums">{mm}:{ss}</span>
                <span>~{estimate} seconds</span>
              </div>
              <style>{`@keyframes vinyl-spin { to { transform: rotate(360deg); } }`}</style>
            </section>
          );
        })()}

        {/* Restore-previous-session prompt */}
        {showRestore && (
          <section className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Restore previous session?</div>
                <div className="text-xs text-muted-foreground">
                  We saved your last prompt, settings{showRestore.audioUrl ? " and generated track" : ""}.
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={dismissRestore}>No, start fresh</Button>
                <Button size="sm" onClick={applyRestore} className="bg-gradient-to-r from-orange-500 to-purple-600 text-white">Yes, restore</Button>
              </div>
            </div>
          </section>
        )}


        {audioUrl && !loading && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 text-white">
                <MusicIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Your track is ready</div>
                <div className="text-xs text-muted-foreground">{duration} seconds · {isFree ? "free plan (watermarked filename)" : "clean download"}</div>
              </div>
            </div>

            {/* Simple waveform-style visual accent (CSS only) */}
            <div className="mb-4 flex h-14 items-end gap-1 overflow-hidden rounded-lg bg-background/60 px-3 py-2">
              {Array.from({ length: 48 }).map((_, i) => {
                const h = 20 + Math.abs(Math.sin(i * 0.9) * 70);
                return (
                  <span
                    key={i}
                    className="w-1 rounded-sm bg-gradient-to-t from-orange-500 to-purple-500"
                    style={{ height: `${h}%`, opacity: playing ? 1 : 0.6 }}
                  />
                );
              })}
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              controls
              className="w-full"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={togglePlay}>
                {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button variant="secondary" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download MP3
              </Button>
              <Button variant="secondary" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                onClick={onGenerate}
                disabled={loading || insufficient}
                className="bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Regenerate ({cost} credits)
              </Button>
            </div>
          </section>
        )}
        <EditorDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
