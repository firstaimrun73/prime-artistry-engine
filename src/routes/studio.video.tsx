/**
 * Motio2edit Video Studio — pixel-aligned mobile creative UI.
 * Mode tabs · style thumbnails · in-place player after generate · chatbot-style gen animation.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  Sparkles,
  Video,
  Image as ImageIcon,
  Film,
  X,
  Replace,
  Download,
  Share2,
  RotateCcw,
  Maximize2,
  Play,
  Volume2,
  MoreVertical,
  Clock,
  Monitor,
  Smartphone,
  Crown,
  SlidersHorizontal,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, isPaidPlan } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import {
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
import { getWelcomeFreeVideoStatus } from "@/lib/billing/welcome-free-video-status.functions";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  capabilitiesForMode,
  availableMaxDurationFor,
  promptMentionsAudio,
  applyVideoStyle,
  VIDEO_STYLE_MODIFIERS,
  type VideoGenMode,
  type VideoAspect,
  type VideoResolution,
  type VideoTier,
} from "@/lib/video-model-registry";
import {
  computeMotioVideoCredits,
  qualityFromResolution,
  allowedDurationsForTier,
} from "@/lib/motio-video-credits";
import {
  parsePromptTiming,
  validateTimingAgainstDuration,
} from "@/lib/video/prompt-timing";
import type { VideoStudioResult } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export const Route = createFileRoute("/studio/video")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      {
        name: "description",
        content: "Create amazing videos from text, image or video with Motio2edit.",
      },
    ],
  }),
  component: VideoStudioPage,
});

/* ── Style themes (visual thumbnails) ─────────────────────────── */
const STYLE_THEMES = [
  { id: "cinematic", label: "Cinematic", emoji: "🎬", gradient: "from-orange-600/80 via-amber-500/60 to-rose-900/80" },
  { id: "anime", label: "Anime", emoji: "✨", gradient: "from-pink-500/80 via-fuchsia-500/60 to-violet-700/80" },
  { id: "realistic", label: "Realistic", emoji: "🌄", gradient: "from-sky-500/80 via-cyan-400/50 to-emerald-700/80" },
  { id: "fantasy", label: "Fantasy", emoji: "🏰", gradient: "from-violet-500/80 via-purple-400/50 to-indigo-800/80" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🌃", gradient: "from-cyan-400/80 via-blue-500/50 to-fuchsia-700/80" },
] as const;

const GEN_MESSAGES = [
  "Understanding your scene…",
  "Composing the shot…",
  "Building motion paths…",
  "Lighting the frame…",
  "Rendering frames…",
  "Almost there…",
] as const;

function VideoStudioPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email ?? user?.email);
  const allowed = canAccessVideo({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });
  const paid = isPaidPlan(profile?.plan) || admin;

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("9:16");
  const [resolution, setResolution] = useState<VideoResolution>("1080p");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("cinematic");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const [eta, setEta] = useState(45);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);
  const [showMoreStyles, setShowMoreStyles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const generate = useServerFn(generateMedia);
  const welcomeStatus = useServerFn(getWelcomeFreeVideoStatus);

  const v2vUnavailable = mode === "video";
  const premiumLocked = !paid && !admin;

  useEffect(() => {
    if (!user) return;
    void welcomeStatus({})
      .then((s) => {
        if (s?.eligible) setWelcomeFree(true);
      })
      .catch(() => {});
  }, [user, welcomeStatus]);

  const caps = useMemo(() => capabilitiesForMode(tier), [tier]);
  const durations = useMemo(() => allowedDurationsForTier(tier), [tier]);
  const maxDur = useMemo(
    () => availableMaxDurationFor(tier, resolution, audioOn),
    [tier, resolution, audioOn],
  );
  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;

  useEffect(() => {
    if (duration > maxDur && maxDur > 0) setDuration(maxDur);
    else if (!durations.includes(duration) && durations.length > 0) setDuration(durations[0]);
  }, [maxDur, duration, durations]);

  useEffect(() => {
    if (caps.aspects.length && !caps.aspects.includes(aspect)) {
      setAspect((caps.aspects.find((a) => a === "9:16") ?? caps.aspects[0]) as VideoAspect);
    }
    if (caps.resolutions.length && !caps.resolutions.includes(resolution)) {
      setResolution(
        (caps.resolutions.find((r) => r === "1080p") ?? caps.resolutions[0]) as VideoResolution,
      );
    }
  }, [caps, aspect, resolution]);

  // Chatbot-style cycling messages while generating
  useEffect(() => {
    if (!busy) {
      setGenMsgIdx(0);
      return;
    }
    const t = window.setInterval(() => {
      setGenMsgIdx((i) => (i + 1) % GEN_MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(t);
  }, [busy]);

  const price = useMemo(() => {
    if (v2vUnavailable) {
      return {
        credits: 0,
        supported: false,
        reason: "Video to Video isn’t available yet.",
      };
    }
    return computeMotioVideoCredits({
      tier,
      durationSec: duration,
      quality: qualityFromResolution(resolution),
      soundOn: audioOn,
      mode,
      resolution,
      aspect,
    });
  }, [tier, duration, resolution, audioOn, mode, aspect, v2vUnavailable]);

  const creditsEstimate = price.supported ? price.credits : 0;

  const onModeChange = (m: VideoGenMode) => {
    if (busy) return;
    setMode(m);
    setResult(null);
    if (m === "text") {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceFile(null);
      setSourceUrl(null);
    }
    if (m === "video") {
      toast.message("Video to Video coming soon", {
        description: "Use Text to Video or Image to Video for now.",
      });
    }
  };

  const onPickSource = useCallback(
    (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (mode === "image" && !isImage) {
        toast.error("Choose an image file");
        return;
      }
      if (mode === "video" && !isVideo) {
        toast.error("Choose a video file");
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        toast.error("Max 40 MB");
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceFile(file);
      setSourceUrl(URL.createObjectURL(file));
      setResult(null);
    },
    [mode, sourceUrl],
  );

  const onClearSource = useCallback(() => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
  }, [sourceUrl]);

  const onGenerate = useCallback(async () => {
    if (!allowed && !welcomeFree) {
      toast.error("Upgrade to unlock Video Studio");
      navigate({ to: "/pricing" });
      return;
    }
    if (v2vUnavailable) {
      toast.error("Video to Video isn’t available yet.");
      return;
    }
    const p = prompt.trim();
    if (!p) {
      toast.error("Describe your video first");
      return;
    }
    if (mode === "image" && !sourceUrl) {
      toast.error("Upload a source image first");
      return;
    }
    if (!price.supported) {
      toast.error(price.reason || videoSelectionUnavailableMessage());
      return;
    }

    const timing = parsePromptTiming(p);
    if (timing.errors[0]) {
      toast.error(timing.errors[0]);
      return;
    }
    const timingErrs = validateTimingAgainstDuration(timing.cues, duration);
    if (timingErrs[0]) {
      toast.error(timingErrs[0]);
      return;
    }

    const selection = selectVideoModel({
      mode,
      tier,
      durationSec: duration,
      resolution,
      aspect,
      soundOn: audioOn,
    });
    if (!selection) {
      toast.error(videoSelectionUnavailableMessage());
      return;
    }

    setBusy(true);
    setResult(null);
    setGenMsgIdx(0);
    setEta(duration <= 5 ? 45 : duration <= 10 ? 75 : 110);
    startGeneration("video");

    try {
      let imageUrl: string | undefined;
      if (mode === "image" && sourceFile) {
        imageUrl = await fileToDataUrl(sourceFile);
      } else if (mode === "image" && sourceUrl?.startsWith("http")) {
        imageUrl = sourceUrl;
      }

      const styled = applyVideoStyle(p, styleId || null);
      const res = await generate({
        data: {
          type: "video",
          prompt: styled,
          imageUrl,
          videoDurationSeconds: duration,
          videoResolution: resolution,
          videoAspectRatio: aspect,
          videoStyleId: styleId || undefined,
          videoGenerateAudio: audioOn,
          sourceKind: mode === "image" ? "image" : undefined,
          studioTier: tier === "premium" ? "premium" : "standard",
        },
      });

      const outputUrl =
        (res as { outputUrl?: string })?.outputUrl ??
        (res as { url?: string })?.url ??
        null;
      if (!outputUrl) {
        throw new Error(
          (res as { error?: string })?.error || "Generation failed — no video returned",
        );
      }

      const charged =
        (res as { creditsCharged?: number })?.creditsCharged ??
        (res as { credits?: number })?.credits ??
        creditsEstimate;

      setResult({
        outputUrl,
        mode: mode === "image" ? "image" : "text",
        prompt: p,
        duration: (duration === 15 ? 15 : duration === 10 ? 10 : 5) as 5 | 10 | 15,
        aspect: (aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: resolution === "1080p" ? "1080p" : resolution === "480p" ? "480p" : "720p",
        size: resolution === "1080p" ? "large" : resolution === "720p" ? "medium" : "small",
        soundRequested: audioOn || promptMentionsAudio(p),
        creditsUsed: typeof charged === "number" ? charged : creditsEstimate,
        sourcePreview: sourceUrl,
      });
      toast.success("Video ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate video";
      toast.error(msg);
    } finally {
      setBusy(false);
      endGeneration();
    }
  }, [
    allowed,
    welcomeFree,
    v2vUnavailable,
    prompt,
    mode,
    sourceUrl,
    sourceFile,
    duration,
    aspect,
    resolution,
    tier,
    audioOn,
    styleId,
    price,
    creditsEstimate,
    generate,
    navigate,
  ]);

  const onDownload = useCallback(async () => {
    if (!result?.outputUrl) return;
    try {
      await triggerBrowserDownload(result.outputUrl, `motio2edit-video-${Date.now()}.mp4`);
    } catch {
      toast.error("Download failed");
    }
  }, [result]);

  const share = useCallback(async () => {
    if (!result?.outputUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Motio2edit Video", url: result.outputUrl });
      } else {
        await navigator.clipboard.writeText(result.outputUrl);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  }, [result]);

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6 bg-zinc-950 text-white">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-orange-500/30 bg-orange-500/10">
          <Video className="h-7 w-7 text-orange-400" />
        </div>
        <p className="text-center text-base font-semibold">Sign in to open Video Studio</p>
        <Button asChild className="rounded-full px-6 bg-gradient-to-r from-orange-500 to-amber-500">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!allowed && !welcomeFree) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6 bg-zinc-950 text-white">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <Lock className="h-7 w-7 text-amber-400" />
        </div>
        <p className="text-center text-lg font-semibold">Video Studio is on paid plans</p>
        <Button asChild className="rounded-full px-6 bg-gradient-to-r from-orange-500 to-amber-500">
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  const canGenerate =
    !busy &&
    !!prompt.trim() &&
    !v2vUnavailable &&
    price.supported &&
    (mode !== "image" || !!sourceUrl);

  const qualityLabel =
    resolution === "1080p" ? "HD 1080p" : resolution === "720p" ? "HD 720p" : "SD 480p";

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0f] text-white">
      {/* Soft orange ambient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 90% 40% at 50% -10%, rgba(249,115,22,0.14), transparent 60%)",
        }}
      />

      {/* ── Header ── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 px-3 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" asChild>
          <Link to="/studio" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-tight">
            Motio<span className="text-orange-400">2</span>edit
          </p>
          <p className="truncate text-[10px] text-zinc-500">Video Studio · Create Amazing Videos</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (premiumLocked) navigate({ to: "/pricing" });
            else setTier(tier === "premium" ? "standard" : "premium");
          }}
          className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-300"
        >
          <Sparkles className="h-3 w-3" /> AI+
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/pricing" })}
          className="grid h-8 w-8 place-items-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300"
          aria-label="Plans"
        >
          <Crown className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ── Scrollable body ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-36">
        {/* Mode tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
          {(
            [
              { id: "text" as const, label: "Text to Video", icon: Play },
              { id: "image" as const, label: "Image to Video", icon: ImageIcon },
              { id: "video" as const, label: "Video to Video", icon: Film },
            ] as const
          ).map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => onModeChange(m.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition",
                  active
                    ? "border-orange-400 bg-orange-500/15 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.25)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20",
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* ── Preview / Output frame ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl">
          {/* Generated result */}
          {result && !busy && (
            <>
              <div className="relative aspect-[9/16] max-h-[42dvh] w-full sm:aspect-video sm:max-h-[36dvh]">
                <video
                  ref={videoRef}
                  src={result.outputUrl}
                  className="h-full w-full object-cover"
                  playsInline
                  controls={false}
                  poster={result.sourcePreview ?? undefined}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) void v.play();
                    else v.pause();
                  }}
                  className="absolute inset-0 grid place-items-center"
                  aria-label="Play"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-black/40 backdrop-blur-sm">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </span>
                </button>
                <div className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                  Generated with <span className="text-orange-400">Motio2edit</span>
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                    {result.quality === "1080p" ? "HD" : result.quality === "720p" ? "HD" : "SD"}
                  </span>
                  <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                    0:{String(result.duration).padStart(2, "0")}
                  </span>
                </div>
              </div>
              {/* Mini controls under player */}
              <div className="flex items-center gap-2 border-t border-white/8 px-2.5 py-2">
                <div className="h-8 w-8 overflow-hidden rounded-md bg-zinc-800">
                  {result.sourcePreview ? (
                    <img src={result.sourcePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Video className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  )}
                </div>
                <button type="button" className="text-zinc-300" aria-label="Play">
                  <Play className="h-4 w-4 fill-current" />
                </button>
                <span className="text-[11px] tabular-nums text-zinc-400">
                  0:00 / 0:{String(result.duration).padStart(2, "0")}
                </span>
                <div className="flex-1" />
                <button type="button" className="text-zinc-400" aria-label="Volume">
                  <Volume2 className="h-4 w-4" />
                </button>
                <a
                  href={result.outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </a>
                <button type="button" className="text-zinc-400" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/8 px-2 py-2.5">
                <button
                  type="button"
                  onClick={() => void onDownload()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-1.5 text-[11px] font-bold"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <button
                  type="button"
                  onClick={() => void onGenerate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Another
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[11px] text-zinc-500"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </>
          )}

          {/* Chatbot-style generation animation */}
          {busy && (
            <div className="flex aspect-[9/16] max-h-[42dvh] w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 to-black sm:aspect-video sm:max-h-[36dvh]">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full border border-orange-400/40 bg-orange-500/10">
                  <Sparkles className="h-7 w-7 text-orange-400 animate-pulse" />
                </div>
              </div>
              <div className="max-w-[260px] space-y-2 px-4 text-center">
                <p className="text-sm font-semibold text-white transition-all duration-500">
                  {GEN_MESSAGES[genMsgIdx]}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:300ms]" />
                </div>
                <p className="text-[11px] text-zinc-500">
                  {aspect} · {qualityLabel} · ~{eta}s
                </p>
              </div>
            </div>
          )}

          {/* Empty / idle state — soft placeholder, no empty black box until generate */}
          {!result && !busy && (
            <div className="flex aspect-[9/16] max-h-[28dvh] w-full flex-col items-center justify-center gap-2 bg-zinc-900/50 sm:aspect-video sm:max-h-[24dvh]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <Video className="h-5 w-5 text-zinc-500" />
              </div>
              <p className="text-[12px] text-zinc-500">Your video will appear here</p>
            </div>
          )}
        </div>

        {/* Source upload when Image / Video mode */}
        {(mode === "image" || mode === "video") && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === "image" ? "image/*" : "video/*"}
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f) onPickSource(f);
              }}
            />
            {sourceUrl && sourceFile ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {sourceFile.type.startsWith("video/") ? (
                  <video src={sourceUrl} className="mx-auto max-h-24 w-full object-contain" muted playsInline />
                ) : (
                  <img src={sourceUrl} alt="Source" className="mx-auto max-h-24 w-full object-contain" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 px-2 py-1.5">
                  <p className="truncate text-[10px] text-zinc-300">{sourceFile.name}</p>
                  <div className="flex gap-1">
                    <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()} className="grid h-7 w-7 place-items-center rounded-full bg-white/10" aria-label="Replace">
                      <Replace className="h-3 w-3" />
                    </button>
                    <button type="button" disabled={busy} onClick={onClearSource} className="grid h-7 w-7 place-items-center rounded-full bg-white/10" aria-label="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || v2vUnavailable}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 py-3 text-[12px] text-zinc-400 hover:border-orange-400/40 hover:text-orange-200"
              >
                {mode === "image" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                {mode === "image" ? "Upload image to animate" : "Upload video (coming soon)"}
              </button>
            )}
          </div>
        )}

        {/* Prompt card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Describe your video
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, promptMax))}
              disabled={busy || v2vUnavailable}
              rows={3}
              maxLength={promptMax}
              placeholder={
                mode === "image"
                  ? "Describe how the image should move…"
                  : "A cinematic view of a lone astronaut standing on a mountain with a huge planet in the sky…"
              }
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 pr-10 text-[13px] leading-relaxed text-white placeholder:text-zinc-600 focus:border-orange-400/40 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              className="absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-400"
              aria-label="Advanced settings"
              onClick={() =>
                toast.message("Controls below", {
                  description: "Duration, quality and ratio are right under the styles.",
                })
              }
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-right text-[10px] tabular-nums text-zinc-600">
            {prompt.length}/{promptMax}
          </p>
        </div>

        {/* Style theme thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {STYLE_THEMES.map((s) => {
            const active = styleId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => setStyleId(s.id)}
                className={cn(
                  "flex w-[68px] shrink-0 flex-col items-center gap-1 transition",
                  busy && "opacity-50",
                )}
              >
                <div
                  className={cn(
                    "relative h-14 w-14 overflow-hidden rounded-xl border-2 bg-gradient-to-br",
                    s.gradient,
                    active ? "border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.35)]" : "border-transparent",
                  )}
                >
                  <span className="absolute inset-0 grid place-items-center text-xl opacity-90">
                    {s.emoji}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    active ? "text-orange-300" : "text-zinc-500",
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowMoreStyles((v) => !v)}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1"
          >
            <div className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/5">
              <LayoutGrid className="h-5 w-5 text-zinc-400" />
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">More</span>
          </button>
        </div>

        {showMoreStyles && (
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(VIDEO_STYLE_MODIFIERS)
              .filter((id) => !STYLE_THEMES.some((s) => s.id === id))
              .map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStyleId(id);
                    setShowMoreStyles(false);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize",
                    styleId === id
                      ? "border-orange-400 bg-orange-500/15 text-orange-200"
                      : "border-white/10 bg-white/5 text-zinc-400",
                  )}
                >
                  {id}
                </button>
              ))}
          </div>
        )}

        {/* Duration · Quality · Ratio */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const opts = durations.length ? durations : [5, 10, 15];
              const i = opts.indexOf(duration);
              setDuration(opts[(i + 1) % opts.length]);
            }}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-orange-400/30"
          >
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Clock className="h-3 w-3" /> Duration
            </span>
            <span className="flex w-full items-center justify-between text-[13px] font-bold">
              {duration}s <span className="text-zinc-600">›</span>
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const opts = (caps.resolutions.filter((r) =>
                ["480p", "720p", "1080p"].includes(r),
              ) as VideoResolution[]) || ["720p", "1080p"];
              const i = opts.indexOf(resolution);
              setResolution(opts[(i + 1) % opts.length] ?? "720p");
            }}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-orange-400/30"
          >
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Monitor className="h-3 w-3" /> Quality
            </span>
            <span className="flex w-full items-center justify-between text-[13px] font-bold">
              {qualityLabel} <span className="text-zinc-600">›</span>
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const opts = (caps.aspects.filter((a) =>
                ["16:9", "9:16", "1:1"].includes(a),
              ) as VideoAspect[]) || ["16:9", "9:16", "1:1"];
              const i = opts.indexOf(aspect);
              setAspect(opts[(i + 1) % opts.length] ?? "9:16");
            }}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-orange-400/30"
          >
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Smartphone className="h-3 w-3" /> Ratio
            </span>
            <span className="flex w-full items-center justify-between text-[13px] font-bold">
              {aspect} <span className="text-zinc-600">›</span>
            </span>
          </button>
        </div>

        {/* Credit estimate */}
        <p className="text-center text-[11px] text-zinc-500">
          {price.supported
            ? `~${creditsEstimate} credits · ${duration}s · ${qualityLabel} · ${aspect}`
            : price.reason}
        </p>
      </div>

      {/* ── Generate bar ── */}
      {!result && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#0a0a0f]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void onGenerate()}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold transition",
                canGenerate
                  ? "bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 text-white shadow-lg shadow-orange-500/30 active:scale-[0.98]"
                  : "cursor-not-allowed bg-white/10 text-zinc-500",
              )}
            >
              <Sparkles className="h-4 w-4" />
              {busy ? "Generating…" : "Generate Video"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
