/**
 * Video Studio — thin orchestrator.
 * User picks Standard/Premium + creative requirements.
 * Backend selectVideoModel() chooses the engine. No model names in UI.
 * Retail credits: single source of truth = computeMotioVideoCredits().
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Video, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StudioBackLink } from "@/components/StudioBackLink";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import { VideoModeSelector } from "@/components/video/VideoModeSelector";
import { VideoPromptBar, STANDARD_VIDEO_PROMPT_MAX, PREMIUM_VIDEO_PROMPT_MAX } from "@/components/video/VideoPromptBar";
import { VideoFeaturePanel } from "@/components/video/VideoFeaturePanel";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
import { VideoCreditsInfo } from "@/components/video/VideoCreditsInfo";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  capabilitiesForTier,
  availableMaxDurationFor,
  promptMentionsSound,
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
import type { VideoStudioResult } from "@/components/video/video-studio-types";

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

function isPaidPlan(plan: string | null | undefined, admin: boolean): boolean {
  if (admin) return true;
  const p = (plan ?? "free").toLowerCase();
  return p !== "free" && p.length > 0;
}

function VideoStudioPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);

  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });
  const premiumAllowed = planAllowsPremium(profile?.plan, admin);
  const paid = isPaidPlan(profile?.plan, admin);

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [soundOn, setSoundOn] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [keepWatermark, setKeepWatermark] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<VideoStudioResult | null>(null);

  const caps = useMemo(() => capabilitiesForTier(tier, mode), [tier, mode]);
  const availableMax = useMemo(() => availableMaxDurationFor(tier, mode), [tier, mode]);
  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
  const tierDurations = useMemo(() => allowedDurationsForTier(tier), [tier]);

  useEffect(() => {
    if (!caps.aspects.includes(aspect)) setAspect(caps.aspects[0] ?? "16:9");
    if (!caps.resolutions.includes(resolution)) {
      setResolution(caps.resolutions.includes("1080p") ? "1080p" : (caps.resolutions[0] ?? "720p"));
    }
    // Clamp duration to tier-allowed set (Standard never keeps 15s)
    if (!tierDurations.includes(duration)) {
      setDuration(tierDurations.includes(5) ? 5 : (tierDurations[0] ?? 5));
    } else if (duration > availableMax && availableMax > 0) {
      setDuration(Math.min(duration, availableMax));
    }
  }, [caps, aspect, resolution, duration, availableMax, tierDurations]);

  const effectiveSound = useMemo(() => {
    if (soundOn) return true;
    if (promptMentionsSound(prompt)) return true;
    return false;
  }, [soundOn, prompt]);

  // SINGLE SOURCE OF TRUTH for retail credits
  const price = useMemo(
    () =>
      computeMotioVideoCredits({
        tier,
        durationSec: duration,
        quality: qualityFromResolution(resolution),
        soundOn: effectiveSound,
        mode,
      }),
    [mode, tier, duration, resolution, effectiveSound],
  );

  const cost = price.credits;
  const costSupported = price.supported;

  const selected = useMemo(
    () =>
      selectVideoModel({
        mode,
        tier,
        durationSec: duration,
        resolution,
        aspect,
        soundOn: effectiveSound,
      }),
    [mode, tier, duration, resolution, aspect, effectiveSound],
  );

  const eta = Math.max(30, Math.round(duration * 8));

  useEffect(() => {
    if (user && profile && !allowed) navigate({ to: "/pricing" });
  }, [user, profile, allowed, navigate]);

  useEffect(() => {
    if (!busy) {
      setStageIdx(0);
      return;
    }
    setStageIdx(0);
    const timers = [1, 2, 3, 4, 5].map((i) => setTimeout(() => setStageIdx(i), i * 2500));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  const canGenerate = useMemo(() => {
    if (!costSupported) return false;
    if (duration < 1 || duration > availableMax) return false;
    if (mode === "video") return !!mediaFile;
    if (!prompt.trim()) return false;
    if (mode === "image" && !mediaFile) return false;
    if (!selected) return false;
    return true;
  }, [prompt, mode, mediaFile, duration, availableMax, selected, costSupported]);

  if (user && profile && !allowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Lock className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-4 text-xl font-bold">Video Studio is locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Requires Lite or higher.</p>
        <Button asChild className="mt-6">
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Video className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-4 text-xl font-bold">Video Studio</h1>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const onPick = (file: File) => {
    if (mode === "image" && !file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (mode === "video" && !file.type.startsWith("video/")) return toast.error("Choose a video file.");
    if (file.size > 200 * 1024 * 1024) return toast.error("Max 200 MB.");
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const uploadMedia = async (file: File) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/video-src-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl) throw new Error("Could not prepare media URL.");
    return data.signedUrl;
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
    const wantSound = effectiveSound;
    const model = selectVideoModel({
      mode,
      tier,
      durationSec: duration,
      resolution,
      aspect,
      soundOn: wantSound,
    });
    if (!model) {
      toast.error(
        videoSelectionUnavailableMessage({
          mode,
          tier,
          durationSec: duration,
          resolution,
          aspect,
          soundOn: wantSound,
        }),
      );
      return;
    }
    if (!admin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    const generateAudio = wantSound && model.nativeAudio;

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
          keepWatermark: paid ? keepWatermark : true,
        },
      });

      setResult({
        outputUrl: res.outputUrl,
        mode,
        prompt: prompt.trim(),
        duration: duration as 5 | 10,
        aspect: (aspect === "16:9" || aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: resolution === "720p" ? "720p" : "1080p",
        size: "medium",
        soundRequested: generateAudio,
        creditsUsed: cost,
        sourcePreview: mediaPreview,
      });
      await refreshProfile();
      toast.success("Video ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setBusy(false);
      endGeneration();
    }
  };

  const onDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.outputUrl;
    a.download = `motio2edit-video-${Date.now()}.mp4`;
    a.rel = "noopener";
    a.target = "_blank";
    a.click();
  };

  const isPremiumUi = tier === "premium";

  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-3xl px-4 py-5 pb-28 sm:px-6", isPremiumUi && "relative")}>
      {isPremiumUi && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-40" aria-hidden>
          <div className="absolute -left-20 top-10 h-40 w-40 animate-pulse rounded-full bg-gradient-to-br from-amber-400/30 to-red-500/20 blur-3xl" />
          <div className="absolute -right-16 top-32 h-48 w-48 animate-pulse rounded-full bg-gradient-to-br from-violet-500/25 to-orange-400/15 blur-3xl [animation-delay:1.2s]" />
        </div>
      )}

      <StudioBackLink className="mb-3" />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Video{" "}
          <span
            className={cn(
              "bg-clip-text text-transparent",
              isPremiumUi
                ? "bg-gradient-to-r from-amber-400 via-red-500 to-violet-500"
                : "bg-gradient-to-r from-red-500 to-orange-500",
            )}
          >
            Studio
          </span>
          {isPremiumUi && (
            <span className="ml-2 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
              Premium
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Create video from text, an image, or an existing clip.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm">
          <span className="tabular-nums font-semibold text-red-600 dark:text-red-400">
            {admin ? "∞" : (profile?.credits ?? "—")}
          </span>
          <span className="text-muted-foreground">credits</span>
        </div>
      </header>

      <section className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Create video from</p>
        <VideoModeSelector
          value={mode}
          disabled={busy}
          onChange={(m) => {
            setMode(m);
            clearMedia();
            setResult(null);
          }}
        />
      </section>

      {(mode === "image" || mode === "video") && (
        <div className="mb-5">
          <VideoSourceUpload mode={mode} preview={mediaPreview} onPick={onPick} onClear={clearMedia} disabled={busy} />
        </div>
      )}

      <section className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
        <VideoPromptBar
          value={prompt}
          onChange={setPrompt}
          disabled={busy}
          maxLength={promptMax}
          placeholder={
            mode === "image"
              ? "Describe the motion: slow push-in, orbit, product turn…"
              : mode === "video"
                ? "Optional: improve clarity, stability…"
                : "A cinematic drone shot over a mountain range at sunrise…"
          }
        />
        {!soundOn && promptMentionsSound(prompt) && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Sound keywords detected in prompt — audio will be requested when the model supports it.
          </p>
        )}
      </section>

      <div className="mb-5">
        <VideoFeaturePanel
          tier={tier}
          setTier={setTier}
          premiumLocked={!premiumAllowed}
          onPremiumLockedClick={() => navigate({ to: "/pricing" })}
          aspects={caps.aspects}
          resolutions={caps.resolutions.filter((r) => r !== "480p")}
          aspect={aspect}
          setAspect={setAspect}
          resolution={resolution}
          setResolution={setResolution}
          duration={duration}
          setDuration={setDuration}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          styleId={styleId}
          setStyleId={setStyleId}
          disabled={busy}
        />
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Watermark</p>
          <p className="text-[11px] text-muted-foreground">
            {paid
              ? keepWatermark
                ? "Keep Motio2edit watermark on output"
                : "Remove watermark (paid)"
              : "Upgrade to remove watermark"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={paid ? keepWatermark : true}
          aria-label="Keep watermark"
          disabled={busy || !paid}
          onClick={() => paid && setKeepWatermark(!keepWatermark)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out",
            paid && keepWatermark ? "bg-red-500" : paid ? "bg-muted" : "bg-muted opacity-50",
            !paid && "cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out",
              (paid ? keepWatermark : true) && "translate-x-5",
            )}
          />
        </button>
      </div>

      {busy && (
        <div className="mb-5">
          <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} />
        </div>
      )}

      {!busy && (
        <div className="space-y-2">
          {!costSupported && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              {price.reason ?? "This combination isn't available yet."}
            </p>
          )}
          {costSupported && !selected && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              {videoSelectionUnavailableMessage({
                mode,
                tier,
                durationSec: duration,
                resolution,
                aspect,
                soundOn: effectiveSound,
              })}
            </p>
          )}
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <span>
              Estimated{" "}
              <span className="font-bold tabular-nums text-foreground">
                {costSupported ? cost : "—"}
              </span>{" "}
              credits
              {costSupported ? (effectiveSound ? " · with sound" : " · silent") : ""}
              {costSupported ? ` · $${price.usd.toFixed(2)}` : ""}
            </span>
            <VideoCreditsInfo
              credits={cost}
              usd={price.usd}
              breakdown={{
                tier: price.breakdown.tier,
                mode,
                durationSec: duration,
                quality: price.breakdown.quality,
                soundOn: effectiveSound,
              }}
            />
          </div>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void onGenerate()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow-lg transition",
              isPremiumUi
                ? "bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 hover:opacity-95 shadow-amber-500/20"
                : "bg-gradient-to-r from-red-500 via-red-600 to-orange-500 hover:opacity-95",
              !canGenerate && "cursor-not-allowed opacity-50",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Generate Video
          </button>
        </div>
      )}

      {result && !busy && (
        <VideoOutputView
          result={result}
          onClose={() => setResult(null)}
          onRegenerate={() => void onGenerate()}
          onDownload={onDownload}
        />
      )}
    </div>
  );
}
