/**
 * Video Editor workspace — independent of Image Editor.
 * UPLOAD → PROMPT → SELECT → GENERATE → OUTPUT
 * Media type is locked to video for the lifetime of this component.
 */
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import { CREDIT_COST } from "@/lib/plans";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { StudioBackLink } from "@/components/StudioBackLink";
import type { GenState } from "@/lib/editor/editor.types";
import {
  WATERMARK_PREF_KEY,
  LOADING_MESSAGES,
  MAX_VIDEO_MB,
  VIDEO_DURATIONS,
  VIDEO_ASPECTS,
  VIDEO_RESOLUTIONS,
  type VideoDuration,
  type VideoAspect,
  type VideoResolution,
} from "@/lib/editor/editor.constants";
import { readAsDataUrl, uploadToStorage as uploadToStorageUtil } from "@/lib/editor/editor.utils";
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
  const secureDl = useServerFn(secureDownloadImage);
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
  const [videoAspect, setVideoAspect] = useState<VideoAspect>("16:9");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("720p");

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;
  const stages = getEditorStages(!!inputPreview);

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
      if (creditsNow <= 0) toast.error("No credits left. Upgrade now.");
      else if (creditsNow < 30) toast.warning(`Low credits: ${creditsNow} remaining`);
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

  const cost = useMemo(() => {
    // Legacy video editor: enhance path uses flat credit cost
    return CREDIT_COST.video_enhance ?? 200;
  }, []);

  if (!profile) return null;

  const noCredits = !isAdmin && profile.credits < cost;
  const loading = state === "loading" || state === "analyzing";
  const videoLocked = false;
  const suggestions = getSmartSuggestions(prompt);
  const uploadToStorage = (file: File) => uploadToStorageUtil(file, profile?.id ?? "anon");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video")) {
      return toast.error("This workspace accepts video only. Use Image Editor for images.");
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      return toast.error(
        `Video is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_VIDEO_MB} MB.`,
      );
    }
    setInputFile(file);
    setInputPreview(URL.createObjectURL(file));
    setInputKind("video");
    setOutput(null);
    setDownloaded(false);
    setState("idle");
    toast.success("Video uploaded");
  };

  const runGenerate = async () => {
    if (noCredits) {
      setState("blocked");
      return toast.error(`Not enough credits. This costs ${cost} credits.`);
    }
    if (!inputFile && !inputPreview) {
      return toast.error("Upload a video first.");
    }

    const runId = ++runIdRef.current;
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    await new Promise((r) => setTimeout(r, 400));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast("Enhancing your video…");
    startGeneration("video", "/editor");
    try {
      let mediaUrl: string | undefined;
      if (inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
      } else if (inputPreview?.startsWith("https://")) {
        mediaUrl = inputPreview;
      } else if (inputPreview) {
        const res = await fetch(inputPreview);
        const blob = await res.blob();
        const file = new File([blob], `vid-${Date.now()}.mp4`, { type: blob.type || "video/mp4" });
        mediaUrl = await uploadToStorage(file);
      }
      if (!mediaUrl) throw new Error("Please upload a video first.");

      const res = await generate({
        data: {
          type: "video",
          prompt: prompt.trim() || "Enhance this video",
          imageUrl: mediaUrl,
          videoDurationSeconds: videoDuration,
          videoResolution,
          videoAspectRatio: videoAspect,
          sourceKind: "video",
        },
      });

      if (runId !== runIdRef.current) return;
      const url =
        (res as { outputUrl?: string })?.outputUrl ??
        (res as { url?: string })?.url ??
        null;
      if (!url) throw new Error((res as { error?: string })?.error || "No video returned");
      setOutput(url);
      setState("success");
      setProgress(100);
      toast.success("Video ready");
      void refreshProfile();
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setState("error");
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      endGeneration();
    }
  };

  /* Phase 2: Stop / Cancel removed — job runs to completion or fails with refund. */

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
  };

  const handleDownload = async () => {
    if (!output) return;
    try {
      await triggerBrowserDownload(output, `motio2edit-video-${Date.now()}.mp4`);
      setDownloaded(true);
      toast.success("Download started!");
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
      /* user cancelled share sheet — not generation */
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
        <StudioBackLink />
      </div>

      <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
      <EditorDisclaimer />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="order-1 space-y-4">
          <EditorUpload
            fileRef={fileRef}
            mediaType="video"
            onFile={onFile}
            disabled={loading}
            inputPreview={inputPreview}
            inputKind={inputKind}
            onClear={handleClear}
          />

          <EditorPromptPanel
            prompt={prompt}
            setPrompt={setPrompt}
            taRef={taRef}
            suggestions={suggestions}
            disabled={loading}
            mediaType="video"
          />

          <EditorOptionsPanel
            mediaType="video"
            aspectRatio={noopAspect}
            setAspectRatio={noopSetAspect}
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
            disabled={loading}
          />

          <EditorGenerationControls
            loading={loading}
            onGenerate={runGenerate}
            hideStop
            videoLocked={videoLocked}
            noCredits={noCredits}
            showAutoToggle={false}
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
          />

          {output && state === "success" && (
            <EditorResult
              output={output}
              outputIsVideo
              onDownload={handleDownload}
              onShare={handleShare}
              downloaded={downloaded}
            />
          )}

          {state === "error" && (
            <Button variant="outline" className="w-full" onClick={() => setState("idle")}>
              <RotateCcw className="mr-2 h-4 w-4" /> Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
