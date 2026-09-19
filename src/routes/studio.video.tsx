/**
 * Motio2edit Video Studio v2 — UI round 2 (video-studio-v2 branch).
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
  Lock as LockIcon,
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
  VIDEO_STYLE_UI,
  STYLE_FALLBACK_GRADIENT,
  styleThumbSrc,
} from "@/lib/videoStyles";
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
  const [thumbFailed, setThumbFailed] = useState<Record<string, boolean>>({});
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
      {/* Scoped page bg + blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFF1E8,#F3E8FF_55%,#E6F0FF)] dark:bg-[#0A0B14]" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#FF8A4C]/[0.35] blur-[80px] dark:bg-[#FF8A4C]/[0.25]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#8B5CF6]/[0.35] blur-[80px] dark:bg-[#8B5CF6]/[0.25]" />
        <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#38BDF8]/[0.35] blur-[80px] dark:bg-[#38BDF8]/[0.25]" />
      </div>

      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-4 pb-40 sm:px-5">
        {/* Header: back | title | credits */}
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

        {/* Canvas: only while busy or has result (Text mode has none before gen) */}
        {showCanvas && (
          <div
            ref={canvasRef}
            className={cn(
              "relative mb-4 overflow-hidden transition-all duration-300",
              glass,
              aspectBoxClass(aspect),
              busy && "animate-in fade-in zoom-in-95",
            )}
          >
            {result?.outputUrl && !busy ? (
              <>
                <div className="absolute right-2 top-2 z-10">
                  <button
                    type="button"
                    onClick={() => setShowGrid((g) => !g)}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/70 backdrop-blur-md dark:border-white/20 dark:bg-black/50",
                      showGrid && "ring-2 ring-[#F43F5E]",
                    )}
                    aria-label="Toggle grid"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                </div>
                <video
                  src={result.outputUrl}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                />
                {showGrid && (
                  <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
                    <div className="absolute left-1/3 top-0 h-full w-px bg-white" />
                    <div className="absolute left-2/3 top-0 h-full w-px bg-white" />
                    <div className="absolute left-0 top-1/3 h-px w-full bg-white" />
                    <div className="absolute left-0 top-2/3 h-px w-full bg-white" />
                  </div>
                )}
              </>
            ) : (
              <>
                {sourceUrl && mode !== "text" && (
                  <div className="absolute inset-0">
                    {mode === "video" ? (
                      <video
                        src={sourceUrl}
                        className="h-full w-full object-cover opacity-40 blur-[2px]"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={sourceUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-40 blur-[2px]"
                      />
                    )}
                  </div>
                )}
                <VideoGeneratingOverlay />
              </>
            )}
          </div>
        )}

        {/* Upload for image/video when not showing result canvas takeover */}
        {(mode === "image" || mode === "video") && !result?.outputUrl && (
          <div className={cn("mb-4", busy && "pointer-events-none opacity-50")}>
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
        )}

        <section className="mb-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
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

        {/* Style strip */}
        <section className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Style
          </p>
          <div className="relative">
            <div className="studio-hide-scroll -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 snap-x snap-mandatory">
              {VIDEO_STYLE_UI.map((s) => {
                const active = styleId === s.id;
                const src = styleThumbSrc(s.id);
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
                      "flex w-[96px] shrink-0 snap-start flex-col items-center gap-1 transition-transform duration-200",
                      active && "scale-[1.04]",
                      s.locked && "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "relative block w-full overflow-hidden rounded-xl",
                        active && "ring-2 ring-[#F43F5E] shadow-[0_6px_18px_rgba(244,63,94,0.35)]",
                      )}
                    >
                      {s.id === "none" || !src || failed ? (
                        <span
                          className={cn(
                            "flex aspect-video w-full items-center justify-center bg-gradient-to-br",
                            grad,
                            s.id === "none" && glass,
                          )}
                        >
                          {s.id === "none" && (
                            <X className="h-5 w-5 text-slate-400" aria-hidden />
                          )}
                        </span>
                      ) : (
                        <img
                          src={src}
                          alt=""
                          className="aspect-video w-full object-cover"
                          onError={() =>
                            setThumbFailed((prev) => ({ ...prev, [s.id]: true }))
                          }
                        />
                      )}
                      {s.locked && (
                        <span className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5">
                          <LockIcon className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-center text-[11px] font-semibold",
                        active
                          ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] bg-clip-text text-transparent"
                          : "text-slate-600 dark:text-zinc-300",
                      )}
                    >
                      {s.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#FFF1E8] to-transparent dark:from-[#0A0B14]"
              aria-hidden
            />
          </div>
        </section>

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

      {/* Sticky bar */}
      {!result && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 border-t border-white/40 p-3",
            "bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0A0B14]/85",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void onGenerate()}
              className={cn(
                "relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-semibold text-white transition",
                "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] shadow-[0_6px_18px_rgba(244,63,94,0.35)]",
                !canGenerate && "opacity-45",
                canGenerate && "active:scale-[0.98]",
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {busy
                ? "Generating…"
                : creditsEstimate > 0
                  ? `Generate · ~${creditsEstimate} credits`
                  : "Generate Video"}
            </button>
            <button
              type="button"
              onClick={() => setCreditsOpen(true)}
              className={cn("grid h-12 w-12 shrink-0 place-items-center", glass)}
              aria-label="Credit costs"
            >
              <Info className="h-5 w-5 text-slate-600 dark:text-zinc-300" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-500 dark:text-zinc-400">
            Credits are refunded if generation fails
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
          <div className={cn("relative z-10 w-full max-w-lg rounded-t-[24px] p-5", glass)}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Credit estimate</p>
              <button
                type="button"
                onClick={() => setCreditsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 dark:border-white/15"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {creditRows.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                >
                  <span className="text-slate-500 dark:text-zinc-400">{row.label}</span>
                  <span className="font-semibold tabular-nums">~{row.credits}</span>
                </li>
              ))}
              {creditRows.length === 0 && (
                <li className="text-slate-500">Estimates update with your settings.</li>
              )}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400">
              Current: ~{creditsEstimate} credits · refunded if generation fails
            </p>
          </div>
        </div>
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
        .video-studio-root .studio-hide-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .video-studio-root .studio-hide-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes studio-cam-pulse {
          0%, 100% { transform: rotate(-4deg) scale(1); filter: drop-shadow(0 0 0 transparent); }
          50% { transform: rotate(4deg) scale(1.06); filter: drop-shadow(0 0 8px rgba(255,122,69,0.55)); }
        }
        .studio-cam-icon {
          animation: studio-cam-pulse 2.6s ease-in-out infinite;
          display: inline-block;
        }
        @media (prefers-reduced-motion: reduce) {
          .studio-cam-icon { animation: none; }
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
