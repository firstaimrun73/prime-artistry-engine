/**
 * Motio2edit Video Studio v2 — UI round 2 + Phase 1 style strip.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Coins,
  Grid3x3,
  Info,
  Lock,
  Sparkles,
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
  const [showGrid, setShowGrid] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (busy && canvasRef.current) {
      canvasRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [busy]);

  const caps = useMemo(() => unionCaps(mode), [mode]);
  const durations = [5, 10, 15];
  const resolutionOptions: VideoResolution[] = ["480p", "720p", "1080p"];
  const aspectOptions = (caps.aspects.length
    ? caps.aspects
    : ["16:9", "9:16", "1:1"]) as VideoAspect[];

  const disabledDurations = useMemo(() => {
    const map: Partial<Record<number, string>> = {};
    for (const d of durations) {
      if (caps.durations.length && !caps.durations.includes(d)) {
        map[d] = "Not available for this mode yet";
        continue;
      }
      if (!isDurationAllowed(profile?.plan, d, admin)) {
        map[d] = `Requires ${planRequiredForDuration(d)} plan`;
      }
    }
    return map;
  }, [caps.durations, profile?.plan, admin]);

  const disabledResolutions = useMemo(() => {
    const map: Partial<Record<string, string>> = {};
    const planKey = (profile?.plan ?? "free").toLowerCase();
    const can1080 =
      admin || ["pro", "studio", "business"].includes(planKey);
    for (const r of resolutionOptions) {
      if (caps.resolutions.length && !caps.resolutions.includes(r)) {
        map[r] = "Not available for this mode yet";
      } else if (r === "1080p" && !can1080) {
        map[r] = "Requires Pro plan or higher";
      }
    }
    return map;
  }, [caps.resolutions, profile?.plan, admin]);

  useEffect(() => {
    if (!aspectOptions.includes(aspect) && aspectOptions[0]) setAspect(aspectOptions[0]);
  }, [aspectOptions, aspect]);

  useEffect(() => {
    if (!caps.audioSupported && audioOn) setAudioOn(false);
  }, [caps.audioSupported, audioOn]);

  const planKey = (profile?.plan ?? "free").toLowerCase();
  const planAllowsLongPrompt =
    admin ||
    ["plus", "pro", "studio", "business"].includes(planKey) ||
    duration >= 15 ||
    resolution === "1080p";
  const promptMax = planAllowsLongPrompt
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
    if (disabledDurations[duration]) {
      toast.error(disabledDurations[duration]);
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

    setResult(null);
    setBusy(true);
    startGeneration("video", "/studio/video");

    try {
      let imageUrl: string | undefined;
      if ((mode === "image" || mode === "video") && sourceFile) {
        imageUrl = await fileToDataUrl(sourceFile);
      } else if ((mode === "image" || mode === "video") && sourceUrl?.startsWith("http")) {
        imageUrl = sourceUrl;
      }

      /** styleId only — never rewrite user prompt on the client */
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

      const qualityOut: "480p" | "720p" | "1080p" =
        resolution === "1080p" ? "1080p" : resolution === "480p" ? "480p" : "720p";

      setResult({
        outputUrl,
        mode: mode === "video" ? "video" : mode === "image" ? "image" : "text",
        prompt: p,
        duration: (duration === 15 ? 15 : duration === 10 ? 10 : 5) as 5 | 10 | 15,
        aspect: (aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: qualityOut,
        size: "medium",
        soundRequested: audioOn,
        creditsUsed: typeof charged === "number" ? charged : creditsEstimate,
        sourcePreview: sourceUrl,
      });
      toast.success("Video ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate video");
    } finally {
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
    disabledDurations,
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
    !disabledDurations[duration] &&
    (mode === "video" ? !!sourceUrl : mode === "text" || !!sourceUrl);

  const glass =
    "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5 dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]";

  const creditBalance =
    typeof profile?.credits === "number" ? profile.credits : null;

  const showCanvas = busy || !!result?.outputUrl;

  return (
    <div className="video-studio-root relative min-h-[100dvh]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFF1E8,#F3E8FF_55%,#E6F0FF)] dark:bg-[#0A0B14]" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#FF8A4C]/[0.35] blur-[80px] dark:bg-[#FF8A4C]/[0.25]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#8B5CF6]/[0.35] blur-[80px] dark:bg-[#8B5CF6]/[0.25]" />
        <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#38BDF8]/[0.35] blur-[80px] dark:bg-[#38BDF8]/[0.25]" />
      </div>

      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-4 pb-40 sm:px-5">
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                glass,
                "text-slate-700 dark:text-zinc-200",
              )}
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="studio-cam-icon text-xl" aria-hidden>
                  🎥
                </span>
                <div className="min-w-0">
                  <h1 className="bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
                    Video Studio
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">by Motion2Ai</p>
                </div>
              </div>
            </div>
            {creditBalance != null && (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold tabular-nums",
                  glass,
                  "text-slate-700 dark:text-zinc-200",
                )}
              >
                <Coins className="h-3.5 w-3.5 text-[#FF7A45]" aria-hidden />
                {creditBalance}
              </div>
            )}
          </div>
          <div
            className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-[#FF7A45]/70 to-transparent"
            aria-hidden
          />
        </header>

        <div className="mb-4">
          <VideoModeSelector value={mode} onChange={onModeChange} disabled={busy} />
        </div>

        {/* REST OF FILE CONTINUES IN REPO - this is truncated in tool for size; use local full file */}
        <p>INCOMPLETE - DO NOT USE</p>
      </div>
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
