/**
 * Video Studio V1 — clean rebuild
 * No Standard/Pro/Premium UI. Three modes only. Base Kling path via generateMedia.
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
import { maxVideoDurationForPlan, isDurationAllowed } from "@/lib/video-options";
import { computeVideoCreditCost, estimateVideoEtaSeconds } from "@/lib/video-pricing";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { cn } from "@/lib/utils";
import { VideoModeSelector } from "@/components/video/VideoModeSelector";
import { VideoPromptBar } from "@/components/video/VideoPromptBar";
import { VideoFeaturePanel } from "@/components/video/VideoFeaturePanel";
import { VideoSourceUpload } from "@/components/video/VideoSourceUpload";
import { VideoGeneratingOverlay } from "@/components/video/VideoGeneratingOverlay";
import { VideoOutputView } from "@/components/video/VideoOutputView";
import type {
  VideoMode,
  VideoStudioAspect,
  VideoStudioDuration,
  VideoStudioQuality,
  VideoStudioSize,
  VideoStudioResult,
} from "@/components/video/video-studio-types";

export const Route = createFileRoute("/studio/video")({
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Create AI video from text, image, or video." },
    ],
  }),
  component: VideoStudioPage,
});

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

  const [mode, setMode] = useState<VideoMode>("text");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<VideoStudioDuration>(5);
  const [aspect, setAspect] = useState<VideoStudioAspect>("16:9");
  const [quality, setQuality] = useState<VideoStudioQuality>("1080p");
  const [size, setSize] = useState<VideoStudioSize>("medium");
  const [soundOn, setSoundOn] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [result, setResult] = useState<VideoStudioResult | null>(null);

  const maxDur = maxVideoDurationForPlan(profile?.plan);

  const cost = useMemo(
    () =>
      computeVideoCreditCost({
        duration,
        quality,
        aspect,
        tier: "standard",
        mode: mode === "video" && mediaFile ? "enhance" : "generate",
      }).credits,
    [duration, quality, aspect, mode, mediaFile],
  );
  const eta = estimateVideoEtaSeconds({ duration, quality, tier: "standard" });

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
    if (mode === "video") return !!mediaFile;
    if (!prompt.trim()) return false;
    if (mode === "image" && !mediaFile) return false;
    return true;
  }, [prompt, mode, mediaFile]);

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
    if (mode === "image" && !file.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (mode === "video" && !file.type.startsWith("video/"))
      return toast.error("Choose a video file.");
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
    if (!admin && (profile?.credits ?? 0) < cost) {
      toast.error(`Not enough credits (${cost} required).`);
      return;
    }
    if (mode !== "video" && !isDurationAllowed(profile?.plan, duration, admin)) {
      toast.error(`Your plan allows up to ${maxDur}s.`);
      return;
    }

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
          videoResolution: quality === "720p" ? "720p" : "1080p",
        },
      });

      setResult({
        outputUrl: res.outputUrl,
        mode,
        prompt: prompt.trim(),
        duration,
        aspect,
        quality,
        size,
        soundRequested: soundOn,
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
          <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Studio
          </span>
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Create video from
        </p>
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
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
      </section>

      {mode !== "video" && (
        <div className="mb-5">
          <VideoFeaturePanel
            aspect={aspect}
            setAspect={setAspect}
            quality={quality}
            setQuality={setQuality}
            size={size}
            setSize={setSize}
            duration={duration}
            setDuration={setDuration}
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            showDuration
            disabled={busy}
            maxDuration={Math.min(maxDur, 10)}
          />
        </div>
      )}

      {busy && (
        <div className="mb-5">
          <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} />
        </div>
      )}

      {!busy && (
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
          Generate Video · {cost} credits
        </button>
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
