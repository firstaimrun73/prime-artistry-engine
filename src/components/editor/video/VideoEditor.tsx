/**
 * Video Editor workspace — independent of Image Editor.
 * Extracted from _authenticated.editor.tsx without behavior/UI redesign.
 */
import { Link } from "@tanstack/react-router";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  videoResolutionMultiplier,
  type VideoResolution,
} from "@/lib/quality-options";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import {
  videoCreditCost,
  type VideoDuration,
  type VideoAspectRatio,
} from "@/lib/video-options";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { GenState } from "@/lib/editor/editor.types";
import { LOADING_MESSAGES, MAX_VIDEO_MB } from "@/lib/editor/editor.constants";
import { uploadToStorage as uploadToStorageUtil } from "@/lib/editor/editor.utils";
import { getEditorStages } from "@/lib/editor/editor.helpers";
import {
  EditorUpload,
  EditorPromptPanel,
  EditorOptionsPanel,
  EditorGenerationControls,
  EditorPreview,
  EditorResult,
} from "@/components/editor";
import type { EditorBootstrap } from "@/components/editor/editor-bootstrap";

export type VideoEditorProps = {
  bootstrap?: EditorBootstrap;
};

export function VideoEditor({ bootstrap }: VideoEditorProps) {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState(bootstrap?.initialPrompt ?? "");
  const [inputPreview, setInputPreview] = useState<string | null>(
    bootstrap?.reuseUrl && bootstrap.reuseKind === "video" ? bootstrap.reuseUrl : null,
  );
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputKind, setInputKind] = useState<"video" | null>(
    bootstrap?.reuseUrl && bootstrap.reuseKind === "video" ? "video" : null,
  );
  const [output, setOutput] = useState<string | null>(null);
  const [state, setState] = useState<GenState>("idle");
  const [downloaded, setDownloaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(5);
  const [videoAspect, setVideoAspect] = useState<VideoAspectRatio>("16:9");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("1080p");

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;
  const stages = getEditorStages(false);

  useEffect(() => {
    if (bootstrap?.reuseUrl && bootstrap.reuseKind === "video") {
      toast.success("Loaded from your history — keep editing.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const creditsNow = profile?.credits ?? 0;
  const adminNow = isAdminEmail(profile?.email);
  useEffect(() => {
    if (adminNow || !profile) return;
    try {
      if (sessionStorage.getItem(LOW_CREDIT_TOAST_KEY) === "1") return;
      if (creditsNow <= 0) toast.error("🚨 No credits left. Upgrade now.");
      else if (creditsNow < 30) toast.warning(`⚠️ Low credits: ${creditsNow} remaining`);
      else return;
      sessionStorage.setItem(LOW_CREDIT_TOAST_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [creditsNow, adminNow, profile]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
  }, [prompt]);

  useEffect(() => {
    if (state !== "loading") return;
    setMsgIdx(0);
    setStage(1);
    setProgress(12);
    const msg = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    const stg = setInterval(() => setStage((s) => Math.min(stages.length - 1, s + 1)), 2200);
    const prg = setInterval(() => setProgress((p) => Math.min(92, p + Math.random() * 9)), 650);
    return () => {
      clearInterval(msg);
      clearInterval(stg);
      clearInterval(prg);
    };
  }, [state, stages.length]);

  if (!profile) return null;

  const plan = getPlan(profile.plan);
  const isVideoEnhance = inputKind === "video" && !!inputFile;
  const cost = isVideoEnhance
    ? CREDIT_COST.video_enhance
    : Math.round(videoCreditCost(videoDuration) * videoResolutionMultiplier(videoResolution));
  const noCredits = !isAdmin && profile.credits < cost;
  const videoLocked = !isAdmin && !plan.video;
  const loading = state === "loading" || state === "analyzing";
  const suggestions = getSmartSuggestions(prompt);
  const uploadToStorage = (file: File) => uploadToStorageUtil(file, profile?.id ?? "anon");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const first = files[0];
    if (!first.type.startsWith("video")) {
      return toast.error("This workspace accepts video only. Use Image Editor for photos.");
    }
    if (first.size > MAX_VIDEO_MB * 1024 * 1024) {
      return toast.error(
        `File is too large (${(first.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_VIDEO_MB} MB for videos.`,
      );
    }
    setOutput(null);
    setDownloaded(false);
    setState("idle");
    setInputPreview(URL.createObjectURL(first));
    setInputFile(first);
    setInputKind("video");
    toast.success("📁 Upload complete!");
  };

  const runGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    if (videoLocked) {
      setState("blocked");
      return toast.error("Video generation requires a paid plan.");
    }
    if (noCredits) {
      setState("blocked");
      return toast.error(`Not enough credits. This costs ${cost} credits.`);
    }

    const runId = ++runIdRef.current;
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    await new Promise((r) => setTimeout(r, 1500));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast("🎬 Generating your video...");
    startGeneration("video", "/editor");
    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast("⏳ Still working — high quality takes a moment...");
      }, 30_000),
      setTimeout(() => {
        if (runId === runIdRef.current)
          toast("🔁 Taking longer than usual — retrying automatically...");
      }, 75_000),
    ];
    try {
      let mediaUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;

      if (inputKind === "video" && inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
        sourceKind = "video";
      } else if (inputPreview?.startsWith("https://")) {
        // Reuse from history (URL only)
        mediaUrl = inputPreview;
        sourceKind = "video";
      }

      if (mediaUrl && !mediaUrl.startsWith("https://")) {
        throw new Error("Upload failed. Please re-upload and try again.");
      }
      if (runId !== runIdRef.current) return;

      const res = await generate({
        data: {
          prompt,
          type: "video",
          imageUrl: mediaUrl,
          sourceKind,
          videoDurationSeconds: videoDuration,
          videoAspectRatio: videoAspect,
          videoResolution,
        },
      });

      if (runId !== runIdRef.current) return;
      setProgress(100);
      setStage(stages.length);
      setOutput(res.outputUrl);
      setState("success");
      await refreshProfile();
      toast.success("✅ Video ready!");
      endGeneration();
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setState("idle");
      endGeneration();
      toast.error(
        err instanceof Error ? `❌ ${err.message}` : "❌ Failed. Credits not charged.",
      );
    } finally {
      progressTimers.forEach(clearTimeout);
    }
  };

  const handleStop = () => {
    runIdRef.current++;
    setState("idle");
    endGeneration();
    setProgress(0);
    setStage(0);
    toast("Generation stopped.");
  };

  const handleClear = () => {
    runIdRef.current++;
    setPrompt("");
    setInputPreview(null);
    setInputFile(null);
    setInputKind(null);
    setOutput(null);
    setState("idle");
    setDownloaded(false);
    setProgress(0);
    setStage(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownload = async () => {
    if (!output) return;
    try {
      await triggerBrowserDownload(output, `motio2edit-${Date.now()}.mp4`);
      setDownloaded(true);
      toast.success("⬇️ Download started!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const handleShare = async () => {
    if (!output) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Made with Motio2edit", url: output });
      } else {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied to clipboard.");
      }
    } catch {
      /* user cancelled */
    }
  };

  // Image-only props required by shared panels — fixed no-ops
  const noopAspect = "1:1" as AspectRatio;
  const noopSetAspect = () => {};
  const noopQuality = "hd" as const;
  const noopSetQuality = () => {};
  const noopStrength = 0.7;
  const noopSetStrength = () => {};
  const noopRefs: string[] = [];
  const noopSetRefs = () => {};
  const noopWm = false;
  const noopSetWm = () => {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <h1 className="text-2xl font-bold">Video Editor</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
            {isAdmin ? "∞ credits" : `${profile.credits} credits`}
          </span>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Video {cost} credits ({videoDuration}s)
          </span>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
      </div>

      {videoLocked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm animate-fade-in">
          <span className="text-destructive-foreground">Video generation is a paid feature.</span>
          <Button asChild size="sm">
            <Link to="/pricing">Upgrade</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="order-1 space-y-5">
          <EditorUpload
            fileRef={fileRef}
            mediaType="video"
            videoLocked={videoLocked}
            loading={loading}
            inputPreview={inputPreview}
            inputKind={inputKind}
            maxImageMb={25}
            maxVideoMb={MAX_VIDEO_MB}
            onFile={onFile}
            gallery={[]}
            activeImage={0}
            maxGalleryImages={1}
            onSwitchImage={() => {}}
            onRemoveImage={() => {}}
          />

          <EditorPromptPanel
            mediaType="video"
            loading={loading}
            inputDataUrl={null}
            prompt={prompt}
            setPrompt={setPrompt}
            taRef={taRef}
            suggestions={suggestions}
            onSelectTool={(tool) => {
              if (tool.prompt.startsWith("__") && tool.prompt.endsWith("__")) return;
              setPrompt(tool.prompt);
            }}
          />

          <EditorOptionsPanel
            mediaType="video"
            loading={loading}
            inputDataUrl={null}
            aspectRatio={noopAspect}
            setAspectRatio={noopSetAspect as never}
            imageQuality={noopQuality}
            setImageQuality={noopSetQuality as never}
            strength={noopStrength}
            setStrength={noopSetStrength}
            canAddRefImages={false}
            refImages={noopRefs}
            setRefImages={noopSetRefs as never}
            userPlan={profile.plan}
            videoDuration={videoDuration}
            setVideoDuration={setVideoDuration}
            videoAspect={videoAspect}
            setVideoAspect={setVideoAspect}
            videoResolution={videoResolution}
            setVideoResolution={setVideoResolution}
            cost={cost}
            isAdmin={isAdmin}
            credits={profile.credits}
            keepWatermark={noopWm}
            setKeepWatermark={noopSetWm}
            isFree={isFree}
          />

          <EditorGenerationControls
            loading={loading}
            onGenerate={runGenerate}
            onStop={handleStop}
            videoLocked={videoLocked}
            noCredits={noCredits}
          />
        </div>

        <div className="order-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <EditorPreview
            state={state}
            loadingMessage={LOADING_MESSAGES[msgIdx]}
            progress={progress}
            stage={stage}
            stages={stages}
            output={output}
            outputIsVideo={true}
            mediaType="video"
            inputPreview={inputPreview}
            inputKind={inputKind}
            isAdmin={isAdmin}
            isFree={isFree}
            keepWatermark={false}
          />

          <EditorResult
            output={output}
            loading={loading}
            onDownload={handleDownload}
            onRegenerate={runGenerate}
            onEditAgain={() => {
              setState("idle");
              setDownloaded(false);
            }}
            onShare={handleShare}
            onClear={handleClear}
            isFree={isFree}
            downloaded={downloaded}
          />
        </div>
        <EditorDisclaimer />
      </div>
    </div>
  );
}
