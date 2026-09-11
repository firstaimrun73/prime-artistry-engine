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
  const admin = isAdminEmail(profile?.email ?? user?.email);
  const allowed = canAccessVideo({ plan: profile?.plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<VideoGenMode>("text");
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<VideoTier>("standard");
  const [duration, setDuration] = useState<5 | 10 | 15>(5);
  const [aspect, setAspect] = useState<VideoAspect>("16:9");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
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
    void welcomeStatus({}).then((s) => {
      if (s?.eligible) setWelcomeFree(true);
    }).catch(() => {});
  }, [user, welcomeStatus]);

  const caps = useMemo(() => capabilitiesForMode(mode, tier), [mode, tier]);
  const maxDur = useMemo(() => availableMaxDurationFor(mode, tier), [mode, tier]);
  const promptMax = tier === "premium" ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;

  useEffect(() => {
    if (duration > maxDur) setDuration(maxDur as 5 | 10 | 15);
  }, [maxDur, duration]);

  const creditsEstimate = useMemo(() => {
    return computeMotioVideoCredits({
      durationSec: duration,
      quality: qualityFromResolution(resolution),
      sound: promptMentionsAudio(prompt),
      tier,
    });
  }, [duration, resolution, prompt, tier]);

  const onGenerate = useCallback(async () => {
    if (!allowed && !welcomeFree) {
      toast.error("Upgrade to unlock Video Studio");
      navigate({ to: "/pricing" });
      return;
    }
    const p = prompt.trim();
    if (!p) {
      toast.error("Add a prompt");
      return;
    }
    if ((mode === "image" || mode === "video") && !sourceUrl) {
      toast.error("Upload a source first");
      return;
    }
    const timing = parsePromptTiming(p);
    const timingErr = validateTimingAgainstDuration(timing, duration);
    if (timingErr) {
      toast.error(timingErr);
      return;
    }
    const selection = selectVideoModel({ mode, tier, duration, resolution, aspect });
    if (!selection.ok) {
      toast.error(videoSelectionUnavailableMessage(selection));
      return;
    }

    setBusy(true);
    setStageIdx(0);
    setEta(duration <= 5 ? 40 : duration <= 10 ? 70 : 100);
    startGeneration("video");
    const stageTimer = window.setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, 3));
    }, 8000);

    try {
      const res = await generate({
        data: {
          kind: "video",
          prompt: p,
          mode,
          duration,
          aspect,
          resolution,
          tier,
          sourceUrl: sourceUrl ?? undefined,
        },
      });
      if (!res?.outputUrl) throw new Error(res?.error || "Generation failed");
      setResult({
        outputUrl: res.outputUrl,
        mode,
        prompt: p,
        duration,
        aspect,
        quality: resolution,
        size: resolution === "1080p" ? "large" : resolution === "720p" ? "medium" : "small",
        soundRequested: promptMentionsAudio(p),
        creditsUsed: res.creditsCharged ?? creditsEstimate,
        sourcePreview: sourceUrl,
      });
      toast.success("Video ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate video");
    } finally {
      window.clearInterval(stageTimer);
      setBusy(false);
      endGeneration();
    }
  }, [
    allowed, welcomeFree, prompt, mode, sourceUrl, duration, aspect, resolution, tier,
    generate, navigate, creditsEstimate,
  ]);

  const onDownload = useCallback(async () => {
    if (!result?.outputUrl) return;
    try {
      await triggerBrowserDownload(result.outputUrl, `motio2edit-video-${Date.now()}.mp4`);
    } catch {
      toast.error("Download failed");
    }
  }, [result]);

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <Video className="h-10 w-10 text-primary" />
        <p className="text-center text-muted-foreground">Sign in to open Video Studio</p>
        <Button asChild><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }

  if (!allowed && !welcomeFree) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6">
        <Lock className="h-10 w-10 text-amber-400" />
        <p className="text-center text-lg font-semibold">Video Studio is on paid plans</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Unlock cinematic text-to-video, image-to-video, and video-to-video.
        </p>
        <Button asChild><Link to="/pricing">View plans</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="z-20 flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link to="/studio" aria-label="Back to Studio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">Video Studio</p>
          <p className="truncate text-[11px] text-muted-foreground">Motio2edit · cinematic motion</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pb-28">
        <VideoModeSelector mode={mode} onChange={setMode} disabled={busy} />
        {(mode === "image" || mode === "video") && (
          <VideoSourceUpload
            mode={mode}
            sourceUrl={sourceUrl}
            onFile={(f, url) => {
              setSourceFile(f);
              setSourceUrl(url);
            }}
            onClear={() => {
              setSourceFile(null);
              setSourceUrl(null);
            }}
            disabled={busy}
          />
        )}
        <VideoPromptBar
          value={prompt}
          onChange={setPrompt}
          maxLength={promptMax}
          suggestions={[...VIDEO_PROMPT_SUGGESTIONS]}
          disabled={busy}
        />
        <VideoStudioControls
          tier={tier}
          onTier={setTier}
          duration={duration}
          onDuration={setDuration}
          aspect={aspect}
          onAspect={setAspect}
          resolution={resolution}
          onResolution={setResolution}
          maxDuration={maxDur}
          caps={caps}
          creditsEstimate={creditsEstimate}
          disabled={busy}
        />
      </div>

      {!result && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              disabled={busy || !prompt.trim()}
              onClick={() => void onGenerate()}
              className={cn(
                "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                busy || !prompt.trim()
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]",
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Generate
            </button>
          </div>
        </div>
      )}

      {busy && (
        <VideoGeneratingOverlay stageIndex={stageIdx} etaSeconds={eta} prompt={prompt.trim()} />
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
