import type { ReactNode, ChangeEvent } from "react";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  ArrowUp,
  Paperclip,
  X,
  Download,
  Loader2,
  Lock,
  Share2,
  Mic,
  Wand2,
  Settings2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { type StudioTier } from "@/lib/studio/studio-tier";
import { generateMedia } from "@/lib/generate.functions";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import {
  startGeneration,
  setGenerationStage,
  completeGeneration,
  failGeneration,
  endGeneration,
  useInFlightStageAdvance,
} from "@/lib/generation-status";
import { toast } from "sonner";
import {
  resolveVideoDuration,
  autoImageQuality,
  inferAspectFromPrompt,
  upgradePathForTier,
  type QualityStep,
} from "@/lib/studio/auto-settings";
import type { ImageQuality } from "@/lib/quality-options";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      { name: "description", content: "Create images, video, and music with Motio2edit." },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

type AttachedItem = { id: string; file: File; preview: string };

type ConversationItem =
  | { id: string; role: "user"; text: string; previews?: string[] }
  | { id: string; role: "assistant"; kind: "image" | "video"; prompt: string; url: string; watermarked: boolean };

const VIDEO_ASPECTS = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS_STANDARD = [5, 10] as const;
const VIDEO_DURATIONS_PREMIUM = [5, 10, 15] as const;
const IMAGE_ASPECTS = ["1:1", "4:3", "16:9", "9:16", "3:4"] as const;
const MAX_FILE_MB = 12;
const MAX_ATTACH_FREE = 5;
const MAX_ATTACH_PAID = 10;

const ROTATING_SUGGESTIONS = [
  "Create something new.",
  "Restore your old picture.",
  "Turn an ordinary photo into something extraordinary.",
  "Create a cinematic masterpiece.",
  "Bring your imagination to life.",
  "Transform a portrait into studio lighting.",
  "Make a product photo look premium.",
  "Generate a serene landscape at golden hour.",
  "Design a dramatic cinematic video scene.",
  "Compose an uplifting instrumental track.",
] as const;

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <UnifiedAiStudio />;
}

