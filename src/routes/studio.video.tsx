/**
 * Motio2edit Video Studio — light UI foundation + surgical upgrades.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StudioBackLink } from "@/components/StudioBackLink";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, isPaidPlan } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import { VideoModeSelector } from "@/components/video/VideoModeSelector";
import {
  VideoPromptBar,
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
import {
  VideoFeaturePanel,
  type VideoSizeOption,
} from "@/components/video/VideoFeaturePanel";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
import { getWelcomeFreeVideoStatus } from "@/lib/billing/welcome-free-video-status.functions";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  availableMaxDurationFor,
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
import {
  videoStylesForUi,
  applyVideoStyleFromRegistry,
} from "@/lib/video/video-style-registry";
import type { VideoStudioResult } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export const Route = createFileRoute("/studio/video")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      {
        name: "description",
        content: "Create AI video from text, image, or video.",
      },
    ],
  }),
  component: VideoStudioPage,
});

const STYLE_THUMB: Record<string, string> = {
  neutral: "bg-gradient-to-br from-zinc-200 to-zinc-400",
  classic: "bg-gradient-to-br from-amber-100 to-stone-400",
  retro: "bg-gradient-to-br from-pink-400 to-orange-500",
  vintage: "bg-gradient-to-br from-yellow-200 to-amber-700",
  cinematic: "bg-gradient-to-br from-slate-700 to-indigo-900",
  documentary: "bg-gradient-to-br from-emerald-300 to-teal-700",
  anime: "bg-gradient-to-br from-fuchsia-400 to-sky-500",
  product: "bg-gradient-to-br from-white to-zinc-300",
  social: "bg-gradient-to-br from-rose-400 to-violet-600",
};

function VideoStudioPage() {
  const { user, profile, loading: authLoading } = useAuth();
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
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [size, setSize] = useState<VideoSizeOption>("medium");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [eta, setEta] = useState(45);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);

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

  const premiumLocked = !paid && !admin;

  const caps = useMemo(() => {
    try {
      return capabilitiesForGenMode(tier, mode);
    } catch {
      return {
        durations: tier === "premium" ? [5, 10, 15] : [5, 10],
        resolutions: ["720p", "1080p"] as VideoResolution[],
        aspects: ["16:9", "9:16", "1:1"] as VideoAspect[],
        audioSupported: true,
        videoInputSupported: mode === "video",
        firstFrameSupported: false,
        lastFrameSupported: false,
      };
    }
  }, [tier, mode]);

  const durations = caps.durations.length ? caps.durations : [5, 10];
  const aspectOptions = (caps.aspects.length
    ? caps.aspects
    : ["16:9", "9:16", "1:1"]) as VideoAspect[];
  const resolutionOptions = (caps.resolutions.length
    ? caps.resolutions
    : ["720p", "1080p"]) as VideoResolution[];

  useEffect(() => {
    if (!aspectOptions.includes(aspect) && aspectOptions[0]) {
      setAspect(aspectOptions[0]);
    }
  }, [aspectOptions, aspect]);

  useEffect(() => {
    if (!resolutionOptions.includes(resolution) && resolutionOptions[0]) {
      setResolution(resolutionOptions[0]);
    }
  }, [resolutionOptions, resolution]);

  useEffect(() => {
    if (!durations.includes(duration) && durations[0]) {
      setDuration(durations[0]);
    }
  }, [durations, duration]);

  useEffect(() => {
    if (!caps.audioSupported && audioOn) setAudioOn(false);
  }, [caps.audioSupported, audioOn]);

  const maxDur = useMemo(() => {
    try {
      const m = availableMaxDurationFor(tier, resolution, audioOn);
      return typeof m === "number" && m > 0 ? m : tier === "premium" ? 15 : 10;
    } catch {
      return tier === "premium" ? 15 : 10;
    }
  }, [tier, resolution, audioOn]);

  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
  const styles = useMemo(() => videoStylesForUi(mode), [mode]);

  useEffect(() => {
    if (duration > maxDur && maxDur > 0) setDuration(maxDur);
  }, [maxDur, duration]);

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
        supported: mode === "video",
        reason: "Pricing unavailable",
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

  const onPickSource = useCallback(
    (file: File) => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      const url = URL.createObjectURL(file);
      setSourceFile(file);
      setSourceUrl(url);
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
      setStyleId("");
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

      const styled = applyVideoStyleFromRegistry(p, styleId || null);
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
        quality: resolution === "1080p" ? "1080p" : "720p",
        size,
        soundRequested: audioOn,
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
    prompt,
    mode,
    sourceUrl,
    sourceFile,
    duration,
    aspect,
    resolution,
    size,
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
        <p className="text-center text-base font-semibold text-foreground">
          Sign in to open Video Studio
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
        <Button asChild className="rounded-full px-6">
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  const canGenerate =
    !busy &&
    !!prompt.trim() &&
    (mode === "video" ? !!sourceUrl : price.supported && (mode === "text" || !!sourceUrl));

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-4 pb-28 sm:px-5">
      <StudioBackLink className="mb-3" />

      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">🎥 Video Studio</h1>
        <p className="text-[12px] text-muted-foreground">by Motion2Ai</p>
      </header>

      <div className="mb-4">
        <VideoModeSelector value={mode} onChange={onModeChange} disabled={busy} />
      </div>

      {(mode === "image" || mode === "video") && (
        <div className="mb-4">
          <VideoSourceUpload
            mode={mode === "video" ? "video" : "image"}
            file={sourceFile}
            previewUrl={sourceUrl}
            onPick={onPickSource}
            onClear={onClearSource}
            disabled={busy}
          />
        </div>
      )}

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

      {/* Horizontal style strip — UI only id/name/thumbnail */}
      <section className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Style
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {styles.map((s) => {
            const active = (styleId || "none") === s.id || (!styleId && s.id === "none");
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => setStyleId(s.id === "none" ? "" : s.id)}
                className={cn(
                  "flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 transition",
                  active
                    ? "border-orange-500 ring-1 ring-orange-500/40"
                    : "border-border/60 hover:border-orange-400/40",
                )}
              >
                <span
                  className={cn(
                    "aspect-video w-full rounded-lg",
                    STYLE_THUMB[s.thumbnail] ?? STYLE_THUMB.neutral,
                  )}
                />
                <span className="text-[10px] font-medium text-foreground">{s.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mb-5">
        <VideoFeaturePanel
          tier={tier}
          setTier={setTier}
          premiumLocked={premiumLocked}
          onPremiumLockedClick={() => {
            toast.message("Premium is on paid plans", {
              description: "Upgrade to unlock longer clips and higher quality.",
              action: {
                label: "Plans",
                onClick: () => navigate({ to: "/pricing" }),
              },
            });
          }}
          aspects={aspectOptions}
          resolutions={resolutionOptions}
          durations={durations}
          aspect={aspect}
          setAspect={setAspect}
          resolution={resolution}
          setResolution={setResolution}
          duration={duration}
          setDuration={setDuration}
          size={size}
          setSize={setSize}
          soundOn={audioOn}
          setSoundOn={setAudioOn}
          soundAvailable={caps.audioSupported}
          disabled={busy}
        />
      </div>

      {!result && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 p-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void onGenerate()}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                canGenerate
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {busy
                ? "Generating…"
                : price.supported
                  ? `Generate Video · ~${creditsEstimate} credits`
                  : "Generate Video"}
            </button>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Charged only when your video is delivered
            </p>
          </div>
        </div>
      )}

      {busy && (
        <VideoGeneratingOverlay
          stageIndex={stageIdx}
          etaSeconds={eta}
          prompt={prompt.trim()}
        />
      )}
      {result && !busy && (
        <VideoOutputView
          result={result}
          onClose={() => setResult(null)}
          onRegenerate={() => void onGenerate()}
          onDownload={() => void onDownload()}
        />
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
