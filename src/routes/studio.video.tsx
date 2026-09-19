/**
 * Motio2edit Video Studio v2 — glass UI on video-studio-v2 branch.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Grid3x3, Info, Lock, Sparkles, Video, X, Lock as LockIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StudioBackLink } from "@/components/StudioBackLink";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import { VideoModeSelector } from "@/components/video/VideoModeSelector";
import {
  VideoPromptBar,
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
import { VideoFeaturePanel } from "@/components/video/VideoFeaturePanel";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
import { getWelcomeFreeVideoStatus } from "@/lib/billing/welcome-free-video-status.functions";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  type VideoGenMode,
  type VideoAspect,
  type VideoResolution,
  type VideoTier,
} from "@/lib/video-model-registry";
import { capabilitiesForGenMode } from "@/lib/video/video-capability-registry";
import {
  computeMotioVideoCredits,
  qualityFromResolution,
} from "@/lib/motio-video-credits";
import {
  parsePromptTiming,
  validateTimingAgainstDuration,
} from "@/lib/video/prompt-timing";
import { VIDEO_STYLE_UI, STYLE_FALLBACK_GRADIENT } from "@/lib/videoStyles";
import type { VideoStudioResult } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export const Route = createFileRoute("/studio/video")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Create AI video from text, image, or video." },
    ],
  }),
  component: VideoStudioPage,
});

const PROMPT_IDEAS = [
  {
    id: "drone",
    label: "Drone sunrise",
    text: "A cinematic drone shot over a mountain range at sunrise, golden light, smooth camera glide",
  },
  {
    id: "city",
    label: "Neon city",
    text: "A stylish woman walks through a neon-lit Tokyo street at night, reflections on wet pavement",
  },
  {
    id: "ocean",
    label: "Ocean waves",
    text: "Powerful waves crash against dark rocks at golden hour, spray catching the light",
  },
  {
    id: "forest",
    label: "Misty forest",
    text: "Slow push through a misty pine forest at dawn, volumetric light rays through the trees",
  },
];

function aspectBoxClass(aspect: VideoAspect): string {
  if (aspect === "9:16") return "aspect-[9/16] max-h-[320px] w-auto mx-auto";
  if (aspect === "1:1") return "aspect-square max-h-[280px] w-full max-w-[280px] mx-auto";
  return "aspect-video w-full";
}

function VideoStudioPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email ?? user?.email);
  const allowed = canAccessVideo({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("none");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [eta, setEta] = useState(45);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [thumbFailed, setThumbFailed] = useState<Record<string, boolean>>({});

  /** Internal routing only — no tier UI. 15s or 1080p → premium models. */
  const tier: VideoTier =
    duration >= 15 || resolution === "1080p" ? "premium" : "standard";

  const generate = useServerFn(generateMedia);
  const welcomeStatus = useServerFn(getWelcomeFreeVideoStatus);

  useEffect(() => {
    if (!user) return;
    void welcomeStatus({})
      .then((s) => {
        if (s?.eligible) setWelcomeFree(true);
      })
      .catch(() => {});
  }, [user, welcomeStatus]);

  const caps = useMemo(() => {
    try {
      return capabilitiesForGenMode(tier, mode);
    } catch {
      return {
        durations: [5, 10, 15],
        resolutions: ["480p", "720p", "1080p"] as VideoResolution[],
        aspects: ["16:9", "9:16", "1:1"] as VideoAspect[],
        audioSupported: true,
        videoInputSupported: mode === "video",
        firstFrameSupported: false,
        lastFrameSupported: false,
      };
    }
  }, [tier, mode]);

  /** Always offer full control set; disable only when capability lacks support */
  const durations = [5, 10, 15];
  const resolutionOptions: VideoResolution[] = ["480p", "720p", "1080p"];
  const aspectOptions = (caps.aspects.length
    ? caps.aspects
    : ["16:9", "9:16", "1:1"]) as VideoAspect[];

  const disabledDurations = useMemo(() => {
    const map: Partial<Record<number, string>> = {};
    for (const d of durations) {
      if (caps.durations.length && !caps.durations.includes(d)) {
        map[d] = "Not available for this mode/quality yet";
      }
    }
    return map;
  }, [caps.durations]);

  const disabledResolutions = useMemo(() => {
    const map: Partial<Record<string, string>> = {};
    for (const r of resolutionOptions) {
      if (caps.resolutions.length && !caps.resolutions.includes(r)) {
        map[r] = "Not available for this mode yet";
      }
    }
    return map;
  }, [caps.resolutions]);

  useEffect(() => {
    if (!aspectOptions.includes(aspect) && aspectOptions[0]) setAspect(aspectOptions[0]);
  }, [aspectOptions, aspect]);

  useEffect(() => {
    if (!caps.audioSupported && audioOn) setAudioOn(false);
  }, [caps.audioSupported, audioOn]);

  const promptMax =
    duration >= 15 || resolution === "1080p"
      ? PREMIUM_VIDEO_PROMPT_MAX
      : STANDARD_VIDEO_PROMPT_MAX;

  const price = useMemo(() => {
    try {
      return computeMotioVideoCredits({
        tier,
        durationSec: duration,
        quality: qualityFromResolution(resolution),
        soundOn: audioOn,
        mode,
        resolution,
        aspect,
      });
    } catch {
      return {
        credits: 0,
        usd: 0,
        supported: true,
        reason: undefined as string | undefined,
        breakdown: {
          tier,
          mode,
          durationSec: duration,
          quality: qualityFromResolution(resolution),
          soundOn: audioOn,
          baseCredits: 0,
          soundSurcharge: 0,
          formula: "error",
        },
      };
    }
  }, [tier, duration, resolution, audioOn, mode, aspect]);

  const creditsEstimate = price.supported ? price.credits : 0;

  const creditRows = useMemo(() => {
    const rows: { label: string; credits: number }[] = [];
    try {
      const cur = computeMotioVideoCredits({
        tier,
        durationSec: duration,
        quality: qualityFromResolution(resolution),
        soundOn: audioOn,
        mode,
        resolution,
        aspect,
      });
      if (cur.supported) {
        rows.push({
          label: `Current · ${mode} · ${duration}s · ${resolution === "480p" ? "SD" : resolution}${audioOn ? " · Sound" : ""}`,
          credits: cur.credits,
        });
      }
      for (const d of [5, 10, 15]) {
        if (d === duration) continue;
        const r = computeMotioVideoCredits({
          tier: d >= 15 ? "premium" : "standard",
          durationSec: d,
          quality: qualityFromResolution(resolution),
          soundOn: audioOn,
          mode,
          resolution,
          aspect,
        });
        if (r.supported) rows.push({ label: `${d}s · same quality`, credits: r.credits });
      }
    } catch {
      /* skip */
    }
    return rows;
  }, [tier, duration, resolution, audioOn, mode, aspect]);

  const onPickSource = useCallback(
    (file: File) => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      setSourceFile(file);
      setSourceUrl(URL.createObjectURL(file));
      setResult(null);
    },
    [sourceUrl],
  );

  const onClearSource = useCallback(() => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
  }, [sourceUrl]);

  const onModeChange = useCallback(
    (m: VideoGenMode) => {
      setMode(m);
      if (m === "text") onClearSource();
      setResult(null);
    },
    [onClearSource],
  );

  const onGenerate = useCallback(async () => {
    if (!allowed && !welcomeFree) {
      toast.error("Upgrade to unlock Video Studio");
      navigate({ to: "/pricing" });
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
    if (mode === "video" && !sourceUrl) {
      toast.error("Upload a source video first");
      return;
    }
    if (!price.supported && mode !== "video") {
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
    if (!selection && mode !== "video") {
      toast.error(videoSelectionUnavailableMessage());
      return;
    }

    setBusy(true);
    setStageIdx(0);
    setEta(duration <= 5 ? 45 : duration <= 10 ? 75 : 110);
    startGeneration("video");
    const stageTimer = window.setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, 3));
    }, 9000);

    try {
      let imageUrl: string | undefined;
      if ((mode === "image" || mode === "video") && sourceFile) {
        imageUrl = await fileToDataUrl(sourceFile);
      } else if ((mode === "image" || mode === "video") && sourceUrl?.startsWith("http")) {
        imageUrl = sourceUrl;
      }

      /** Style id only — do not rewrite the user prompt */
      const res = await generate({
        data: {
          type: "video",
          prompt: p,
          imageUrl,
          videoDurationSeconds: duration,
          videoResolution: resolution,
          videoAspectRatio: aspect,
          videoStyleId: styleId && styleId !== "none" ? styleId : undefined,
          videoGenerateAudio: audioOn,
          sourceKind: mode === "video" ? "video" : mode === "image" ? "image" : undefined,
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
        mode: mode === "video" ? "video" : mode === "image" ? "image" : "text",
        prompt: p,
        duration: (duration === 15 ? 15 : duration === 10 ? 10 : 5) as 5 | 10 | 15,
        aspect: (aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: resolution === "1080p" ? "1080p" : resolution === "480p" ? "720p" : "720p",
        size: "medium",
        soundRequested: audioOn,
        creditsUsed: typeof charged === "number" ? charged : creditsEstimate,
        sourcePreview: sourceUrl,
      });
      toast.success("Video ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate video");
    } finally {
      window.clearInterval(stageTimer);
      setBusy(false);
      endGeneration();
    }
  }, [
    allowed,
    welcomeFree,
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

  if (authLoading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading Video Studio…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10">
          <Video className="h-7 w-7 text-red-400" />
        </div>
        <p className="text-center text-base font-semibold">Sign in to open Video Studio</p>
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
        <Button asChild className="rounded-full px-6">
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  const canGenerate =
    !busy &&
    !!prompt.trim() &&
    (mode === "video" ? !!sourceUrl : mode === "text" || !!sourceUrl);

  const glassCard =
    "rounded-[20px] border border-border/40 bg-background/55 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-[16px] dark:border-white/15 dark:bg-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]";

  return (
    <div className="relative min-h-[100dvh]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-orange-100/90 via-rose-50 to-violet-100/90 dark:from-orange-950/50 dark:via-zinc-950 dark:to-violet-950/60"
        aria-hidden
      />

      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-4 pb-40 sm:px-5">
        <StudioBackLink className="mb-3" />

        {/* 1. Header */}
        <header className="mb-4">
          <div className="flex items-center gap-2.5">
            <span className="studio-cam-icon inline-flex text-2xl" aria-hidden>
              🎥
            </span>
            <div>
              <h1 className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                Video Studio
              </h1>
              <p className="text-[12px] text-muted-foreground">by Motion2Ai</p>
            </div>
          </div>
          <div
            className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/60 to-transparent"
            aria-hidden
          />
        </header>

        {/* 2. Mode tabs */}
        <div className="mb-4">
          <VideoModeSelector value={mode} onChange={onModeChange} disabled={busy} />
        </div>

        {/* 3. Canvas */}
        {result?.outputUrl ? (
          <div className={cn("relative mb-4 overflow-hidden", glassCard, aspectBoxClass(aspect))}>
            <div className="absolute right-2 top-2 z-10">
              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold",
                  showGrid
                    ? "border-red-500/60 bg-red-500/15 text-red-600"
                    : "border-border/50 bg-background/70 text-muted-foreground",
                )}
              >
                <Grid3x3 className="h-3 w-3" /> Grid
              </button>
            </div>
            <video
              src={result.outputUrl}
              className="h-full w-full object-contain"
              controls
              playsInline
            />
            {showGrid && (
              <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
                <div className="absolute left-1/3 top-0 h-full w-px bg-foreground" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-foreground" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-foreground" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-foreground" />
              </div>
            )}
          </div>
        ) : mode === "image" || mode === "video" ? (
          <div className="mb-4">
            <VideoSourceUpload
              mode={mode === "video" ? "video" : "image"}
              file={sourceFile}
              previewUrl={sourceUrl}
              onPick={onPickSource}
              onClear={onClearSource}
              disabled={busy}
              aspect={aspect === "9:16" || aspect === "1:1" ? aspect : "16:9"}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((g) => !g)}
            />
          </div>
        ) : null}

        {/* 4. Prompt ideas + prompt box */}
        <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
          {PROMPT_IDEAS.map((idea) => (
            <button
              key={idea.id}
              type="button"
              disabled={busy}
              onClick={() => setPrompt(idea.text)}
              className={cn(
                "snap-start shrink-0 rounded-2xl border border-border/40 bg-background/50 px-3 py-2 text-left shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10",
              )}
            >
              <p className="text-[11px] font-semibold text-foreground">{idea.label}</p>
              <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-muted-foreground">
                {idea.text}
              </p>
            </button>
          ))}
        </div>

        <section className="mb-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Prompt
          </p>
          <VideoPromptBar
            value={prompt}
            onChange={setPrompt}
            maxChars={promptMax}
            disabled={busy}
            durationSec={duration}
            placeholder={
              mode === "image"
                ? "Describe how the image should move…"
                : mode === "video"
                  ? "Describe how to transform this video…"
                  : "A cinematic drone shot over a mountain range at sunrise…"
            }
          />
        </section>

        {/* 5. Style strip — horizontal snap */}
        <section className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Style
          </p>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
            {VIDEO_STYLE_UI.map((s) => {
              const active = styleId === s.id || (!styleId && s.id === "none");
              const failed = thumbFailed[s.id];
              const grad =
                STYLE_FALLBACK_GRADIENT[s.id] ?? STYLE_FALLBACK_GRADIENT.none;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy || s.locked}
                  onClick={() => {
                    if (!s.locked) setStyleId(s.id);
                  }}
                  className={cn(
                    "relative w-[88px] shrink-0 snap-start overflow-hidden rounded-2xl border transition-transform duration-200",
                    active
                      ? "scale-105 border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)] ring-2 ring-red-500/50"
                      : "border-border/40 dark:border-white/15",
                    s.locked && "opacity-60",
                  )}
                >
                  {s.id === "none" || !s.thumbnail || failed ? (
                    <span
                      className={cn(
                        "flex aspect-video w-full items-center justify-center bg-gradient-to-br",
                        grad,
                      )}
                    >
                      {s.id === "none" && (
                        <X className="h-5 w-5 text-muted-foreground" aria-hidden />
                      )}
                    </span>
                  ) : (
                    <img
                      src={s.thumbnail}
                      alt=""
                      className="aspect-video w-full object-cover"
                      onError={() =>
                        setThumbFailed((prev) => ({ ...prev, [s.id]: true }))
                      }
                    />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-1.5 pt-5 text-center text-[10px] font-semibold text-white">
                    {s.displayName}
                  </span>
                  {s.locked && (
                    <span className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5">
                      <LockIcon className="h-3 w-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. Features */}
        <div className="mb-5">
          <VideoFeaturePanel
            aspects={aspectOptions}
            resolutions={resolutionOptions}
            durations={durations}
            aspect={aspect}
            setAspect={setAspect}
            resolution={resolution}
            setResolution={setResolution}
            duration={duration}
            setDuration={setDuration}
            soundOn={audioOn}
            setSoundOn={setAudioOn}
            soundAvailable={caps.audioSupported !== false}
            disabled={busy}
            disabledDurations={disabledDurations}
            disabledResolutions={disabledResolutions}
          />
        </div>
      </div>

      {/* 7. Sticky generate bar */}
      {!result && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/75 p-3 backdrop-blur-[16px] dark:border-white/10 dark:bg-zinc-950/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void onGenerate()}
              className={cn(
                "relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-semibold transition",
                canGenerate
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {canGenerate && (
                <span className="studio-shimmer pointer-events-none absolute inset-0" aria-hidden />
              )}
              <Sparkles className="relative h-4 w-4" aria-hidden />
              <span className="relative">
                {busy
                  ? "Generating…"
                  : creditsEstimate > 0
                    ? `Generate · ~${creditsEstimate} credits`
                    : "Generate Video"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCreditsOpen(true)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border/50 bg-background/60 text-muted-foreground backdrop-blur-md dark:border-white/15 dark:bg-white/10"
              aria-label="Credit costs"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Charged only when your video is delivered
          </p>
        </div>
      )}

      {creditsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setCreditsOpen(false)}
          />
          <div
            className={cn(
              "relative z-10 w-full max-w-lg rounded-t-[24px] border border-border/40 bg-background/95 p-5 shadow-2xl backdrop-blur-[20px] dark:border-white/15 dark:bg-zinc-900/95",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Credit estimate</p>
              <button
                type="button"
                onClick={() => setCreditsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {creditRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 dark:bg-white/5"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums">~{row.credits}</span>
                </li>
              ))}
              {creditRows.length === 0 && (
                <li className="text-muted-foreground">Estimates update with your settings.</li>
              )}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Current selection: ~{creditsEstimate} credits · charged only on delivery
            </p>
          </div>
        </div>
      )}

      {busy && (
        <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} prompt={prompt.trim()} />
      )}
      {result && !busy && (
        <VideoOutputView
          result={result}
          onClose={() => setResult(null)}
          onRegenerate={() => void onGenerate()}
          onDownload={() => void onDownload()}
        />
      )}

      <style>{`
        @keyframes studio-cam-pulse {
          0%, 100% { transform: rotate(-4deg) scale(1); filter: drop-shadow(0 0 0 transparent); }
          50% { transform: rotate(4deg) scale(1.06); filter: drop-shadow(0 0 8px rgba(249,115,22,0.55)); }
        }
        .studio-cam-icon {
          animation: studio-cam-pulse 2.6s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes studio-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .studio-shimmer {
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%);
          animation: studio-shimmer 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .studio-cam-icon, .studio-shimmer { animation: none; }
        }
      `}</style>
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