function UnifiedAiStudio() {
  const { profile, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateMedia);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const paid = admin || isPaidPlan(plan);
  const free = !paid;
  const videoOk = admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<StudioMode>("image");
  const [tier, setTier] = useState<StudioTier>("standard");
  const [prompt, setPrompt] = useState("");
  const [attached, setAttached] = useState<AttachedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [videoAspect, setVideoAspect] = useState<string>("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [imageQuality, setImageQuality] = useState<ImageQuality>("sd");
  const [qualityStep, setQualityStep] = useState<QualityStep>("standard");
  const [autoReason, setAutoReason] = useState<string | null>("Lowest suitable settings");
  const [durationNote, setDurationNote] = useState<string | null>(null);

  const videoDurations = useMemo(() => (tier === "standard" ? VIDEO_DURATIONS_STANDARD : VIDEO_DURATIONS_PREMIUM), [tier]);

  useEffect(() => {
    if (autoMode) return;
    if (!videoDurations.includes(videoDuration as (typeof videoDurations)[number])) setVideoDuration(videoDurations[0] ?? 5);
  }, [videoDurations, videoDuration, autoMode]);

  useEffect(() => {
    if (!autoMode) return;
    if (mode === "video") {
      const resolved = resolveVideoDuration(prompt, tier);
      setVideoDuration(resolved.selectedSec);
      setDurationNote(resolved.note);
      setAutoReason(resolved.requestedSec != null ? (resolved.exactMatch ? `Auto · ${resolved.selectedSec}s from your prompt` : `Auto · nearest ${resolved.selectedSec}s`) : `Auto · ${resolved.selectedSec}s default for this prompt`);
      const inferred = inferAspectFromPrompt(prompt, "video");
      if (inferred) setVideoAspect(inferred);
    } else if (mode === "image") {
      const q = autoImageQuality(prompt, tier);
      setImageQuality(q.quality);
      setQualityStep(q.step);
      setAutoReason(q.reason);
      setDurationNote(null);
      const inferred = inferAspectFromPrompt(prompt, "image");
      if (inferred) setImageAspect(inferred);
    } else {
      setAutoReason("Auto · Standard music defaults");
      setDurationNote(null);
    }
  }, [autoMode, prompt, tier, mode]);

  useEffect(() => {
    if (prompt.trim()) return;
    const id = window.setInterval(() => setSuggestionIdx((i) => (i + 1) % ROTATING_SUGGESTIONS.length), 5000);
    return () => window.clearInterval(id);
  }, [prompt]);

  const modeLocked = (mode === "video" && !videoOk) || (mode === "music" && !musicOk);
  const multiBlocked = free && attached.length > 1;
  const tierBlocked = free && tier !== "standard";
  const needsUpgrade = modeLocked || multiBlocked || tierBlocked;
  const credits = profile?.credits ?? 0;
  const maxAttach = paid ? MAX_ATTACH_PAID : MAX_ATTACH_FREE;

  useInFlightStageAdvance(busy && mode === "image");
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items, busy, statusText]);
  useEffect(() => () => { recognitionRef.current?.stop(); attached.forEach((a) => URL.revokeObjectURL(a.preview)); }, []);

  const rotatingHint = ROTATING_SUGGESTIONS[suggestionIdx % ROTATING_SUGGESTIONS.length];
  const placeholder = mode === "image" ? (attached.length > 0 ? "Describe the change you want…" : rotatingHint) : mode === "video" ? "Describe a video scene…" : "Describe a song or instrumental…";

  const clearAllAttachments = useCallback(() => {
    setAttached((prev) => { prev.forEach((a) => URL.revokeObjectURL(a.preview)); return []; });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const removeAttachment = (id: string) => {
    setAttached((prev) => {
      const hit = prev.find((a) => a.id === id);
      if (hit) URL.revokeObjectURL(hit.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: AttachedItem[] = [];
    const maxMb = mode === "video" ? 50 : MAX_FILE_MB;
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (mode === "image" && !isImage) { toast.error("Image Studio accepts images only."); continue; }
      if (mode === "video" && !isImage && !isVideo) { toast.error("Video Studio accepts one image or one video."); continue; }
      if (mode === "music" && !isImage && !isVideo) { toast.error("Music Studio accepts image or video references only when supported."); continue; }
      if (file.size > maxMb * 1024 * 1024) { toast.error(`Each file must be under ${maxMb}MB`); continue; }
      next.push({ id: `${Date.now()}-${i}-${file.name}`, file, preview: URL.createObjectURL(file) });
    }
    setAttached((prev) => {
      if (mode === "video") {
        if (next.length > 1) toast.message("Video Studio uses one reference at a time.");
        return next.length ? [next[0]] : prev.slice(0, 1);
      }
      const merged = [...prev, ...next].slice(0, maxAttach);
      if (prev.length + next.length > maxAttach) toast.message(`Up to ${maxAttach} files`);
      return merged;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const onAttachClick = () => {
    if (mode === "video" && !videoOk) { navigate({ to: "/pricing" }); return; }
    if (mode === "music" && !musicOk) { navigate({ to: "/pricing" }); return; }
    fileRef.current?.click();
  };

  const selectTier = (t: StudioTier) => {
    if (free && t !== "standard") {
      try { sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt, mode, experience: t, aspectRatio: mode === "video" ? videoAspect : imageAspect, duration: videoDuration })); } catch {}
      navigate({ to: upgradePathForTier(t) as any });
      return;
    }
    setTier(t);
  };

  const selectMode = (m: StudioMode) => {
    setMode(m);
    setAttached((prev) => {
      if (m === "image") return prev.filter((a) => a.file.type.startsWith("image/")).slice(0, maxAttach);
      if (m === "video") {
        const ok = prev.find((a) => a.file.type.startsWith("image/") || a.file.type.startsWith("video/"));
        return ok ? [ok] : [];
      }
      return prev.filter((a) => a.file.type.startsWith("image/") || a.file.type.startsWith("video/")).slice(0, maxAttach);
    });
    if (m !== "image" && tier === "premium") setTier("pro");
  };

  const onPrimaryClick = async () => {
    if (busy) return;
    if (needsUpgrade) {
      const target = tierBlocked ? upgradePathForTier(tier) : modeLocked ? "/pricing?highlight=lite" : "/pricing";
      try { sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt: prompt.trim() || undefined, mode, experience: tier, aspectRatio: mode === "video" ? videoAspect : imageAspect, duration: videoDuration })); } catch {}
      navigate({ to: target as any });
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed && mode === "image" && attached.length === 0) { toast.error("Enter a prompt or attach an image."); return; }
    if (!user) { navigate({ to: "/auth" }); return; }
    if (mode === "music") {
      if (!trimmed) { toast.error("Describe the song or instrumental you want."); return; }
      try { sessionStorage.setItem("motio2edit-preset", JSON.stringify({ prompt: trimmed, mode: "music", experience: tier })); } catch {}
      toast.message("Opening Music Studio with your prompt.");
      navigate({ to: "/music" });
      return;
    }
    setBusy(true);
    setLastError(null);
    setStatusText("Working…");
    startGeneration(mode === "video" ? "video" : "image", "/studio");
    setItems((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", text: trimmed || (mode === "video" ? "(video)" : "(edit image)"), previews: attached.map((a) => a.preview) }]);
    try {
      let imageUrl: string | undefined;
      const primary = attached[0];
      if (primary) {
        setStatusText("Uploading…");
        setGenerationStage("PREPARING");
        imageUrl = await uploadToStorage(primary.file, profile?.id ?? user.id ?? "anon");
        if (!imageUrl?.startsWith("https://")) throw new Error("Upload failed. Try a smaller file.");
      }
      setStatusText("Generating…");
      setGenerationStage("GENERATING");
      if (mode === "video") {
        const resolved = resolveVideoDuration(trimmed, tier);
        if (resolved.note && !resolved.exactMatch) toast.message(resolved.note, { description: `Using ${resolved.selectedSec}s` });
        const res = (await generate({ data: { type: "video", prompt: trimmed || "Cinematic scene", imageUrl: imageUrl ?? null, videoAspect: videoAspect, videoDuration: resolved.selectedSec, videoProductMode: tier === "standard" ? "standard" : "premium", videoMode: imageUrl ? "image-to-video" : "text-to-video", studioTier: tier === "standard" ? "standard" : "pro" } })) as { outputUrl?: string; url?: string; error?: string; message?: string };
        const outputUrl = res?.outputUrl || res?.url;
        if (!outputUrl || typeof outputUrl !== "string" || !outputUrl.startsWith("http")) throw new Error(res?.message || res?.error || "No video returned.");
        completeGeneration();
        setItems((prev) => [...prev, { id: `${Date.now()}-a`, role: "assistant", kind: "video", prompt: trimmed || "(video)", url: outputUrl, watermarked: free }]);
      } else {
        const multiUrls: string[] = [];
        if (attached.length > 1) {
          for (const a of attached.slice(1)) {
            const u = await uploadToStorage(a.file, profile?.id ?? user.id ?? "anon");
            if (u?.startsWith("https://")) multiUrls.push(u);
          }
        }
        const res = (await generate({ data: { type: "image", prompt: trimmed || "Enhance this image", imageUrl: imageUrl ?? null, imageUrls: multiUrls.length ? multiUrls : null, referenceImageUrls: multiUrls.length ? multiUrls : null, aspectRatio: imageAspect, studioTier: tier, imageQuality } })) as { outputUrl?: string; url?: string; error?: string; message?: string };
        const outputUrl = res?.outputUrl || res?.url;
        if (!outputUrl || typeof outputUrl !== "string" || !outputUrl.startsWith("http")) throw new Error(res?.message || res?.error || "No image returned.");
        completeGeneration();
        setItems((prev) => [...prev, { id: `${Date.now()}-a`, role: "assistant", kind: "image", prompt: trimmed || "(edit)", url: outputUrl, watermarked: free }]);
      }
      setStatusText(null);
      setPrompt("");
      clearAllAttachments();
      toast.success("Done");
      try { await refreshProfile?.(); } catch {}
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      failGeneration(message);
      setLastError(message);
      setStatusText(null);
      toast.error(message);
    } finally {
      setBusy(false);
      setTimeout(() => endGeneration(), 800);
    }
  };

  const empty = items.length === 0 && !busy;

  const shareResult = async (url: string) => {
    try {
      if (navigator.share) await navigator.share({ url, title: "Motio2edit" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-3 sm:px-4">
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Studio</h1>
            <button type="button" onClick={() => navigate({ to: "/profile" })} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums">
              <Coins className="h-3 w-3 text-amber-500" />
              {credits.toLocaleString()}
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
            {([{ id: "image" as const, icon: ImageIcon, label: "Image Studio", ok: true }, { id: "video" as const, icon: Video, label: "Video Studio", ok: videoOk }, { id: "music" as const, icon: Music, label: "Music Studio", ok: musicOk }] as const).map(({ id, icon: Icon, label, ok }) => {
              const active = mode === id;
              return (
                <button key={id} type="button" onClick={() => { if (!ok) { navigate({ to: "/pricing" }); return; } selectMode(id); }} className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm", active ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground", !ok && "opacity-60")}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  {!ok && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {empty && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{mode === "image" ? "Create something new" : mode === "video" ? "Create a cinematic scene" : "Compose your sound"}</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">{mode === "image" ? "Type a prompt or attach a photo to edit." : mode === "video" ? "Describe the scene. Attach a still for image-to-video." : "Describe a song, instrumental, or soundtrack."}</p>
              <button type="button" className="mt-4 text-sm font-medium text-primary hover:underline" onClick={() => setPrompt(ROTATING_SUGGESTIONS[suggestionIdx] ?? "Create something new.")}>Try: “{ROTATING_SUGGESTIONS[suggestionIdx]}”</button>
            </div>
          )}

          {items.map((it) =>
            it.role === "user" ? (
              <div key={it.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-3 py-2 text-sm text-foreground">
                  {it.previews && it.previews.length > 0 && (<div className="mb-2 flex flex-wrap gap-1.5">{it.previews.map((p) => (<img key={p} src={p} alt="" className="h-12 w-12 rounded-lg object-cover" />))}</div>)}
                  <p>{it.text}</p>
                </div>
              </div>
            ) : (
              <div key={it.id} className="flex justify-start">
                <div className="max-w-[92%] overflow-hidden rounded-2xl rounded-bl-md border border-border bg-card">
                  <div className="relative">
                    {it.kind === "video" ? (<video src={it.url} controls playsInline className="max-h-[420px] w-full bg-muted/20" />) : (<img src={it.url} alt="Result" className="max-h-[420px] w-full object-contain bg-muted/20" />)}
                    {it.watermarked && (<span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">Motio2edit · Free</span>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5">
                    <a href={it.url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-secondary"><Download className="h-3.5 w-3.5" /> Download</a>
                    <button type="button" onClick={() => void shareResult(it.url)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-secondary"><Share2 className="h-3.5 w-3.5" /> Share</button>
                  </div>
                </div>
              </div>
            ),
          )}

          {lastError && (<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{lastError}</div>)}
          {busy && statusText && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{statusText}</div>)}
          <div ref={bottomRef} />
        </div>

        <div className="mt-auto pt-3">
          {attached.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attached.map((a) => (
                <div key={a.id} className="relative">
                  <img src={a.preview} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                  <button type="button" onClick={() => removeAttachment(a.id)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow ring-1 ring-border" aria-label="Remove" disabled={busy}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          <div className={cn("rounded-2xl border shadow-lg backdrop-blur-xl transition-all duration-300", "bg-card/70 supports-[backdrop-filter]:bg-card/55", tier === "standard" && "border-amber-400/30", tier === "pro" && "border-orange-400/40", tier === "premium" && "border-[#D4AF37]/40")}>
            {autoMode && autoReason && (
              <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                <Wand2 className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground/80">Auto selected</span>
                <span className="text-border">·</span>
                <span className="truncate">{autoReason}</span>
                {mode === "video" && (<span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{videoDuration}s</span>)}
              </div>
            )}
            {durationNote && mode === "video" && (<div className="border-b border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">{durationNote}</div>)}

            <div className="flex items-end gap-1.5 p-2">
              <button type="button" onClick={onAttachClick} disabled={busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Attach"><Paperclip className="h-5 w-5" /></button>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onPrimaryClick(); } }} placeholder={placeholder} rows={2} disabled={busy} className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70" />
              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={() => { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) { toast.message("Voice input is not supported in this browser."); return; } if (listening) { recognitionRef.current?.stop(); setListening(false); return; } const rec = new SR(); rec.continuous = false; rec.interimResults = false; rec.onresult = (ev: any) => { const t = ev.results?.[0]?.[0]?.transcript; if (t) setPrompt((p) => (p ? p + " " + t : t)); setListening(false); }; rec.onerror = () => setListening(false); rec.onend = () => setListening(false); recognitionRef.current = rec; setListening(true); rec.start(); }} className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition", listening ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:bg-secondary hover:text-foreground")} aria-label="Microphone"><Mic className={cn("h-5 w-5", listening && "animate-pulse")} /></button>
                <button type="button" onClick={() => setShowSettings((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Settings"><Settings2 className="h-5 w-5" /></button>
                <button type="button" onClick={() => void onPrimaryClick()} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50" aria-label="Generate">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}</button>
              </div>
            </div>

            {showSettings && (
              <div className="border-t border-border/50 px-3 py-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <button type="button" onClick={() => setAutoMode(true)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", autoMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>Auto</button>
                  <button type="button" onClick={() => setAutoMode(false)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", !autoMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>Manual</button>
                </div>
                {!autoMode && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(["standard", "pro", "premium"] as StudioTier[]).map((t) => {
                        const locked = free && t !== "standard";
                        return (<button key={t} type="button" onClick={() => selectTier(t)} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", tier === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground", locked && "opacity-70")}>{t === "standard" ? "Standard" : t === "pro" ? "Premium" : "Ultra AI"}{locked && <Lock className="h-3 w-3" />}</button>);
                      })}
                    </div>
                    {mode === "image" && (<div className="flex flex-wrap gap-1.5">{IMAGE_ASPECTS.map((a) => (<button key={a} type="button" onClick={() => setImageAspect(a)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", imageAspect === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{a}</button>))}</div>)}
                    {mode === "video" && videoOk && (<><div className="flex flex-wrap gap-1.5">{VIDEO_ASPECTS.map((a) => (<button key={a} type="button" onClick={() => setVideoAspect(a)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", videoAspect === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{a}</button>))}</div><div className="flex flex-wrap gap-1.5">{videoDurations.map((d) => (<button key={d} type="button" onClick={() => setVideoDuration(d)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", videoDuration === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{d}s</button>))}</div></>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <input ref={fileRef} type="file" accept={mode === "image" ? "image/*" : "image/*,video/*"} multiple={mode === "image" || mode === "music"} className="hidden" aria-hidden onChange={onFileChange} />
      </main>
    </div>
  );
}
