/**
 * Motio2edit Video Studio — advanced auto-detect creative workspace.
 * No mode toggles. Detects Txt-video / Img-video / Video-video from file + prompt.
 * Floating label on prompt bar. Aspect-aware generation stage. Result only after generate.
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
  ImagePlus,
  Film,
  X,
  Replace,
  Download,
  Share2,
  RotateCcw,
  Maximize2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, isPaidPlan } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import {
  VideoPromptBar,
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
import { VideoStudioControls } from "@/components/video/VideoStudioControls";
import { getWelcomeFreeVideoStatus } from "@/lib/billing/welcome-free-video-status.functions";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  capabilitiesForMode,
  availableMaxDurationFor,
  promptMentionsAudio,
  applyVideoStyle,
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
import { VIDEO_PROMPT_SUGGESTIONS } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export const Route = createFileRoute("/studio/video")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      {
        name: "description",
        content:
          "Create AI video from text, image or video. Auto-detects mode. Sound, duration, quality and aspect in one place.",
      },
    ],
  }),
  component: VideoStudioPage,
});

const STAGES = ["Preparing scene", "Building motion", "Rendering video", "Finishing"] as const;

const ASPECT_FRAME: Record<string, { w: string; maxH: string }> = {
  "16:9": { w: "100%", maxH: "min(42dvh, 280px)" },
  "9:16": { w: "min(100%, 200px)", maxH: "min(52dvh, 360px)" },
  "1:1": { w: "min(100%, 260px)", maxH: "min(42dvh, 260px)" },
  "4:3": { w: "100%", maxH: "min(40dvh, 260px)" },
  "3:4": { w: "min(100%, 220px)", maxH: "min(48dvh, 320px)" },
  "21:9": { w: "100%", maxH: "min(32dvh, 200px)" },
};

function detectMode(file: File | null, hasPrompt: boolean): VideoGenMode {
  if (!file) return "text";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

function modeLabel(mode: VideoGenMode): string {
  if (mode === "image") return "Img-video";
  if (mode === "video") return "Video-video";
  return "Txt-video";
}

function modeColor(mode: VideoGenMode): string {
  if (mode === "image") return "border-sky-400/50 bg-sky-500/15 text-sky-200";
  if (mode === "video") return "border-violet-400/50 bg-violet-500/15 text-violet-200";
  return "border-red-400/50 bg-red-500/15 text-red-200";
}

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

  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [eta, setEta] = useState(45);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generate = useServerFn(generateMedia);
  const welcomeStatus = useServerFn(getWelcomeFreeVideoStatus);

  // Auto-detected mode — no toggles
  const mode = useMemo(
    () => detectMode(sourceFile, prompt.trim().length > 0),
    [sourceFile, prompt],
  );
  const floatingLabel = modeLabel(mode);
  const v2vUnavailable = mode === "video";

  useEffect(() => {
    if (!user) return;
    void welcomeStatus({})
      .then((s) => {
        if (s?.eligible) setWelcomeFree(true);
      })
      .catch(() => {});
  }, [user, welcomeStatus]);

  const premiumLocked = !paid && !admin;

  const caps = useMemo(() => capabilitiesForMode(tier), [tier]);
  const durations = useMemo(() => allowedDurationsForTier(tier), [tier]);
  const maxDur = useMemo(
    () => availableMaxDurationFor(tier, resolution, audioOn),
    [tier, resolution, audioOn],
  );
  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;

  useEffect(() => {
    if (duration > maxDur && maxDur > 0) {
      setDuration(maxDur);
    } else if (!durations.includes(duration) && durations.length > 0) {
      setDuration(durations[0]);
    }
  }, [maxDur, duration, durations]);

  useEffect(() => {
    if (caps.aspects.length && !caps.aspects.includes(aspect)) {
      setAspect((caps.aspects.find((a) => a === "16:9") ?? caps.aspects[0]) as VideoAspect);
    }
    if (caps.resolutions.length && !caps.resolutions.includes(resolution)) {
      setResolution(
        (caps.resolutions.find((r) => r === "720p") ?? caps.resolutions[0]) as VideoResolution,
      );
    }
  }, [caps, aspect, resolution]);

  const price = useMemo(() => {
    if (v2vUnavailable) {
      return {
        credits: 0,
        supported: false,
        reason: "Video-video isn’t available yet. Use Txt-video or Img-video.",
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

  const onPickSource = useCallback(
    (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error("Upload an image or video file");
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        toast.error("Max 40 MB");
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      const url = URL.createObjectURL(file);
      setSourceFile(file);
      setSourceUrl(url);
      setResult(null);
      if (isVideo) {
        toast.message("Video-video detected", {
          description: "Coming soon — try Txt-video or Img-video for now.",
        });
      }
    },
    [sourceUrl],
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
      toast.error("Video-video isn’t available yet. Use Txt-video or Img-video.");
      return;
    }
    const p = prompt.trim();
    if (!p) {
      toast.error("Add a prompt describing your video");
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
    setStageIdx(0);
    setEta(duration <= 5 ? 45 : duration <= 10 ? 75 : 110);
    startGeneration("video");
    const stageTimer = window.setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, 3));
    }, 9000);

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
      window.clearInterval(stageTimer);
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

  const applySuggestion = (s: string) => {
    if (busy) return;
    setPrompt(s);
  };

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10">
          <Video className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-center text-base font-semibold text-foreground">
          Sign in to open Video Studio
        </p>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Create cinematic motion from a prompt or a still image.
        </p>
        <Button asChild className="rounded-full px-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!allowed && !welcomeFree) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <Lock className="h-7 w-7 text-amber-400" />
        </div>
        <p className="text-center text-lg font-semibold">Video Studio is on paid plans</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Unlock text-to-video and image-to-video with Standard and Exclusive modes.
        </p>
        <Button asChild className="rounded-full px-6">
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

  const frame = ASPECT_FRAME[aspect] ?? ASPECT_FRAME["16:9"];
  const showStage = busy || !!result;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-white">
      {/* Ambient glow — shifts with mode */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 transition-all duration-700"
        style={{
          background:
            mode === "image"
              ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.16), transparent 55%)"
              : mode === "video"
                ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(167,139,250,0.16), transparent 55%)"
                : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239,68,68,0.18), transparent 55%)",
        }}
      />

      <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-white/8 px-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white" asChild>
          <Link to="/studio" aria-label="Back to Studio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">Video Studio</p>
          <p className="truncate text-[11px] text-zinc-500">
            Motion Engine · Powered by Motio2edit AI
          </p>
        </div>
        {welcomeFree && !paid && (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Welcome free
          </span>
        )}
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-28 pt-3">
        {/* Unified source upload — auto detects image vs video */}
        <div className="w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*,video/mp4,video/webm,video/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (f) onPickSource(f);
            }}
          />
          {sourceUrl && sourceFile ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/40">
              {sourceFile.type.startsWith("video/") ? (
                <video
                  src={sourceUrl}
                  className="mx-auto max-h-28 w-full object-contain"
                  muted
                  playsInline
                  controls={false}
                />
              ) : (
                <img
                  src={sourceUrl}
                  alt="Source"
                  className="mx-auto max-h-28 w-full object-contain"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                <p className="truncate text-[10px] text-zinc-300">
                  {sourceFile.name}
                  <span className="ml-1.5 opacity-70">
                    · {sourceFile.type.startsWith("video/") ? "Video" : "Image"}
                  </span>
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10"
                    aria-label="Replace"
                  >
                    <Replace className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onClearSource}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (busy) return;
                const f = e.dataTransfer.files?.[0] ?? null;
                if (f) onPickSource(f);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-3 py-4 transition",
                dragOver
                  ? "border-red-400/50 bg-red-500/10"
                  : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8",
                busy && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2 text-zinc-400">
                <ImagePlus className="h-5 w-5" />
                <Film className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium text-zinc-300">
                Drop image or video (optional)
              </span>
              <span className="text-[10px] text-zinc-500">
                Auto-detects Img-video or Video-video · max 40MB
              </span>
            </button>
          )}
        </div>

        {/* Prompt + floating mode label */}
        <div className="relative">
          <div
            className={cn(
              "absolute -top-2.5 left-3 z-10 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-sm transition-all duration-300",
              modeColor(mode),
            )}
          >
            {floatingLabel}
            {v2vUnavailable && <span className="ml-1 opacity-80">· soon</span>}
          </div>
          <VideoPromptBar
            value={prompt}
            onChange={setPrompt}
            maxChars={promptMax}
            disabled={busy || v2vUnavailable}
            durationSec={duration}
            audioActive={audioOn}
            placeholder={
              mode === "image"
                ? "Describe how the image should move…"
                : mode === "video"
                  ? "Video-video coming soon — clear source for Txt-video"
                  : "Describe your video — lighting, motion, mood…"
            }
          />
        </div>

        {/* Suggestions — only when empty and not busy */}
        {!prompt && !busy && !v2vUnavailable && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {VIDEO_PROMPT_SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySuggestion(s)}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                {s.length > 42 ? `${s.slice(0, 40)}…` : s}
              </button>
            ))}
          </div>
        )}

        {/* All generation possibilities: tier, sound, quality, aspect, duration, style */}
        <VideoStudioControls
          tier={tier}
          setTier={setTier}
          premiumLocked={premiumLocked}
          onPremiumLockedClick={() => {
            toast.message("Exclusive is on paid plans", {
              description: "Upgrade to unlock 15s and higher quality paths.",
              action: {
                label: "Plans",
                onClick: () => navigate({ to: "/pricing" }),
              },
            });
          }}
          aspects={
            caps.aspects.filter(
              (a) => a === "16:9" || a === "9:16" || a === "1:1",
            ) as VideoAspect[]
          }
          resolutions={
            caps.resolutions.filter(
              (r) => r === "480p" || r === "720p" || r === "1080p",
            ) as VideoResolution[]
          }
          aspect={aspect}
          setAspect={setAspect}
          resolution={resolution}
          setResolution={setResolution}
          duration={duration}
          setDuration={setDuration}
          durations={durations}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
          audioSupported={caps.audioSupported}
          styleId={styleId}
          setStyleId={setStyleId}
          disabled={busy || v2vUnavailable}
        />

        {/* Live estimate */}
        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px]">
          <span className="text-zinc-500">
            {price.supported
              ? `${duration}s · ${resolution} · ${aspect}${audioOn ? " · Sound" : ""}`
              : price.reason ?? "Adjust settings"}
          </span>
          <span className="font-semibold tabular-nums text-zinc-200">
            {price.supported ? `~${creditsEstimate} credits` : "—"}
          </span>
        </div>

        {/* Stage / Result frame — only visible while generating or after success */}
        {showStage && (
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-black shadow-2xl transition-all duration-500",
                busy
                  ? "border-red-500/40 shadow-red-500/20"
                  : "border-white/12",
              )}
              style={{
                width: frame.w,
                maxHeight: frame.maxH,
                aspectRatio:
                  aspect === "9:16"
                    ? "9/16"
                    : aspect === "1:1"
                      ? "1/1"
                      : aspect === "21:9"
                        ? "21/9"
                        : aspect === "3:4"
                          ? "3/4"
                          : aspect === "4:3"
                            ? "4/3"
                            : "16/9",
              }}
            >
              {busy && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-950/90 backdrop-blur-sm">
                  <div
                    className={cn(
                      "relative grid h-14 w-14 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10",
                      "motion-safe:animate-pulse",
                    )}
                  >
                    <Video className="h-6 w-6 text-red-400" />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_28px_rgba(239,68,68,0.4)] motion-safe:animate-pulse" />
                  </div>
                  <div className="w-full max-w-[200px] space-y-1.5 px-4 text-center">
                    <p className="text-xs font-semibold text-white">{STAGES[stageIdx]}</p>
                    <p className="text-[10px] text-zinc-400">
                      {aspect} · ~{eta}s
                    </p>
                    <div className="mt-2 flex justify-center gap-1">
                      {STAGES.map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 w-5 rounded-full transition-colors",
                            i <= stageIdx ? "bg-red-500" : "bg-white/15",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result && !busy && (
                <video
                  src={result.outputUrl}
                  controls
                  playsInline
                  autoPlay
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            {result && !busy && (
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void onDownload()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-xs font-bold text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <button
                  type="button"
                  onClick={() => void onGenerate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Another
                </button>
                <a
                  href={result.outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Full
                </a>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate bar — always visible when no result or after clear */}
      {!result && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void onGenerate()}
              className={cn(
                "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                canGenerate
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25 active:scale-[0.98]"
                  : "cursor-not-allowed bg-white/10 text-zinc-500",
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {busy ? "Generating…" : `Generate ${floatingLabel}`}
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-lg text-center text-[10px] text-zinc-600">
            Charged only when your video is delivered · {floatingLabel}
          </p>
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
