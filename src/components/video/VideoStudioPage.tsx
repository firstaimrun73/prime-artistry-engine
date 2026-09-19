/**
 * Video Studio page — Phase D restore.
 * D1 dual source, D2 quote credits, D4 watermark, D5 progress overlay.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Coins, Info, Lock, Video, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import { VideoModeSelector } from "@/components/video/VideoModeSelector";
import { VideoPromptBar, VIDEO_PROMPT_MAX } from "@/components/video/VideoPromptBar";
import { quoteVideoCredits } from "@/lib/video/video-routes";
import { TIERS } from "@/lib/plan-tier";
import { readKeepWatermarkPref } from "@/lib/watermark-pref";
import type { PlanId } from "@/lib/plans";
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
  parsePromptTiming,
  validateTimingAgainstDuration,
} from "@/lib/video/prompt-timing";
import {
  isDurationAllowed,
  planRequiredForDuration,
} from "@/lib/video-options";
import type { VideoStudioResult } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

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
    const durations = Array.from(new Set([...(a.durations ?? []), ...(b.durations ?? [])])).sort((x, y) => x - y);
    const resolutions = Array.from(new Set([...(a.resolutions ?? []), ...(b.resolutions ?? [])])) as VideoResolution[];
    const aspects = Array.from(new Set([...(a.aspects ?? []), ...(b.aspects ?? [])])) as VideoAspect[];
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

export function VideoStudioPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email ?? user?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("none");
  const [imageSource, setImageSource] = useState<{ file: File; url: string } | null>(null);
  const [videoSource, setVideoSource] = useState<{ file: File; url: string } | null>(null);
  const imageSourceRef = useRef(imageSource);
  const videoSourceRef = useRef(videoSource);
  imageSourceRef.current = imageSource;
  videoSourceRef.current = videoSource;
  const [busy, setBusy] = useState(false);
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [viewAsPlan, setViewAsPlan] = useState<PlanId | "real">("real");
  const [lockedOption, setLockedOption] = useState<{
    kind: "duration" | "quality" | "style";
    id: string;
    reason: string;
    badge?: string;
  } | null>(null);
  const [inputVideoSec, setInputVideoSec] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setWatermarkOn(readKeepWatermarkPref()); } catch { /* ignore */ }
  }, []);

  const effectivePlan: PlanId | string | null | undefined =
    admin && viewAsPlan !== "real" ? viewAsPlan : profile?.plan;
  const tier: VideoTier = duration >= 15 || resolution === "1080p" ? "premium" : "standard";
  const generate = useServerFn(generateMedia);
  const welcomeStatus = useServerFn(getWelcomeFreeVideoStatus);

  useEffect(() => {
    if (!user) return;
    void welcomeStatus({}).then((s) => { if (s?.eligible) setWelcomeFree(true); }).catch(() => {});
  }, [user, welcomeStatus]);

  useEffect(() => {
    if (busy && canvasRef.current) canvasRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [busy]);

  const caps = useMemo(() => unionCaps(mode), [mode]);
  const durations = [5, 10, 15];
  const resolutionOptions: VideoResolution[] = ["480p", "720p", "1080p"];
  const aspectOptions = (caps.aspects.length ? caps.aspects : ["16:9", "9:16", "1:1"]) as VideoAspect[];

  const disabledDurations = useMemo(() => {
    const map: Partial<Record<number, string>> = {};
    for (const d of durations) {
      if (caps.durations.length && !caps.durations.includes(d)) map[d] = "Not supported for this mode";
    }
    return map;
  }, [caps.durations]);

  const lockedDurations = useMemo(() => {
    const map: Partial<Record<number, { reason: string; badge: string }>> = {};
    const asAdmin = admin && viewAsPlan === "real";
    for (const d of durations) {
      if (disabledDurations[d]) continue;
      if (!isDurationAllowed(effectivePlan, d, asAdmin)) {
        const badge = planRequiredForDuration(d);
        map[d] = { reason: `Requires ${badge} plan`, badge };
      }
    }
    return map;
  }, [disabledDurations, effectivePlan, admin, viewAsPlan]);

  const disabledResolutions = useMemo(() => {
    const map: Partial<Record<string, string>> = {};
    for (const r of resolutionOptions) {
      if (caps.resolutions.length && !caps.resolutions.includes(r)) map[r] = "Not supported for this mode";
    }
    return map;
  }, [caps.resolutions]);

  const lockedResolutions = useMemo(() => {
    const map: Partial<Record<string, { reason: string; badge: string }>> = {};
    const asAdmin = admin && viewAsPlan === "real";
    for (const r of resolutionOptions) {
      if (disabledResolutions[r]) continue;
      if (r === "1080p") {
        const plan = (effectivePlan ?? "free") as PlanId;
        const q = TIERS[plan]?.videoQualityLabel ?? "—";
        const allows1080 = asAdmin || q.includes("1080") || q.includes("4K") || q.includes("2K");
        if (!allows1080) map[r] = { reason: "Unlock 1080p with Pro and above", badge: "Pro" };
      }
    }
    return map;
  }, [disabledResolutions, effectivePlan, admin, viewAsPlan]);

  useEffect(() => {
    if (!aspectOptions.includes(aspect) && aspectOptions[0]) setAspect(aspectOptions[0]);
  }, [aspectOptions, aspect]);
  useEffect(() => {
    if (!caps.audioSupported && audioOn) setAudioOn(false);
  }, [caps.audioSupported, audioOn]);

  const promptMax = VIDEO_PROMPT_MAX;
  const activeSource = mode === "image" ? imageSource : mode === "video" ? videoSource : null;
  const sourceUrl = activeSource?.url ?? null;
  const sourceFile = activeSource?.file ?? null;
  const quoteDurationSec =
    mode === "video" && inputVideoSec != null && inputVideoSec > 0
      ? Math.ceil(inputVideoSec)
      : duration;

  const price = useMemo(() => {
    const r = quoteVideoCredits({ mode, durationSec: quoteDurationSec, resolution, aspect, audio: audioOn });
    if (!r.ok) return { credits: 0, supported: false as boolean, reason: r.reason as string | undefined };
    return { credits: r.quote.credits, supported: true as boolean, reason: undefined as string | undefined, routeId: r.quote.routeId };
  }, [mode, quoteDurationSec, resolution, aspect, audioOn]);
  const creditsEstimate = price.supported ? price.credits : 0;

  const creditRows = useMemo(() => {
    const rows: { label: string; credits: number }[] = [];
    if (mode === "video") {
      if (!sourceUrl || quoteDurationSec <= 0) return rows;
      for (const res of ["480p", "720p", "1080p"] as const) {
        for (const sound of [false, true]) {
          const r = quoteVideoCredits({ mode: "video", durationSec: quoteDurationSec, resolution: res, aspect, audio: sound });
          if (r.ok) rows.push({ label: `${quoteDurationSec}s · ${res === "480p" ? "SD" : res}${sound ? " · Sound" : ""}`, credits: r.quote.credits });
        }
      }
      return rows;
    }
    for (const d of [5, 10, 15]) {
      for (const res of ["480p", "720p", "1080p"] as const) {
        for (const sound of [false, true]) {
          const r = quoteVideoCredits({ mode, durationSec: d, resolution: res, aspect, audio: sound });
          if (r.ok) rows.push({ label: `${d}s · ${res === "480p" ? "SD" : res}${sound ? " · Sound" : ""}`, credits: r.quote.credits });
        }
      }
    }
    return rows;
  }, [mode, quoteDurationSec, aspect, sourceUrl]);

  const onPickSource = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    if (mode === "image") {
      setImageSource((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return { file, url }; });
    } else if (mode === "video") {
      setVideoSource((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return { file, url }; });
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        if (Number.isFinite(v.duration)) setInputVideoSec(v.duration);
        URL.revokeObjectURL(v.src);
      };
      v.src = url;
    }
    setResult(null);
  }, [mode]);

  const onClearSource = useCallback(() => {
    if (mode === "image") {
      setImageSource((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
    } else if (mode === "video") {
      setVideoSource((prev) => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
      setInputVideoSec(null);
    }
  }, [mode]);

  const onModeChange = useCallback((m: VideoGenMode) => { setMode(m); setResult(null); }, []);

  useEffect(() => {
    return () => {
      const img = imageSourceRef.current;
      const vid = videoSourceRef.current;
      if (img?.url) URL.revokeObjectURL(img.url);
      if (vid?.url) URL.revokeObjectURL(vid.url);
    };
  }, []);

  const onGenerate = useCallback(async () => {
    if (!allowed && !welcomeFree) { toast.error("Upgrade to unlock Video Studio"); navigate({ to: "/pricing" }); return; }
    const p = prompt.trim();
    if (!p) { toast.error("Add a prompt describing your video"); return; }
    if (mode === "image" && !sourceUrl) { toast.error("Upload a source image first"); return; }
    if (mode === "video" && !sourceUrl) { toast.error("Upload a source video first"); return; }
    if (disabledDurations[duration]) { toast.error(disabledDurations[duration]); return; }
    if (!price.supported && mode !== "video") { toast.error(price.reason || videoSelectionUnavailableMessage()); return; }
    const timing = parsePromptTiming(p);
    if (timing.errors[0]) { toast.error(timing.errors[0]); return; }
    const timingErrs = validateTimingAgainstDuration(timing.cues, duration);
    if (timingErrs[0]) { toast.error(timingErrs[0]); return; }
    const selection = selectVideoModel({ mode, tier, durationSec: duration, resolution, aspect, soundOn: audioOn });
    if (!selection && mode !== "video") { toast.error(videoSelectionUnavailableMessage()); return; }

    setResult(null);
    setBusy(true);
    setGenStartedAt(Date.now());
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
          videoDurationSeconds: mode === "video" && inputVideoSec ? Math.ceil(inputVideoSec) : duration,
          videoResolution: resolution,
          videoAspectRatio: aspect,
          videoStyleId: styleId && styleId !== "none" ? styleId : undefined,
          videoGenerateAudio: audioOn,
          sourceKind: mode === "video" ? "video" : mode === "image" ? "image" : undefined,
          studioTier: tier === "premium" ? "premium" : "standard",
          keepWatermark: watermarkOn,
        },
      });
      const outputUrl = (res as { outputUrl?: string })?.outputUrl ?? (res as { url?: string })?.url ?? null;
      if (!outputUrl) throw new Error((res as { error?: string })?.error || "Generation failed — no video returned");
      const charged = (res as { creditsCharged?: number })?.creditsCharged ?? (res as { credits?: number })?.credits ?? creditsEstimate;
      const qualityOut: "480p" | "720p" | "1080p" = resolution === "1080p" ? "1080p" : resolution === "480p" ? "480p" : "720p";
      setResult({
        outputUrl,
        mode: mode === "video" ? "video" : mode === "image" ? "image" : "text",
        prompt: p,
        duration: (duration === 15 ? 15 : duration === 10 ? 10 : 5) as 5 | 10 | 15,
        aspect: (aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as "16:9" | "9:16" | "1:1",
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
      setGenStartedAt(null);
      endGeneration();
    }
  }, [allowed, welcomeFree, prompt, mode, sourceUrl, sourceFile, duration, aspect, resolution, tier, audioOn, styleId, price, creditsEstimate, generate, navigate, disabledDurations, watermarkOn, inputVideoSec]);

  const onDownload = useCallback(async () => {
    if (!result?.outputUrl) return;
    try { await triggerBrowserDownload(result.outputUrl, `motio2edit-video-${Date.now()}.mp4`); }
    catch { toast.error("Download failed"); }
  }, [result]);

  if (authLoading) {
    return <div className="flex min-h-[70dvh] items-center justify-center p-6"><p className="text-sm text-muted-foreground">Loading Video Studio…</p></div>;
  }
  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10"><Video className="h-7 w-7 text-red-400" /></div>
        <p className="text-center text-base font-semibold">Sign in to open Video Studio</p>
        <Button asChild className="rounded-full px-6"><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }
  if (!allowed && !welcomeFree) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10"><Lock className="h-7 w-7 text-amber-400" /></div>
        <p className="text-center text-lg font-semibold">Video Studio is on paid plans</p>
        <Button asChild className="rounded-full px-6"><Link to="/pricing">View plans</Link></Button>
      </div>
    );
  }

  const canGenerate = !busy && !!prompt.trim() && !disabledDurations[duration] && (mode === "video" ? !!sourceUrl : mode === "text" || !!sourceUrl);
  const glass = "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5 dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]";
  const creditBalance = typeof profile?.credits === "number" ? profile.credits : null;
  const showCanvas = busy || !!result?.outputUrl;

  return (
    <div className="video-studio-root relative min-h-[100dvh]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFF1E8,#F3E8FF_55%,#E6F0FF)] dark:bg-[#0A0B14]" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#FF8A4C]/[0.35] blur-[80px]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#8B5CF6]/[0.35] blur-[80px]" />
      </div>
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-4 pb-40 sm:px-5">
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <Link to="/" className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", glass, "text-slate-700 dark:text-zinc-200")} aria-label="Back to Home">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">Video Studio</h1>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">by Motion2Ai</p>
            </div>
            {creditBalance != null && (
              <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold tabular-nums", glass)}>
                <Coins className="h-3.5 w-3.5 text-[#FF7A45]" />{creditBalance}
              </div>
            )}
            <button type="button" onClick={() => setCreditsOpen(true)} className={cn("grid h-10 w-10 place-items-center rounded-full", glass)} aria-label="Credits info">
              <Info className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mb-4"><VideoModeSelector value={mode} onChange={onModeChange} disabled={busy} /></div>

        {showCanvas && (
          <div ref={canvasRef} className={cn("relative mb-4 overflow-hidden", glass, aspectBoxClass(aspect))}>
            {result?.outputUrl && !busy ? (
              <VideoOutputView result={result} onDownload={onDownload} onClose={() => setResult(null)} />
            ) : (
              <VideoGeneratingOverlay etaSeconds={90} startedAt={genStartedAt ?? undefined} />
            )}
          </div>
        )}

        {(mode === "image" || mode === "video") && (
          <div className="mb-4">
            <VideoSourceUpload
              mode={mode}
              file={activeSource?.file ?? null}
              previewUrl={sourceUrl}
              onPick={onPickSource}
              onClear={onClearSource}
              disabled={busy}
              aspect={aspect}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((g) => !g)}
            />
          </div>
        )}

        <div className="mb-4">
          <VideoPromptBar value={prompt} onChange={setPrompt} maxChars={promptMax} disabled={busy} />
        </div>

        <div className="mb-4">
          <VideoStyleStrip value={styleId} onChange={setStyleId} disabled={busy} />
        </div>

        <div className="mb-4">
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
            soundAvailable={caps.audioSupported}
            disabled={busy}
            disabledDurations={disabledDurations}
            disabledResolutions={disabledResolutions}
            lockedDurations={lockedDurations}
            lockedResolutions={lockedResolutions}
            onLockedOption={(info) => setLockedOption(info)}
            videoMode={mode === "video"}
            inputDurationSec={inputVideoSec}
            watermarkOn={watermarkOn}
            setWatermarkOn={(v) => {
              setWatermarkOn(v);
              try { localStorage.setItem("motio2edit-watermark-pref", v ? "on" : "off"); } catch { /* ignore */ }
            }}
            watermarkLocked={!admin && (effectivePlan === "free" || !effectivePlan)}
            onWatermarkLocked={() => setLockedOption({
              kind: "style",
              id: "watermark",
              reason: "Free plan always includes the Motio2edit watermark. Upgrade to turn it off.",
            })}
          />
        </div>

        {admin && (
          <div className={cn("mb-4 p-3", glass)}>
            <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500">View as plan (admin)</p>
            <div className="flex flex-wrap gap-2">
              {(["real", "free", "lite", "pro", "studio"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setViewAsPlan(p)}
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold", viewAsPlan === p ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E] text-white" : "border border-slate-300/80 bg-white/50")}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" disabled={!canGenerate} onClick={() => void onGenerate()}
          className={cn("flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(244,63,94,0.4)] transition",
            canGenerate ? "bg-gradient-to-r from-[#FF7A45] to-[#F43F5E]" : "cursor-not-allowed bg-slate-400/80")}>
          {busy ? "Generating…" : "Generate Video"}
        </button>
      </div>

      {creditsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className={cn("w-full max-w-md p-5", glass, "bg-white dark:bg-zinc-900")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Credits</h2>
              <button type="button" onClick={() => setCreditsOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-lg font-bold text-[#F43F5E]">This video: ~{creditsEstimate || "—"} credits</p>
            <div className="max-h-60 space-y-1 overflow-y-auto text-[12px]">
              {creditRows.slice(0, 24).map((row) => (
                <div key={row.label} className="flex justify-between border-b border-black/5 py-1 dark:border-white/10">
                  <span className="text-slate-600 dark:text-zinc-400">{row.label}</span>
                  <span className="font-semibold tabular-nums">{row.credits}</span>
                </div>
              ))}
            </div>
            {creditBalance != null && <p className="mt-3 text-[12px] text-slate-500">Balance: {creditBalance}</p>}
          </div>
        </div>
      )}

      {lockedOption && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className={cn("w-full max-w-md p-5", glass, "bg-white dark:bg-zinc-900")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Upgrade required</h2>
              <button type="button" onClick={() => setLockedOption(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-zinc-300">{lockedOption.reason}</p>
            <Button asChild className="w-full rounded-full"><Link to="/pricing">View plans</Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
