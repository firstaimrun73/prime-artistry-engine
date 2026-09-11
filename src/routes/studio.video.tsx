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
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Studio — Motio2edit" },
      { name: "description", content: "Create AI video from text, image, or video." },
    ],
  }),
  component: VideoStudioPage,
});

function VideoStudioPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);
  const canVideo = isAdmin || canAccessVideo(profile?.plan);

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [duration, setDuration] = useState(5);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [eta, setEta] = useState(60);
  const [result, setResult] = useState<VideoStudioResult | null>(null);
  const [welcomeFree, setWelcomeFree] = useState(false);

  const genFn = useServerFn(generateMedia);
  const welcomeFn = useServerFn(getWelcomeFreeVideoStatus);

  useEffect(() => {
    void welcomeFn({ data: {} }).then((s) => setWelcomeFree(!!s?.eligible)).catch(() => {});
  }, [welcomeFn]);

  const maxPrompt = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
  const credits = useMemo(
    () => computeMotioVideoCredits({ tier, durationSec: duration, quality: qualityFromResolution(resolution) }),
    [tier, duration, resolution],
  );

  const onGenerate = useCallback(async () => {
    if (!canVideo && !welcomeFree) {
      toast.error("Video requires a paid plan");
      return;
    }
    const p = prompt.trim();
    if (!p) {
      toast.error("Enter a prompt");
      return;
    }
    if (p.length > maxPrompt) {
      toast.error(`Prompt max ${maxPrompt} characters`);
      return;
    }
    const selection = selectVideoModel({ mode, tier, aspect, resolution, durationSec: duration });
    if (!selection.ok) {
      toast.error(videoSelectionUnavailableMessage(selection));
      return;
    }
    setBusy(true);
    setStageIdx(0);
    setEta(90);
    startGeneration("video");
    try {
      const out = await genFn({
        data: {
          kind: "video",
          prompt: p,
          mode,
          tier,
          aspect,
          resolution,
          durationSec: duration,
          sourceUrl: sourceUrl ?? undefined,
          modelId: selection.modelId,
        },
      });
      if (out?.url) {
        setResult({ url: out.url, prompt: p, modelId: selection.modelId, durationSec: duration });
        toast.success("Video ready");
      } else {
        toast.error(out?.error ?? "Generation failed");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
      endGeneration();
    }
  }, [canVideo, welcomeFree, prompt, maxPrompt, mode, tier, aspect, resolution, duration, sourceUrl, genFn]);

  const onDownload = useCallback(async () => {
    if (!result?.url) return;
    await triggerBrowserDownload(result.url, `motio-video-${Date.now()}.mp4`);
  }, [result]);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <Video className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sign in to use Video Studio</p>
        <Button asChild><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/studio"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 text-sm font-semibold">Video Studio</div>
        {!canVideo && !welcomeFree && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Pro</span>
        )}
      </header>

      {!result && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <VideoModeSelector mode={mode} onChange={setMode} />
          {(mode === "image" || mode === "video") && (
            <VideoSourceUpload mode={mode} url={sourceUrl} onUrl={setSourceUrl} />
          )}
          <VideoPromptBar
            value={prompt}
            onChange={setPrompt}
            maxLength={maxPrompt}
            suggestions={VIDEO_PROMPT_SUGGESTIONS}
          />
          <VideoStudioControls
            tier={tier}
            onTier={setTier}
            aspect={aspect}
            onAspect={setAspect}
            resolution={resolution}
            onResolution={setResolution}
            duration={duration}
            onDuration={setDuration}
            maxDuration={availableMaxDurationFor(mode, tier)}
            credits={credits}
          />
          <div className="mt-auto pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onGenerate()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground",
                busy && "opacity-60",
              )}
            >
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
