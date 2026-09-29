/**
 * Motio2edit Video Studio — live UI fixes pass.
 * - Character counter maxChars fixed
 * - Mode switch clears upload
 * - Explicit Standard/Premium toggle
 * - Light-only theme
 * - Generate label only; credits in (i) as single total
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Coins,
  Info,
  Lock,
  Video,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
import { VideoStyleStrip } from "@/components/video/VideoStyleStrip";
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
import {
  isDurationAllowed,
  planRequiredForDuration,
} from "@/lib/video-options";
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

function aspectBoxClass(aspect: VideoAspect): string {
  if (aspect === "9:16") return "aspect-[9/16] max-h-[42vh] w-auto mx-auto";
  if (aspect === "1:1") return "aspect-square max-h-[42vh] w-full max-w-[min(100%,42vh)] mx-auto";
  return "aspect-video w-full max-h-[42vh]";
}

function unionCaps(mode: VideoGenMode) {
  const empty = {
    durations: [5, 10, 15] as number[],
    resolutions: ["480p", "720p", "1080p"] as VideoResolution[],
    aspects: ["16:9", "9:16", "1:1"] as VideoAspect[],
    audioSupported: true,
  };
  try {
    const a = capabilitiesForGenMode("standard", mode);
    const b = capabilitiesForGenMode("premium", mode);
    const durations = Array.from(
      new Set([...(a.durations ?? []), ...(b.durations ?? [])]),
    ).sort((x, y) => x - y);
    const resolutions = Array.from(
      new Set([...(a.resolutions ?? []), ...(b.resolutions ?? [])]),
    ) as VideoResolution[];
    const aspects = Array.from(
      new Set([...(a.aspects ?? []), ...(b.aspects ?? [])]),
    ) as VideoAspect[];
    return {
      durations: durations.length ? durations : empty.durations,
      resolutions: resolutions.length ? resolutions : empty.resolutions,
      aspects: aspects.length ? aspects : empty.aspects,
      audioSupported: Boolean(a.audioSupported || b.audioSupported),
    };
  } catch {
    return empty;
  }
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
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  /** Explicit Standard / Premium toggle (user-controlled) */
  const [tier, setTier] = useState<VideoTier>("standard");
  const canvasRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);

  // Mark page ready after first paint + auth settle (reduces first-gen flakiness)
  useEffect(() => {
    if (authLoading) return;
    const t = window.setTimeout(() => {
      readyRef.current = true;
    }, 50);
    return () => window.clearTimeout(t);
  }, [authLoading]);

  const generate = useServerFn(generateMedia);
  const welcomeStatus = useServerFn(getWelcomeFreeVideoStatus);

  useEffect(() => {
    if (!user) return;
    welcomeStatus({ data: {} })
      .then((s: { eligible?: boolean }) => setWelcomeFree(Boolean(s?.eligible)))
      .catch(() => setWelcomeFree(false));
  }, [user, welcomeStatus]);

  const caps = useMemo(() => unionCaps(mode), [mode]);

  // Keep duration/resolution within caps when mode changes
  useEffect(() => {
    if (!caps.durations.includes(duration)) {
      setDuration(caps.durations[0] ?? 5);
    }
    if (!caps.resolutions.includes(resolution)) {
      setResolution((caps.resolutions[1] as VideoResolution) ?? "720p");
    }
    if (!caps.aspects.includes(aspect)) {
      setAspect(caps.aspects[0] ?? "16:9");
    }
  }, [caps, duration, resolution, aspect]);

  // 15s or 1080p implies Premium capability
  const durationLocks = useMemo(() => {
    const map: Record<number, string | undefined> = {};
    for (const d of caps.durations) {
      if (!isDurationAllowed(d, profile?.plan, admin)) {
        map[d] = `Requires ${planRequiredForDuration(d)}`;
      }
      if (tier === "standard" && d >= 15) {
        map[d] = "Requires Premium";
      }
    }
    return map;
  }, [caps.durations, profile?.plan, admin, tier]);

  const resolutionLocks = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const r of caps.resolutions) {
      if (tier === "standard" && r === "1080p") {
        map[r] = "Requires Premium";
      }
    }
    return map;
  }, [caps.resolutions, tier]);

  const maxChars =
    tier === "premium" || admin ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;

  const effectiveTier: VideoTier =
    tier === "premium" || duration >= 15 || resolution === "1080p"
      ? "premium"
      : "standard";

  const creditEstimate = useMemo(() => {
    try {
      return computeMotioVideoCredits({
        tier: effectiveTier,
        durationSec: duration,
        quality: qualityFromResolution(resolution),
        audio: audioOn,
        mode,
        aspect,
      });
    } catch {
      return {
        total: 0,
        base: 0,
        breakdown: {},
        tier,
      };
    }
  }, [tier, duration, resolution, audioOn, mode, aspect, effectiveTier]);

  const onPickSource = useCallback((file: File) => {
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
  }, []);

  const onClearSource = useCallback(() => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceFile(null);
    setSourceUrl(null);
  }, [sourceUrl]);

  // Mode switch MUST clear source so wrong-type media is never carried over
  const handleModeChange = useCallback(
    (next: VideoGenMode) => {
      if (next === mode) return;
      onClearSource();
      setMode(next);
      setResult(null);
    },
    [mode, onClearSource],
  );

  const handleGenerate = useCallback(async () => {
    if (!readyRef.current) {
      toast.message("Still loading — try again in a moment");
      return;
    }
    if (!prompt.trim() && mode === "text") {
      toast.error("Write a prompt first");
      return;
    }
    if ((mode === "image" || mode === "video") && !sourceFile) {
      toast.error(mode === "image" ? "Add an image first" : "Add a video first");
      return;
    }
    if (durationLocks[duration]) {
      toast.error(durationLocks[duration]);
      return;
    }
    if (resolutionLocks[resolution]) {
      toast.error(resolutionLocks[resolution]);
      return;
    }

    setBusy(true);
    setResult(null);
    startGeneration("video");
    try {
      const selection = selectVideoModel({
        tier: effectiveTier,
        mode,
        durationSec: duration,
        resolution,
        aspect,
        audio: audioOn,
      });
      if (!selection?.modelId) {
        throw new Error(videoSelectionUnavailableMessage(effectiveTier, mode));
      }

      let imageBase64: string | undefined;
      if (sourceFile && (mode === "image" || mode === "video")) {
        imageBase64 = await fileToDataUrl(sourceFile);
      }

      const res = await generate({
        data: {
          kind: "video",
          prompt: prompt.trim(),
          modelId: selection.modelId,
          durationSec: duration,
          aspect,
          resolution,
          audio: audioOn,
          styleId: styleId === "none" ? undefined : styleId,
          sourceImage: imageBase64,
          tier: effectiveTier,
          mode,
        },
      });

      if (res?.error) throw new Error(res.error);
      const url = res?.url || res?.videoUrl;
      if (!url) throw new Error("No video returned");

      setResult({
        videoUrl: url,
        url,
        modelId: selection.modelId,
        creditsUsed: creditEstimate.total,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      endGeneration();
    }
  }, [
    readyRef,
    prompt,
    mode,
    sourceFile,
    duration,
    resolution,
    durationLocks,
    resolutionLocks,
    effectiveTier,
    aspect,
    audioOn,
    styleId,
    generate,
    creditEstimate.total,
  ]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#FFF8F3]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF7A45] border-t-transparent" />
      </div>
    );
  }

  if (!allowed && !admin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#FFF8F3] px-4 text-center">
        <Lock className="h-10 w-10 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-800">Video Studio</h1>
        <p className="max-w-sm text-sm text-slate-600">
          Upgrade your plan to unlock AI video generation.
        </p>
        <Link
          to="/pricing"
          className="rounded-xl bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] px-5 py-2.5 text-sm font-bold text-white"
        >
          View plans
        </Link>
      </div>
    );
  }

  // Dedicated full-screen output
  if (result?.videoUrl || result?.url) {
    return (
      <VideoOutputView
        result={result}
        tier={effectiveTier}
        onClose={() => setResult(null)}
        onRegenerate={() => {
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#FFF8F3] text-slate-900">
      {/* soft orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#FF7A45]/10 blur-3xl" />
        <div className="absolute -right-16 top-40 h-56 w-56 rounded-full bg-[#F43F5E]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-lg flex-col gap-4 px-3 pb-28 pt-3 sm:px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/studio"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm backdrop-blur"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#FF7A45]" />
            <h1 className="text-base font-bold tracking-tight">Video Studio</h1>
          </div>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm backdrop-blur"
            aria-label="Credit info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Mode selector */}
        <VideoModeSelector mode={mode} onChange={handleModeChange} disabled={busy} />

        {/* Source upload (image / video modes) */}
        {(mode === "image" || mode === "video") && (
          <VideoSourceUpload
            mode={mode === "image" ? "image" : "video"}
            file={sourceFile}
            previewUrl={sourceUrl}
            onPick={onPickSource}
            onClear={onClearSource}
            disabled={busy}
          />
        )}

        {/* Prompt */}
        <VideoPromptBar
          value={prompt}
          onChange={setPrompt}
          maxChars={maxChars}
          disabled={busy}
          durationSec={duration}
          placeholder={
            mode === "text"
              ? "Describe the video you want…"
              : mode === "image"
                ? "Describe how to animate this image…"
                : "Describe the edit or restyle…"
          }
        />

        {/* Standard / Premium toggle — explicit, visible */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 p-1.5 shadow-sm backdrop-blur-xl ring-1 ring-black/5">
          <button
            type="button"
            disabled={busy}
            onClick={() => setTier("standard")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
              tier === "standard"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            ⚡ Standard
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setTier("premium")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
              tier === "premium"
                ? "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-200"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            👑 Premium
          </button>
        </div>

        {/* Style strip */}
        <div className="space-y-1.5">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Style
          </p>
          <VideoStyleStrip
            selectedId={styleId}
            onSelect={setStyleId}
            plan={profile?.plan}
            isAdmin={admin}
            disabled={busy}
          />
        </div>

        {/* Feature panel (duration / aspect / resolution / audio) */}
        <VideoFeaturePanel
          duration={duration}
          onDurationChange={setDuration}
          durations={caps.durations}
          durationLocks={durationLocks}
          aspect={aspect}
          onAspectChange={setAspect}
          aspects={caps.aspects}
          resolution={resolution}
          onResolutionChange={setResolution}
          resolutions={caps.resolutions}
          resolutionLocks={resolutionLocks}
          audioOn={audioOn}
          onAudioChange={setAudioOn}
          audioSupported={caps.audioSupported}
          disabled={busy}
        />

        {/* Generate — label only; cost lives in (i) sheet */}
        <button
          type="button"
          disabled={busy}
          onClick={handleGenerate}
          className={cn(
            "w-full rounded-2xl bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] py-3.5 text-base font-bold text-white shadow-lg shadow-rose-500/25 transition active:scale-[0.99]",
            busy && "opacity-70",
          )}
        >
          {busy ? "Generating…" : "Generate"}
        </button>

        {welcomeFree && (
          <p className="text-center text-[11px] text-emerald-700">
            Welcome free video available on this account
          </p>
        )}
      </div>

      {busy && <VideoGeneratingOverlay />}

      {/* Credits sheet — single total only, no surcharge breakdown */}
      {creditsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setCreditsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-[#FF7A45]" />
                <h2 className="text-base font-bold text-slate-900">Credit estimate</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreditsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">
              {creditEstimate.total}
              <span className="ml-1 text-base font-semibold text-slate-500">credits</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Based on current settings ({tier === "premium" ? "Premium" : "Standard"}, {" "}
              {duration}s, {resolution}
              {audioOn ? ", audio" : ""}, {mode} mode).
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => setCreditsOpen(false)}
            >
              Got it
            </Button>
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
