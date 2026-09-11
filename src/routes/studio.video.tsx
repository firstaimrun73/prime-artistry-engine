/**
 * Motio2edit Video Studio — scroll-free premium creative workspace.
 * Billing: generateMedia → quote → reserve → finalize (server authoritative).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Lock, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
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
  type VideoGenMode,
  type VideoAspect,
  type VideoResolution,
  type VideoTier,
} from "@/lib/video-model-registry";
import {
  computeMotioVideoCredits,
  qualityFromResolution,
} from "@/lib/motio-video-credits";
import {
  parsePromptTiming,
  validateTimingAgainstDuration,
} from "@/lib/video/prompt-timing";
import type { VideoStudioResult } from "@/components/video/video-studio-types";
import { VIDEO_PROMPT_SUGGESTIONS } from "@/components/video/video-studio-types";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Create AI video from text, image, or video." },
    ],
  }),
  component: VideoStudioPage,
});

function planAllowsPremium(plan: string | null | undefined, admin: boolean): boolean {
  if (admin) return true;
  const p = (plan ?? "").toLowerCase();
  return p.includes("pro") || p.includes("premium") || p.includes("business") || p.includes("studio");
}

function VideoStudioPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const freeStatusFn = useServerFn(getWelcomeFreeVideoStatus);

  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });
  const premiumAllowed = planAllowsPremium(profile?.plan, admin);

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [audioOn, setAudioOn] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [freeVideoEligible, setFreeVideoEligible] = useState(false);
  const [freeVideoLabel, setFreeVideoLabel] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const caps = useMemo(() => capabilitiesForMode(tier), [tier]);
  const availableMax = useMemo(
    () => availableMaxDurationFor(tier, resolution, audioOn || promptMentionsAudio(prompt)),
    [tier, resolution, audioOn, prompt],
  );
  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
  const tierDurations = useMemo(() => caps.durations, [caps.durations]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    const primary = caps.aspects.filter((a) => a === "16:9" || a === "9:16" || a === "1:1");
    if (primary.length && !primary.includes(aspect as any)) setAspect(primary[0] ?? "16:9");
    if (caps.resolutions.length && !caps.resolutions.includes(resolution)) {
      setResolution(caps.resolutions[0] ?? "720p");
    }
    if (tierDurations.length && !tierDurations.includes(duration)) {
      setDuration(tierDurations[0] ?? 5);
    }
    if (duration > availableMax && availableMax > 0) {
      setDuration(Math.min(duration, availableMax));
    }
  }, [caps, aspect, resolution, duration, availableMax, tierDurations]);

  const effectiveAudio = useMemo(() => {
    if (audioOn) return true;
    if (promptMentionsAudio(prompt)) return true;
    return false;
  }, [audioOn, prompt]);

  useEffect(() => {
    if (promptMentionsAudio(prompt) && caps.audioSupported && !audioOn) {
      setAudioOn(true);
    }
  }, [prompt, caps.audioSupported]);

  const price = useMemo(
    () =>
      computeMotioVideoCredits({
        tier,
        durationSec: duration,
        quality: qualityFromResolution(resolution),
        soundOn: effectiveAudio,
        mode,
      }),
    [mode, tier, duration, resolution, effectiveAudio],
  );
  const cost = price.credits;
  const costSupported = price.supported;

  useEffect(() => {
    if (!user || !allowed || busy) {
      setFreeVideoEligible(false);
      setFreeVideoLabel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const st = await freeStatusFn({
          data: {
            mode,
            durationSec: duration,
            resolution,
            audio: effectiveAudio,
            productMode: tier,
          },
        });
        if (cancelled) return;
        setFreeVideoEligible(!!st?.eligible);
        setFreeVideoLabel(st?.eligible ? (st.label ?? "1 free video") : null);
      } catch {
        if (!cancelled) {
          setFreeVideoEligible(false);
          setFreeVideoLabel(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, allowed, busy, mode, duration, resolution, effectiveAudio, tier, freeStatusFn]);

  const selected = useMemo(
    () =>
      selectVideoModel({
        mode,
        tier,
        durationSec: duration,
        resolution,
        aspect,
        soundOn: effectiveAudio,
      }),
    [mode, tier, duration, resolution, aspect, effectiveAudio],
  );

  const eta = Math.max(30, Math.round(duration * 8));

  useEffect(() => {
    if (!busy) {
      setStageIdx(0);
      return;
    }
    setStageIdx(0);
    const timers = [0, 1, 2, 3].map((i) =>
      window.setTimeout(() => setStageIdx(i), i * Math.max(2500, Math.floor((eta * 1000) / 4))),
    );
    return () => timers.forEach(clearTimeout);
  }, [busy, eta]);

  const clearMedia = useCallback(() => {
    if (mediaPreview?.startsWith("blob:")) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  }, [mediaPreview]);

  const onPickMedia = useCallback(
    (f: File) => {
      if (mediaPreview?.startsWith("blob:")) URL.revokeObjectURL(mediaPreview);
      setMediaFile(f);
      setMediaPreview(URL.createObjectURL(f));
    },
    [mediaPreview],
  );

  const canGenerate = useMemo(() => {
    if (busy) return false;
    if (!costSupported) return false;
    if (duration > availableMax && availableMax > 0) return false;
    if (mode === "video") return !!mediaFile;
    if (!prompt.trim()) return false;
    if (mode === "image" && !mediaFile) return false;
    if (!selected) return false;
    return true;
  }, [prompt, mode, mediaFile, duration, availableMax, selected, costSupported, busy]);

  const uploadMedia = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `video-studio/${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message || "Upload failed");
    const { data } = supabase.storage.from("uploads").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Could not get media URL");
    return data.publicUrl;
  };

  const onGenerate = async () => {
    if (!canGenerate || busy) return;
    if (!costSupported) {
      toast.error(price.reason ?? "This combination isn't available.");
      return;
    }
    if (duration > availableMax) {
      toast.error(`Maximum available for these settings is ${availableMax}s.`);
      return;
    }
    const timing = parsePromptTiming(prompt);
    if (timing.errors.length) {
      toast.error(timing.errors[0]);
      return;
    }
    const timingErrs = validateTimingAgainstDuration(timing.cues, duration);
    if (timingErrs.length) {
      toast.error(timingErrs[0]);
      return;
    }
    const wantAudio = effectiveAudio;
    const model = selectVideoModel({
      mode,
      tier,
      durationSec: duration,
      resolution,
      aspect,
      soundOn: wantAudio,
    });
    if (!model) {
      toast.error(videoSelectionUnavailableMessage());
      return;
    }
    if (!admin && !freeVideoEligible && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    const generateAudio = wantAudio && !!model.nativeAudio;

    setBusy(true);
    setResult(null);
    startGeneration("video", "/studio/video");
    toast(`Expected ~${eta}s — keep this tab open.`);
    try {
      let imageUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;
      if ((mode === "image" || mode === "video") && mediaFile) {
        imageUrl = await uploadMedia(mediaFile);
        sourceKind = mode === "video" ? "video" : "image";
      }

      const res = await generate({
        data: {
          prompt:
            prompt.trim() ||
            (mode === "video" ? "Enhance this video, improve clarity and stability." : ""),
          type: "video",
          imageUrl,
          sourceKind,
          videoDurationSeconds: duration,
          videoAspectRatio: aspect,
          videoResolution: resolution === "2k" ? "1080p" : resolution,
          videoModelId: model.id,
          videoGenerateAudio: generateAudio,
          videoStyleId: styleId || undefined,
        },
      });

      setResult({
        outputUrl: res.outputUrl,
        mode,
        prompt: prompt.trim(),
        duration: duration as 5 | 10 | 15,
        aspect: (aspect === "16:9" || aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: resolution as "480p" | "720p" | "1080p",
        size: "medium",
        soundRequested: generateAudio,
        creditsUsed: freeVideoEligible ? 0 : cost,
        sourcePreview: mediaPreview,
      });
      await refreshProfile();
      toast.success("Video ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
      endGeneration();
    }
  };

  const onDownload = async () => {
    if (!result?.outputUrl) return;
    try {
      await triggerBrowserDownload(result.outputUrl, `motio2edit-video-${Date.now()}.mp4`);
    } catch {
      window.open(result.outputUrl, "_blank");
    }
  };

  if (user && profile && !allowed) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-[#070A12] px-4 text-center text-white">
        <Lock className="mb-3 h-8 w-8 text-red-500" />
        <h1 className="text-xl font-bold">Video Studio is locked</h1>
        <p className="mt-2 text-sm text-zinc-400">Requires Lite or higher.</p>
        <Button asChild className="mt-6"><Link to="/pricing">View plans</Link></Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-[#070A12] px-4 text-center text-white">
        <Video className="mb-3 h-8 w-8 text-red-400" />
        <h1 className="text-xl font-bold">Video Studio</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to create AI video with Motio2edit.</p>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ redirect: "/studio/video" }}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const isPremiumUi = tier === "premium";
  const showSuggestions = mode === "text" && !prompt.trim() && !busy && !result;

  return (
    <div className={cn("relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#070A12] text-white overscroll-none")}>
      {isPremiumUi && !reduceMotion && (
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-8 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -right-20 top-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
      )}

      <header
        className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[#0B0F1E]/85 px-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))", paddingBottom: "0.5rem", minHeight: "56px" }}
      >
        <button type="button" onClick={() => navigate({ to: "/" })}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/5"
          aria-label="Home">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg border border-red-500/40 bg-red-500/15", !reduceMotion && "motion-safe:animate-pulse")}>
            <Video className="h-3.5 w-3.5 text-red-400" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-zinc-200">
              Motio2edit <span className="text-zinc-500">·</span>{" "}
              <span className="tracking-[0.12em] text-zinc-100">VIDEO STUDIO</span>
            </p>
            {isPremiumUi && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">Premium</span>
            )}
          </div>
        </div>
        <div className="flex min-w-[2.5rem] items-center justify-end">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-zinc-200">
            {admin ? "∞" : (profile?.credits ?? "—")}
          </span>
        </div>
      </header>

      <main id="video-studio-workspace" className="relative z-10 flex min-h-0 flex-1 flex-col px-3 pt-2">
        <div className="flex shrink-0 flex-col items-center gap-2 pb-2">
          <VideoModeSelector
            value={mode}
            disabled={busy}
            onChange={(m) => {
              setMode(m);
              clearMedia();
              setResult(null);
            }}
          />
          {(mode === "image" || mode === "video") && (
            <VideoSourceUpload
              mode={mode}
              file={mediaFile}
              previewUrl={mediaPreview}
              onPick={onPickMedia}
              onClear={clearMedia}
              disabled={busy}
            />
          )}
        </div>

        <div className="shrink-0 pb-2">
          <VideoPromptBar
            value={prompt}
            onChange={setPrompt}
            disabled={busy}
            maxChars={promptMax}
            compact={mode !== "text"}
            durationSec={duration}
            audioActive={effectiveAudio && caps.audioSupported}
            placeholder={
              mode === "image"
                ? "Describe the motion: slow push-in, orbit…"
                : mode === "video"
                  ? "Optional: improve clarity, stability…"
                  : "Describe your video…"
            }
          />
        </div>

        {showSuggestions && (
          <div className="mb-2 flex shrink-0 gap-1.5 overflow-x-auto scrollbar-none">
            {VIDEO_PROMPT_SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setPrompt(s)}
                className="max-w-[11rem] shrink-0 truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-zinc-400 transition hover:border-red-400/30 hover:text-zinc-200">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2 scrollbar-none">
          <VideoStudioControls
            tier={tier}
            setTier={setTier}
            premiumLocked={!premiumAllowed}
            onPremiumLockedClick={() => navigate({ to: "/pricing" })}
            aspects={caps.aspects}
            resolutions={caps.resolutions}
            aspect={aspect}
            setAspect={setAspect}
            resolution={resolution}
            setResolution={setResolution}
            duration={duration}
            setDuration={setDuration}
            durations={tierDurations}
            audioOn={audioOn}
            setAudioOn={setAudioOn}
            audioSupported={caps.audioSupported}
            styleId={styleId}
            setStyleId={setStyleId}
            disabled={busy}
          />
          {!costSupported && (
            <p className="mt-2 text-center text-[11px] text-amber-400">{price.reason ?? "This combination isn’t available yet."}</p>
          )}
          {costSupported && !selected && (
            <p className="mt-2 text-center text-[11px] text-amber-400">{videoSelectionUnavailableMessage()}</p>
          )}
          {freeVideoEligible && freeVideoLabel && (
            <p className="mt-2 text-center text-[11px] font-semibold text-emerald-400">{freeVideoLabel} available for this setup</p>
          )}
        </div>
      </main>

      {!busy && !result && (
        <div
          className="relative z-30 shrink-0 border-t border-white/10 bg-[#0B0F1E]/95 px-3 pt-2 backdrop-blur-md"
          style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              {freeVideoEligible && freeVideoLabel ? (
                <p className="truncate text-xs font-semibold text-emerald-400">{freeVideoLabel}</p>
              ) : (
                <p className="truncate text-xs text-zinc-400">
                  Est. <span className="font-bold tabular-nums text-white">{costSupported ? cost : "—"}</span> credits
                  <span className="text-zinc-600"> · {resolution === "480p" ? "SD" : resolution === "720p" ? "HD" : resolution === "1080p" ? "FHD" : resolution} · {duration}s</span>
                </p>
              )}
            </div>
            <button type="button" disabled={!canGenerate} onClick={() => void onGenerate()}
              aria-label={freeVideoEligible ? "Generate free video" : costSupported ? `Generate video, about ${cost} credits` : "Generate video"}
              className={cn(
                "inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition",
                "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A12]",
                isPremiumUi
                  ? "bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 shadow-amber-500/20"
                  : "bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/25",
                !canGenerate && "cursor-not-allowed opacity-45",
              )}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Generate
            </button>
          </div>
        </div>
      )}

      {busy && <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} prompt={prompt.trim()} />}
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
