/**
 * Image Editor workspace — independent of Video Editor.
 * Extracted from _authenticated.editor.tsx without behavior/UI redesign.
 */
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import { imageQualityCost, type ImageQuality } from "@/lib/quality-options";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPlanLimits } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { GenState, GalleryItem } from "@/lib/editor/editor.types";
import {
  MAX_GALLERY_IMAGES,
  WATERMARK_PREF_KEY,
  LOADING_MESSAGES,
  MAX_IMAGE_MB,
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

export type ImageEditorProps = {
  bootstrap?: EditorBootstrap;
};

export function ImageEditor({ bootstrap }: ImageEditorProps) {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState(bootstrap?.initialPrompt ?? "");
  const [inputPreview, setInputPreview] = useState<string | null>(
    bootstrap?.reuseUrl && bootstrap.reuseKind !== "video" ? bootstrap.reuseUrl : null,
  );
  const [inputDataUrl, setInputDataUrl] = useState<string | null>(
    bootstrap?.reuseUrl && bootstrap.reuseKind !== "video" ? bootstrap.reuseUrl : null,
  );
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputKind, setInputKind] = useState<"image" | null>(
    bootstrap?.reuseUrl && bootstrap.reuseKind !== "video" ? "image" : null,
  );
  const [refImages, setRefImages] = useState<string[]>([]);
  const [output, setOutput] = useState<string | null>(null);
  const [state, setState] = useState<GenState>("idle");
  const [strength, setStrength] = useState(0.7);
  const [keepWatermark, setKeepWatermark] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [smartRemoveOpen, setSmartRemoveOpen] = useState(false);
  const [pendingSmartRemove, setPendingSmartRemove] = useState(
    bootstrap?.pendingSmartRemove === true,
  );
  const [removeMaskDataUrl, setRemoveMaskDataUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [imageQuality, setImageQuality] = useState<ImageQuality>("hd");

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;
  const stages = getEditorStages(!!inputDataUrl);

  useEffect(() => {
    try {
      const pref = localStorage.getItem(WATERMARK_PREF_KEY);
      if (pref === "on") setKeepWatermark(true);
      if (pref === "off") setKeepWatermark(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (bootstrap?.reuseUrl && bootstrap.reuseKind !== "video") {
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
    if (pendingSmartRemove && inputDataUrl) {
      setPendingSmartRemove(false);
      setSmartRemoveOpen(true);
    }
  }, [pendingSmartRemove, inputDataUrl]);

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

  const cost = imageQualityCost(imageQuality);
  const noCredits = !isAdmin && profile.credits < cost;
  const planLimits = getPlanLimits(profile.plan);
  const canAddRefImages = !!inputDataUrl && planLimits.maxImages > 1;
  const loading = state === "loading" || state === "analyzing";
  const suggestions = getSmartSuggestions(prompt);
  const uploadToStorage = (file: File) => uploadToStorageUtil(file, profile?.id ?? "anon");

  const activateSlot = (items: GalleryItem[], idx: number) => {
    const item = items[idx];
    if (!item) return;
    setActiveImage(idx);
    setInputPreview(item.preview);
    setInputDataUrl(item.dataUrl);
    setInputFile(item.file);
    setInputKind("image");
    setOutput(null);
    setDownloaded(false);
    setRemoveMaskDataUrl(null);
    setState("idle");
  };

  const switchImage = (idx: number) => {
    if (loading) return;
    activateSlot(gallery, idx);
  };

  const removeImage = (idx: number) => {
    if (loading) return;
    const next = gallery.filter((_, i) => i !== idx);
    setGallery(next);
    if (next.length === 0) {
      setActiveImage(0);
      setInputPreview(null);
      setInputDataUrl(null);
      setInputFile(null);
      setInputKind(null);
      setOutput(null);
      return;
    }
    activateSlot(next, Math.min(idx, next.length - 1));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    const room = MAX_GALLERY_IMAGES - gallery.length;
    if (room <= 0) {
      return toast.error(`You can work with up to ${MAX_GALLERY_IMAGES} images at a time.`);
    }

    const accepted: File[] = [];
    for (const f of files.slice(0, room)) {
      if (!f.type.startsWith("image")) {
        toast.error("This workspace accepts images only. Use Video Editor for video.");
        continue;
      }
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.error(
          `${f.name} is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_IMAGE_MB} MB.`,
        );
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;

    const items: GalleryItem[] = await Promise.all(
      accepted.map(async (f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview: URL.createObjectURL(f),
        dataUrl: await readAsDataUrl(f),
        file: f,
      })),
    );

    const next = [...gallery, ...items];
    setGallery(next);
    activateSlot(next, gallery.length);
    toast.success(
      items.length > 1 ? `📁 ${items.length} images uploaded!` : "📁 Upload complete!",
    );
  };

  /** Shared upload + generate path used by prompt Generate and Circle to Remove. */
  const runImageJob = async (opts: {
    jobPrompt: string;
    maskDataUrl?: string | null;
    toastStart?: string;
  }) => {
    if (noCredits) {
      setState("blocked");
      return toast.error(`Not enough credits. This costs ${cost} credits.`);
    }

    const runId = ++runIdRef.current;
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    await new Promise((r) => setTimeout(r, 600));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast(opts.toastStart ?? "🎨 Generating your image...");
    startGeneration("image", "/editor");
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
      let maskImageUrl: string | undefined;

      if (inputKind === "image" && inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
      } else if (inputKind === "image" && inputDataUrl) {
        if (inputDataUrl.startsWith("data:") || inputDataUrl.startsWith("blob:")) {
          const res = await fetch(inputDataUrl);
          const blob = await res.blob();
          const file = new File([blob], `img-${Date.now()}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          mediaUrl = await uploadToStorage(file);
        } else if (inputDataUrl.startsWith("https://")) {
          mediaUrl = inputDataUrl;
        } else {
          throw new Error("Invalid image. Please re-upload your photo.");
        }
      }

      if (mediaUrl && !mediaUrl.startsWith("https://")) {
        throw new Error("Image upload failed. Please re-upload and try again.");
      }
      if (inputKind === "image" && !mediaUrl) {
        throw new Error("Please upload an image first.");
      }

      const maskSrc = opts.maskDataUrl ?? removeMaskDataUrl;
      if (maskSrc && mediaUrl) {
        const maskRes = await fetch(maskSrc);
        const maskBlob = await maskRes.blob();
        const maskFile = new File([maskBlob], `remove-mask-${Date.now()}.png`, {
          type: "image/png",
        });
        maskImageUrl = await uploadToStorage(maskFile);
      }

      let referenceImageUrls: string[] | undefined;
      if (!maskImageUrl && canAddRefImages && refImages.length > 0) {
        const wanted = refImages.slice(0, Math.max(0, planLimits.maxImages - 1));
        toast(`📤 Uploading ${wanted.length} reference image${wanted.length > 1 ? "s" : ""}...`);
        const uploaded: string[] = [];
        for (const src of wanted) {
          if (src.startsWith("https://")) {
            uploaded.push(src);
            continue;
          }
          const refRes = await fetch(src);
          const refBlob = await refRes.blob();
          const refFile = new File([refBlob], `ref-${Date.now()}-${uploaded.length}.jpg`, {
            type: refBlob.type || "image/jpeg",
          });
          uploaded.push(await uploadToStorage(refFile));
        }
        const valid = uploaded.filter((u) => u.startsWith("https://"));
        if (valid.length !== wanted.length) {
          toast.error("Some reference images could not be uploaded and were skipped.");
        }
        referenceImageUrls = valid.length > 0 ? valid : undefined;
        if (referenceImageUrls) {
          toast.success(`✅ Sending ${referenceImageUrls.length + 1} images to the AI`);
        }
      }
      if (runId !== runIdRef.current) return;

      const res = await generate({
        data: {
          prompt: opts.jobPrompt,
          type: "image",
          imageUrl: mediaUrl,
          sourceKind: mediaUrl ? "image" : undefined,
          strength: mediaUrl ? strength : undefined,
          maskImageUrl,
          referenceImageUrls,
          keepWatermark,
          aspectRatio: !mediaUrl ? aspectRatio : undefined,
          imageQuality,
        },
      });

      if (runId !== runIdRef.current) return;
      const url = res.outputUrl;
      setProgress(100);
      setStage(stages.length);
      setOutput(url);
      setState("success");
      setRemoveMaskDataUrl(null);
      await refreshProfile();
      toast.success("✅ Image ready!");
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

  const runGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    await runImageJob({ jobPrompt: prompt.trim() });
  };

  /** Circle to Remove: mask only — prompt stays backend, never fills the Describe field. */
  const runSmartRemove = async (maskDataUrl: string) => {
    setRemoveMaskDataUrl(maskDataUrl);
    setSmartRemoveOpen(false);
    await runImageJob({
      jobPrompt: SMART_REMOVE_PROMPT,
      maskDataUrl,
      toastStart: "✨ Removing selected area…",
    });
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
    setInputDataUrl(null);
    setInputFile(null);
    setInputKind(null);
    setRefImages([]);
    setRemoveMaskDataUrl(null);
    setOutput(null);
    setState("idle");
    setDownloaded(false);
    setProgress(0);
    setStage(0);
    setGallery([]);
    setActiveImage(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUseResultAsInput = () => {
    if (!output) return;
    setInputPreview(output);
    setInputDataUrl(output);
    setInputKind("image");
    setOutput(null);
    setState("idle");
    setDownloaded(false);
    toast.success("Result moved to input — keep editing.");
  };

  const handleDownload = async () => {
    if (!output) return;
    try {
      const res = await secureDl({
        data: {
          imageUrl: output,
          keepWatermark: keepWatermark === true,
        },
      });
      await triggerBrowserDownload(res.downloadUrl, `motio2edit-${Date.now()}.jpg`);
      setDownloaded(true);
      toast.success(
        res.watermarked ? "⬇️ Download started (branded)" : "⬇️ Download started",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed. Please try again.");
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

  const handleSelectTool = (tool: { prompt: string; id?: string }) => {
    if (tool.prompt === "__CIRCLE_REMOVE__") {
      if (!inputDataUrl) {
        toast.error("Upload an image first to use Circle to Remove.");
        return;
      }
      setSmartRemoveOpen(true);
      return;
    }
    // Prompt-filling tools are disabled in the UI; ignore if any leak through.
    if (tool.prompt.startsWith("__") && tool.prompt.endsWith("__")) return;
  };

  // No-ops for video-only props required by shared EditorOptionsPanel
  const noopVideoDuration = 5 as const;
  const noopSetVideoDuration = () => {};
  const noopVideoAspect = "16:9" as const;
  const noopSetVideoAspect = () => {};
  const noopVideoRes = "1080p" as const;
  const noopSetVideoRes = () => {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <h1 className="text-2xl font-bold">Image Editor</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
            {isAdmin ? "∞ credits" : `${profile.credits} credits`}
          </span>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Image {CREDIT_COST.image} credits
          </span>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="order-1 space-y-5">
          <EditorUpload
            fileRef={fileRef}
            mediaType="image"
            videoLocked={false}
            loading={loading}
            inputPreview={inputPreview}
            inputKind={inputKind}
            maxImageMb={MAX_IMAGE_MB}
            maxVideoMb={200}
            onFile={onFile}
            gallery={gallery}
            activeImage={activeImage}
            maxGalleryImages={MAX_GALLERY_IMAGES}
            onSwitchImage={switchImage}
            onRemoveImage={removeImage}
          />

          <EditorPromptPanel
            mediaType="image"
            loading={loading}
            inputDataUrl={inputDataUrl}
            prompt={prompt}
            setPrompt={setPrompt}
            taRef={taRef}
            suggestions={suggestions}
            onSelectTool={handleSelectTool}
          />

          <EditorOptionsPanel
            mediaType="image"
            loading={loading}
            inputDataUrl={inputDataUrl}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            imageQuality={imageQuality}
            setImageQuality={setImageQuality}
            strength={strength}
            setStrength={setStrength}
            canAddRefImages={canAddRefImages}
            refImages={refImages}
            setRefImages={setRefImages}
            userPlan={profile.plan}
            videoDuration={noopVideoDuration}
            setVideoDuration={noopSetVideoDuration as never}
            videoAspect={noopVideoAspect}
            setVideoAspect={noopSetVideoAspect as never}
            videoResolution={noopVideoRes}
            setVideoResolution={noopSetVideoRes as never}
            cost={cost}
            isAdmin={isAdmin}
            credits={profile.credits}
            keepWatermark={keepWatermark}
            setKeepWatermark={setKeepWatermark}
            isFree={isFree}
          />

          <EditorGenerationControls
            loading={loading}
            onGenerate={runGenerate}
            onStop={handleStop}
            videoLocked={false}
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
            outputIsVideo={false}
            mediaType="image"
            inputPreview={inputPreview}
            inputKind={inputKind}
            isAdmin={isAdmin}
            isFree={isFree}
            keepWatermark={keepWatermark}
          />

          <EditorResult
            output={output}
            loading={loading}
            onDownload={handleDownload}
            onRegenerate={runGenerate}
            onEditAgain={handleUseResultAsInput}
            onShare={handleShare}
            onClear={handleClear}
            isFree={isFree}
            downloaded={downloaded}
          />
        </div>
        <EditorDisclaimer />
      </div>

      <SmartRemoveModal
        open={smartRemoveOpen}
        imageUrl={inputPreview}
        onCancel={() => setSmartRemoveOpen(false)}
        onApply={(masked) => {
          // Do NOT set visible prompt — entire feature is backend-only.
          void runSmartRemove(masked);
        }}
      />
    </div>
  );
}
