/**
 * Motio2edit Video Studio — scroll-free premium creative workspace.
 * Wiring matches live component APIs + generateMedia server schema.
 * Billing: server quote → reserve → finalize (authoritative). Credits UI deferred.
 * Historical UI: ad8a25d3 (pre pixel-match / auto-detect redesign).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Lock, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
import { VideoStudioControls } from "@/components/video/VideoStudioControls";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
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
        content: "Create AI video from text or image. Sound, duration, and quality in one place.",
      },
    ],
  }),
  component: VideoStudioPage,
});

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
    return computeMotioVideoCredits({
      tier,
      durationSec: duration,
      quality: qualityFromResolution(resolution),
      soundOn: audioOn,
      mode,
      resolution,
      aspect,
    });
  }, [tier, duration, resolution, audioOn, mode, aspect]);

  const creditsEstimate = price.supported ? price.credits : 0;

  const onPickSource = useCallback((file: File) => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
  }, [sourceUrl]);

  const onClearSource = useCallback(() => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
  }, [sourceUrl]);

  const onModeChange = useCallback(
    (m: VideoGenMode) => {
      setMode(m);
      if (m === "text") onClearSource();
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
    if (mode !== "video" && !price.supported) {
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

    if (mode !== "video") {
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
    (mode === "video" ? !!sourceUrl : price.supported && (mode === "text" || !!sourceUrl));

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239,68,68,0.18), transparent 55%)",
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
        <div className="flex items-center justify-between gap-2">
          <VideoModeSelector value={mode} onChange={onModeChange} disabled={busy} />
        </div>

        {(mode === "image" || mode === "video") && (
          <VideoSourceUpload
            mode={mode === "video" ? "video" : "image"}
            file={sourceFile}
            previewUrl={sourceUrl}
            onPick={onPickSource}
            onClear={onClearSource}
            disabled={busy}
          />
        )}

        <VideoPromptBar
          value={prompt}
          onChange={setPrompt}
          maxChars={promptMax}
          disabled={busy}
          durationSec={duration}
          audioActive={audioOn}
          placeholder={
            mode === "image"
              ? "Describe how the image should move…"
              : mode === "video"
                ? "Describe how to transform this video…"
                : "Describe your video — lighting, motion, mood…"
          }
        />

        {!prompt && !busy && mode !== "video" && (
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
          aspects={caps.aspects.filter((a) => a === "16:9" || a === "9:16" || a === "1:1") as VideoAspect[]}
          resolutions={caps.resolutions.filter((r) => r === "480p" || r === "720p" || r === "1080p") as VideoResolution[]}
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
          disabled={busy}
        />

        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px]">
          <span className="text-zinc-500">
            {mode === "video"
              ? `${duration}s · enhance path`
              : price.supported
                ? `${duration}s · ${resolution} · ${aspect}${audioOn ? " · Sound" : ""}`
                : price.reason ?? "Adjust settings"}
          </span>
          <span className="font-semibold tabular-nums text-zinc-200">
            {mode === "video" ? "—" : price.supported ? `~${creditsEstimate} credits` : "—"}
          </span>
        </div>
      </div>

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
              {busy ? "Generating…" : "Generate Video"}
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-lg text-center text-[10px] text-zinc-600">
            Charged only when your video is delivered
          </p>
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
