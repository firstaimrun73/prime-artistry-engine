/**
 * Video Studio — thin orchestrator.
 * Normal duration → Prompt bar.
 * Custom duration → Script bar (sequential ≤2 × ~20s segments).
 * Backend selectVideoModel() chooses the engine. No model names in UI.
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
import { VideoPromptBar } from "@/components/video/VideoPromptBar";
import { VideoScriptBar, splitScriptIntoParts } from "@/components/video/VideoScriptBar";
import { VideoFeaturePanel } from "@/components/video/VideoFeaturePanel";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
import { VideoCreditsInfo } from "@/components/video/VideoCreditsInfo";
import {
  selectVideoModel,
  videoSelectionUnavailableMessage,
  capabilitiesForTier,
  estimateRequestCredits,
  availableMaxDurationFor,
  SCRIPT_SEGMENT_SEC,
  SCRIPT_MAX_SEGMENTS,
  SCRIPT_MAX_DURATION_SEC,
  type VideoGenMode,
  type VideoAspect,
  type VideoResolution,
  type VideoTier,
} from "@/lib/video-model-registry";
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

function VideoStudioPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);

  const admin = isAdminEmail(profile?.email);
  const allowed = canAccessVideo({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });
  const premiumAllowed = planAllowsPremium(profile?.plan, admin);

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [docName, setDocName] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("1080p");
  const [soundOn, setSoundOn] = useState(false);
  const [styleId, setStyleId] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<VideoStudioResult | null>(null);

  const caps = useMemo(() => capabilitiesForTier(tier, mode), [tier, mode]);
  const availableMax = useMemo(() => availableMaxDurationFor(tier, mode), [tier, mode]);

  const segmentCount = useMemo(() => {
    if (!customMode) return 1;
    return Math.min(SCRIPT_MAX_SEGMENTS, Math.max(1, Math.ceil(duration / SCRIPT_SEGMENT_SEC)));
  }, [customMode, duration]);

  const segmentDuration = useMemo(() => {
    if (!customMode) return duration;
    if (segmentCount <= 1) return Math.min(duration, availableMax || SCRIPT_SEGMENT_SEC);
    return Math.min(SCRIPT_SEGMENT_SEC, availableMax || SCRIPT_SEGMENT_SEC);
  }, [customMode, duration, segmentCount, availableMax]);

  useEffect(() => {
    if (!caps.aspects.includes(aspect)) setAspect(caps.aspects[0] ?? "16:9");
    if (!caps.resolutions.includes(resolution)) {
      setResolution(
        caps.resolutions.includes("1080p")
          ? "1080p"
          : (caps.resolutions[0] ?? "720p"),
      );
    }
  }, [caps, aspect, resolution]);

  const cost = useMemo(() => {
    const per = estimateRequestCredits({
      mode: customMode ? "text" : mode,
      tier,
      durationSec: segmentDuration,
      resolution,
      aspect,
      soundOn,
    });
    return per * (customMode ? segmentCount : 1);
  }, [mode, tier, duration, resolution, aspect, soundOn, customMode, segmentCount, segmentDuration]);

  const selected = useMemo(
    () =>
      selectVideoModel({
        mode: customMode ? "text" : mode,
        tier,
        durationSec: segmentDuration,
        resolution,
        aspect,
        soundOn,
      }),
    [mode, tier, segmentDuration, resolution, aspect, soundOn, customMode],
  );

  const eta = Math.max(30, Math.round(segmentDuration * 8 * (customMode ? segmentCount : 1)));

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

  const customEmpty = customMode && customInput.trim() === "";
  const customInvalid =
    customMode &&
    customInput.trim() !== "" &&
    (() => {
      const n = parseInt(customInput, 10);
      return Number.isNaN(n) || n < 1 || n > SCRIPT_MAX_DURATION_SEC;
    })();

  const canGenerate = useMemo(() => {
    if (customEmpty || customInvalid) return false;
    if (customMode) {
      if (duration < 1 || duration > SCRIPT_MAX_DURATION_SEC) return false;
      if (!script.trim()) return false;
      if (!selected) return false;
      return true;
    }
    if (duration < 1) return false;
    if (duration > availableMax) return false;
    if (mode === "video") return !!mediaFile;
    if (!prompt.trim()) return false;
    if (mode === "image" && !mediaFile) return false;
    if (!selected) return false;
    return true;
  }, [
    prompt,
    script,
    mode,
    mediaFile,
    duration,
    availableMax,
    selected,
    customEmpty,
    customInvalid,
    customMode,
  ]);

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

  const runOneSegment = async (opts: {
    promptText: string;
    durationSec: number;
    imageUrl?: string;
    sourceKind?: "image" | "video";
    modelId: string;
    generateAudio: boolean;
  }) => {
    return generate({
      data: {
        prompt: opts.promptText,
        type: "video",
        imageUrl: opts.imageUrl,
        sourceKind: opts.sourceKind,
        videoDurationSeconds: opts.durationSec,
        videoAspectRatio: aspect,
        videoResolution: resolution === "4k" ? "4k" : resolution === "2k" ? "1080p" : resolution,
        videoModelId: opts.modelId,
        videoGenerateAudio: opts.generateAudio,
        videoNegativePrompt: negativePrompt || undefined,
        videoStyleId: styleId || undefined,
      },
    });
  };

  const onGenerate = async () => {
    if (!canGenerate || busy) return;

    if (customMode) {
      if (duration > SCRIPT_MAX_DURATION_SEC) {
        toast.error(`Maximum custom duration is ${SCRIPT_MAX_DURATION_SEC} seconds.`);
        return;
      }
    } else if (duration > availableMax) {
      toast.error(
        `Maximum available for these settings is ${availableMax}s. Try a shorter duration or Premium.`,
      );
      return;
    }

    const model = selectVideoModel({
      mode: customMode ? "text" : mode,
      tier,
      durationSec: segmentDuration,
      resolution,
      aspect,
      soundOn,
    });
    if (!model) {
      toast.error(
        videoSelectionUnavailableMessage({
          mode: customMode ? "text" : mode,
          tier,
          durationSec: segmentDuration,
          resolution,
          aspect,
          soundOn,
        }),
      );
      return;
    }
    if (!admin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    if (soundOn && !model.nativeAudio) {
      toast.error(
        videoSelectionUnavailableMessage({
          mode: customMode ? "text" : mode,
          tier,
          durationSec: segmentDuration,
          resolution,
          aspect,
          soundOn: true,
        }),
      );
      return;
    }

    setBusy(true);
    setResult(null);
    startGeneration("video", "/studio/video");
    toast(`Expected ~${eta}s — keep this tab open.`);
    try {
      let imageUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;
      if (!customMode && (mode === "image" || mode === "video") && mediaFile) {
        imageUrl = await uploadMedia(mediaFile);
        sourceKind = mode === "video" ? "video" : "image";
      }

      let outputUrl: string;

      if (customMode) {
        const parts = splitScriptIntoParts(script, segmentCount);
        const n = Math.min(segmentCount, Math.max(1, parts.length));
        const first = await runOneSegment({
          promptText: parts[0] || script.trim(),
          durationSec: Math.min(segmentDuration, model.maxDuration),
          modelId: model.id,
          generateAudio: soundOn && model.nativeAudio,
        });
        outputUrl = first.outputUrl;

        if (n >= 2 && parts[1]) {
          const contModel =
            selectVideoModel({
              mode: "video",
              tier,
              durationSec: Math.min(segmentDuration, model.maxDuration),
              resolution,
              aspect,
              soundOn,
            }) ?? model;

          if (contModel.videoEndpoint) {
            const second = await runOneSegment({
              promptText: `Continue seamlessly from the previous scene. ${parts[1]}`,
              durationSec: Math.min(segmentDuration, contModel.maxDuration),
              imageUrl: outputUrl,
              sourceKind: "video",
              modelId: contModel.id,
              generateAudio: soundOn && contModel.nativeAudio,
            });
            outputUrl = second.outputUrl;
          } else {
            const second = await runOneSegment({
              promptText: `Continue the same story and visual style seamlessly. Previous context: ${parts[0].slice(0, 200)}. Next: ${parts[1]}`,
              durationSec: Math.min(segmentDuration, model.maxDuration),
              modelId: model.id,
              generateAudio: soundOn && model.nativeAudio,
            });
            outputUrl = second.outputUrl;
          }
        }
      } else {
        const res = await runOneSegment({
          promptText:
            prompt.trim() ||
            (mode === "video" ? "Enhance this video, improve clarity and stability." : ""),
          durationSec: duration,
          imageUrl,
          sourceKind,
          modelId: model.id,
          generateAudio: soundOn && model.nativeAudio,
        });
        outputUrl = res.outputUrl;
      }

      setResult({
        outputUrl,
        mode: customMode ? "text" : mode,
        prompt: (customMode ? script : prompt).trim(),
        duration: duration as 5 | 10,
        aspect: (aspect === "16:9" || aspect === "9:16" || aspect === "1:1" ? aspect : "16:9") as
          | "16:9"
          | "9:16"
          | "1:1",
        quality: resolution === "720p" ? "720p" : "1080p",
        size: "medium",
        soundRequested: soundOn && model.nativeAudio,
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

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-5 pb-28 sm:px-6">
      <StudioBackLink className="mb-3" />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Video{" "}
          <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Studio</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create video from text, an image, or an existing clip.
        </p>
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
          disabled={busy || customMode}
          onChange={(m) => {
            setMode(m);
            clearMedia();
            setResult(null);
          }}
        />
      </section>

      {!customMode && (mode === "image" || mode === "video") && (
        <div className="mb-5">
          <VideoSourceUpload
            mode={mode}
            preview={mediaPreview}
            onPick={onPick}
            onClear={clearMedia}
            disabled={busy}
          />
        </div>
      )}

      <section className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {customMode ? "Script" : "Prompt"}
        </p>
        {customMode ? (
          <VideoScriptBar
            value={script}
            onChange={(v) => {
              setScript(v);
            }}
            disabled={busy}
            attachedName={docName}
            onClearAttachment={() => setDocName(null)}
            onAttached={(name) => setDocName(name)}
          />
        ) : (
          <VideoPromptBar
            value={prompt}
            onChange={setPrompt}
            disabled={busy}
            placeholder={
              mode === "image"
                ? "Describe the motion: slow push-in, orbit, product turn…"
                : mode === "video"
                  ? "Optional: improve clarity, stability…"
                  : "A cinematic drone shot over a mountain range at sunrise…"
            }
          />
        )}
      </section>

      <div className="mb-5">
        <VideoFeaturePanel
          tier={tier}
          setTier={setTier}
          premiumLocked={!premiumAllowed}
          onPremiumLockedClick={() => navigate({ to: "/pricing" })}
          aspects={caps.aspects}
          resolutions={caps.resolutions}
          availableMaxDuration={availableMax}
          nativeAudioAvailable={caps.nativeAudio}
          supportsNegativePrompt={!customMode && caps.supportsNegativePrompt && mode !== "video"}
          aspect={aspect}
          setAspect={setAspect}
          resolution={resolution}
          setResolution={setResolution}
          duration={duration}
          setDuration={setDuration}
          customMode={customMode}
          setCustomMode={setCustomMode}
          customInput={customInput}
          setCustomInput={setCustomInput}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          styleId={styleId}
          setStyleId={setStyleId}
          negativePrompt={negativePrompt}
          setNegativePrompt={setNegativePrompt}
          disabled={busy}
        />
      </div>

      {busy && (
        <div className="mb-5">
          <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} />
        </div>
      )}

      {!busy && (
        <div className="space-y-2">
          {!selected && !customEmpty && !customInvalid && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              {videoSelectionUnavailableMessage({
                mode: customMode ? "text" : mode,
                tier,
                durationSec: segmentDuration,
                resolution,
                aspect,
                soundOn,
              })}
            </p>
          )}
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <span>
              Estimated <span className="font-bold tabular-nums text-foreground">{cost || "—"}</span> credits
            </span>
            <VideoCreditsInfo
              tier={tier}
              duration={duration}
              resolution={resolution}
              sound={soundOn ? "On" : "Off"}
              credits={cost}
            />
          </div>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void onGenerate()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow-lg",
              "bg-gradient-to-r from-red-500 via-red-600 to-orange-500 hover:opacity-95",
              !canGenerate && "cursor-not-allowed opacity-50",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Generate Video · {cost || "—"} credits
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
