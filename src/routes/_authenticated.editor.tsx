import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { prepareAutoEditRun } from "@/lib/auto-edit/run.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  imageQualityCost,
  videoResolutionMultiplier,
  type ImageQuality,
  type VideoResolution,
} from "@/lib/quality-options";
import { watermarkImage, applyDownloadWatermarkGrid } from "@/lib/watermark";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPlanLimits } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { videoCreditCost, type VideoDuration, type VideoAspectRatio } from "@/lib/video-options";

import { toast } from "sonner";
import {
  Upload, Sparkles, Download, Lock, Image as ImageIcon, Video,
  Square, RotateCcw, Pencil, Recycle, Check, RefreshCw, Share2, Wand2, Eraser,
  Plus, X, Coins,
} from "lucide-react";

import type { GenState, GalleryItem } from "@/lib/editor/editor.types";
import { MAX_GALLERY_IMAGES, WATERMARK_PREF_KEY, LOADING_MESSAGES, MAX_IMAGE_MB, MAX_VIDEO_MB } from "@/lib/editor/editor.constants";
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

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor,
});

function Editor() {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const prepareAuto = useServerFn(prepareAutoEditRun);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);


  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [inputDataUrl, setInputDataUrl] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputKind, setInputKind] = useState<"image" | "video" | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [output, setOutput] = useState<string | null>(null);
  const [outputIsVideo, setOutputIsVideo] = useState(false);
  const [state, setState] = useState<GenState>("idle");
  const [strength, setStrength] = useState(0.7);
  const [keepWatermark, setKeepWatermark] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [smartRemoveOpen, setSmartRemoveOpen] = useState(false);
  const [pendingSmartRemove, setPendingSmartRemove] = useState(false);
  const [removeMaskDataUrl, setRemoveMaskDataUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(5);
  const [videoAspect, setVideoAspect] = useState<VideoAspectRatio>("16:9");
  const [imageQuality, setImageQuality] = useState<ImageQuality>("hd");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("1080p");
  /** Image Studio Auto mode — separate from Global Auto page. */
  const [autoMode, setAutoMode] = useState(false);


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

  // Auto is image-only; leave mode when switching to video.
  useEffect(() => {
    if (mediaType === "video" && autoMode) setAutoMode(false);
  }, [mediaType, autoMode]);

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
    try {
      const raw = sessionStorage.getItem("motio2edit-reuse");
      if (!raw) return;
      sessionStorage.removeItem("motio2edit-reuse");
      const { url, kind } = JSON.parse(raw) as { url: string; kind: "image" | "video" };
      if (!url) return;
      if (kind === "video") {
        setMediaType("video");
        setInputPreview(url);
        setInputKind("video");
      } else {
        setMediaType("image");
        setInputPreview(url);
        setInputDataUrl(url);
        setInputKind("image");
      }
      toast.success("Loaded from your history — keep editing.");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let hasContext = false;
    try {
      const raw = sessionStorage.getItem("motio2edit-preset");
      const reuse = sessionStorage.getItem("motio2edit-reuse");
      const mode = sessionStorage.getItem("motio2edit-mode");
      hasContext = !!(raw || reuse || mode);
      if (raw) {
        sessionStorage.removeItem("motio2edit-preset");
        const { prompt: p, mode: m, smartRemove } = JSON.parse(raw) as {
          prompt?: string;
          mode?: "image" | "video";
          smartRemove?: boolean;
        };
        if (m === "image" || m === "video") setMediaType(m);
        if (typeof p === "string" && p.length > 0) setPrompt(p);
        if (smartRemove) setPendingSmartRemove(true);
      }
      if (mode === "image" || mode === "video") {
        setMediaType(mode);
        sessionStorage.removeItem("motio2edit-mode");
      }
    } catch {
      /* ignore */
    }
    if (!hasContext) {
      navigate({ to: "/studio/image" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingSmartRemove && mediaType === "image" && inputDataUrl) {
      setPendingSmartRemove(false);
      setSmartRemoveOpen(true);
    }
  }, [pendingSmartRemove, mediaType, inputDataUrl]);


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
    return () => { clearInterval(msg); clearInterval(stg); clearInterval(prg); };
  }, [state, stages.length]);

  if (!profile) return null;
  const plan = getPlan(profile.plan);
  const isVideoEnhance = mediaType === "video" && inputKind === "video" && !!inputFile;
  const cost = isVideoEnhance
    ? CREDIT_COST.video_enhance
    : mediaType === "video"
      ? Math.round(videoCreditCost(videoDuration) * videoResolutionMultiplier(videoResolution))
      : imageQualityCost(imageQuality);
  const noCredits = !isAdmin && profile.credits < cost;
  const videoLocked = !isAdmin && mediaType === "video" && !plan.video;
  const planLimits = getPlanLimits(profile.plan);
  const canAddRefImages = mediaType === "image" && !!inputDataUrl && planLimits.maxImages > 1;
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

    const first = files[0];
    const isVideo = first.type.startsWith("video");

    if (isVideo) {
      if (first.size > MAX_VIDEO_MB * 1024 * 1024) {
        return toast.error(
          `File is too large (${(first.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_VIDEO_MB} MB for videos.`,
        );
      }
      setGallery([]);
      setActiveImage(0);
      setOutput(null);
      setDownloaded(false);
      setState("idle");
      setInputPreview(URL.createObjectURL(first));
      setInputFile(first);
      setInputKind("video");
      setInputDataUrl(null);
      toast.success("📁 Upload complete!");
      return;
    }

    const room = MAX_GALLERY_IMAGES - gallery.length;
    if (room <= 0) return toast.error(`You can work with up to ${MAX_GALLERY_IMAGES} images at a time.`);

    const accepted: File[] = [];
    for (const f of files.slice(0, room)) {
      if (!f.type.startsWith("image")) continue;
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

  /** Resolve active image to https URL for analysis/generation. */
  const resolveActiveImageUrl = async (): Promise<string> => {
    if (inputKind === "image" && inputFile) {
      return uploadToStorage(inputFile);
    }
    if (inputKind === "image" && inputDataUrl) {
      if (inputDataUrl.startsWith("https://")) return inputDataUrl;
      if (inputDataUrl.startsWith("data:") || inputDataUrl.startsWith("blob:")) {
        const res = await fetch(inputDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `img-${Date.now()}.jpg`, {
          type: blob.type || "image/jpeg",
        });
        return uploadToStorage(file);
      }
    }
    throw new Error("Please upload an image first.");
  };

  /**
   * In-editor Auto Edit — stays on /editor, uses active single image.
   * Optional prompt / tool text is merged server-side; never shown as system prompt.
   * Image-only works (analysis decides the edit).
   */
  const runInEditorAuto = async () => {
    if (mediaType !== "image" || !inputDataUrl) {
      toast.error("Upload one image first to use Auto Edit.");
      return;
    }
    if (gallery.length > 1) {
      toast.error(
        "Auto Edit currently supports only one image. Remove extra gallery images or keep a single active photo.",
      );
      return;
    }
    if (refImages.length > 0) {
      toast.error(
        "Auto Edit works on a single image. Clear reference images to continue, or use Generate with a prompt instead.",
      );
      return;
    }
    if (noCredits) {
      setState("blocked");
      return toast.error(`Not enough credits. This costs about ${cost} credits per step.`);
    }

    const runId = ++runIdRef.current;
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    startGeneration("image", "/editor");
    toast("A✦ Auto — analyzing your image…");

    try {
      const mediaUrl = await resolveActiveImageUrl();
      if (runId !== runIdRef.current) return;

      const prepared = await prepareAuto({
        data: {
          imageUrl: mediaUrl,
          imageQuality,
          userPrompt: prompt.trim() || undefined,
          context: "editor",
        },
      });

      if (runId !== runIdRef.current) return;

      if (prepared.status === "NO_CHANGE" || prepared.steps.length === 0) {
        setState("idle");
        endGeneration();
        toast.message(prepared.message || "No automatic changes recommended.");
        return;
      }

      setState("loading");
      toast(`A✦ Applying ${prepared.steps.length} automatic improvement(s)…`);

      let currentUrl = mediaUrl;
      for (const step of prepared.steps) {
        if (runId !== runIdRef.current) return;
        const res = await generate({
          data: {
            prompt: step.internalPrompt,
            type: "image",
            imageUrl: currentUrl,
            sourceKind: "image",
            strength: step.strength,
            imageQuality,
          },
        });
        if (!res.outputUrl) throw new Error("Generation returned no image.");
        currentUrl = res.outputUrl;
      }

      if (runId !== runIdRef.current) return;

      let url = currentUrl;
      setOutputIsVideo(false);
      if (url && !isAdmin && (isFree || keepWatermark)) {
        try {
          const marked = await watermarkImage(url, { strong: isFree });
          if (marked && marked !== url) url = marked;
        } catch {
          /* keep original */
        }
      }

      setProgress(100);
      setStage(stages.length);
      setOutput(url);
      setState("success");
      await refreshProfile();
      toast.success("✅ Auto Edit complete — result in the canvas");
      endGeneration();
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setState("idle");
      endGeneration();
      toast.error(err instanceof Error ? `❌ ${err.message}` : "❌ Auto Edit failed.");
    }
  };

  const runGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    if (videoLocked) { setState("blocked"); return toast.error("Video generation requires a paid plan."); }
    if (noCredits) { setState("blocked"); return toast.error(`Not enough credits. This costs ${cost} credits.`); }

    const runId = ++runIdRef.current;
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    await new Promise((r) => setTimeout(r, 1500));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast(mediaType === "video" ? "🎬 Generating your video..." : "🎨 Generating your image...");
    startGeneration(mediaType === "video" ? "video" : "image", "/editor");
    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast("⏳ Still working — high quality takes a moment...");
      }, 30_000),
      setTimeout(() => {
        if (runId === runIdRef.current) toast("🔁 Taking longer than usual — retrying automatically...");
      }, 75_000),
    ];
    try {

      let mediaUrl: string | undefined;
      let maskImageUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;
      if (inputKind === "image" && inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
        sourceKind = "image";
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
        sourceKind = "image";
      } else if (inputKind === "video" && inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
        sourceKind = "video";
      }

      if (mediaUrl && !mediaUrl.startsWith("https://")) {
        throw new Error("Image upload failed. Please re-upload and try again.");
      }
      if (sourceKind === "image" && !mediaUrl) {
        throw new Error("Please upload an image first.");
      }
      if (removeMaskDataUrl && sourceKind === "image") {
        const maskRes = await fetch(removeMaskDataUrl);
        const maskBlob = await maskRes.blob();
        const maskFile = new File([maskBlob], `remove-mask-${Date.now()}.png`, {
          type: "image/png",
        });
        maskImageUrl = await uploadToStorage(maskFile);
      }

      let referenceImageUrls: string[] | undefined;
      if (canAddRefImages && refImages.length > 0) {
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
          prompt,
          type: mediaType,
          imageUrl: mediaUrl,
          sourceKind,
          strength: mediaType === "image" && sourceKind === "image" ? strength : undefined,
          maskImageUrl,
          referenceImageUrls,

          aspectRatio:
            mediaType === "image" && !mediaUrl ? aspectRatio : undefined,
          videoDurationSeconds: mediaType === "video" ? videoDuration : undefined,
          videoAspectRatio: mediaType === "video" ? videoAspect : undefined,
          imageQuality: mediaType === "image" ? imageQuality : undefined,
          videoResolution: mediaType === "video" ? videoResolution : undefined,
        },
      });

      if (runId !== runIdRef.current) return;
      let url = res.outputUrl;
      const isVideoOut = mediaType === "video";
      setOutputIsVideo(isVideoOut);
      if (!isVideoOut && url && !isAdmin && (isFree || keepWatermark)) {
        try {
          const marked = await watermarkImage(url, { strong: isFree });
          if (marked && marked !== url) {
            url = marked;
          }
        } catch {
          /* keep original */
        }
      }

      if (runId !== runIdRef.current) return;
      setProgress(100);
      setStage(stages.length);
      setOutput(url);
      setState("success");
      await refreshProfile();
      toast.success(isVideoOut ? "✅ Video ready!" : "✅ Image ready!");
      endGeneration();
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setState("idle");
      endGeneration();
      toast.error(
        err instanceof Error
          ? `❌ ${err.message}`
          : "❌ Failed. Credits not charged.",
      );
    } finally {
      progressTimers.forEach(clearTimeout);
    }

  };

  /** Generate respects Auto ON/OFF. Auto OFF never uses the Auto pipeline. */
  const handleGenerate = () => {
    if (autoMode && mediaType === "image") {
      void runInEditorAuto();
      return;
    }
    void runGenerate();
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
    setOutputIsVideo(false);
    setState("idle");
    setDownloaded(false);
    setProgress(0);
    setStage(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleEditAgain = () => {
    setState("idle");
    setDownloaded(false);
  };

  const handleUseResultAsInput = () => {
    if (!output || outputIsVideo) return;
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
    let downloadUrl = output;
    if (!outputIsVideo && !isAdmin) {
      if (isFree) {
        const alreadyClientStamped = output.startsWith("data:");
        if (!alreadyClientStamped) {
          try { downloadUrl = await applyDownloadWatermarkGrid(output); } catch { /* ignore */ }
        }
      } else if (keepWatermark) {
        try { downloadUrl = await watermarkImage(output); } catch { /* ignore */ }
      }
    }
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `motio2edit-${Date.now()}.${outputIsVideo ? "mp4" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
    toast.success("⬇️ Download started!");
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
    } catch { /* user cancelled */ }
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
    // Auto tool enables Image Studio Auto mode — does not one-shot generate.
    if (tool.prompt === "__AUTO_EDIT__" || tool.id === "auto") {
      setAutoMode(true);
      toast.message("Auto ON — click Generate (prompt optional).");
      return;
    }
    // Never inject sentinel strings into the visible prompt
    if (tool.prompt.startsWith("__") && tool.prompt.endsWith("__")) return;
    setPrompt(tool.prompt);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <h1 className="text-2xl font-bold">
          {mediaType === "video" ? "Video Editor" : "Image Editor"}
        </h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
            {isAdmin ? "∞ credits" : `${profile.credits} credits`}
          </span>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {mediaType === "video"
              ? `Video ${cost} credits (${videoDuration}s)`
              : `Image ${CREDIT_COST.image} credits`}
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
          <Button asChild size="sm"><Link to="/pricing">Upgrade</Link></Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="order-1 space-y-5">
          <EditorUpload
            fileRef={fileRef}
            mediaType={mediaType}
            videoLocked={videoLocked}
            loading={loading}
            inputPreview={inputPreview}
            inputKind={inputKind}
            maxImageMb={MAX_IMAGE_MB}
            maxVideoMb={MAX_VIDEO_MB}
            onFile={onFile}
            gallery={gallery}
            activeImage={activeImage}
            maxGalleryImages={MAX_GALLERY_IMAGES}
            onSwitchImage={switchImage}
            onRemoveImage={removeImage}
          />

          <EditorPromptPanel
            mediaType={mediaType}
            loading={loading}
            inputDataUrl={inputDataUrl}
            prompt={prompt}
            setPrompt={setPrompt}
            taRef={taRef}
            suggestions={suggestions}
            onSelectTool={handleSelectTool}
          />

          <EditorOptionsPanel
            mediaType={mediaType}
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
            videoDuration={videoDuration}
            setVideoDuration={setVideoDuration}
            videoAspect={videoAspect}
            setVideoAspect={setVideoAspect}
            videoResolution={videoResolution}
            setVideoResolution={setVideoResolution}
            cost={cost}
            isAdmin={isAdmin}
            credits={profile.credits}
            keepWatermark={keepWatermark}
            setKeepWatermark={setKeepWatermark}
            isFree={isFree}
          />

          <EditorGenerationControls
            loading={loading}
            onGenerate={handleGenerate}
            onStop={handleStop}
            videoLocked={videoLocked}
            noCredits={noCredits}
            autoMode={autoMode}
            onAutoModeChange={setAutoMode}
            showAutoToggle={mediaType === "image"}
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
            outputIsVideo={outputIsVideo}
            mediaType={mediaType}
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
            onRegenerate={handleGenerate}
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
          setRemoveMaskDataUrl(masked);
          setPrompt(SMART_REMOVE_PROMPT);
          setSmartRemoveOpen(false);
          toast.success("Selection saved — click Generate to remove.");
        }}
      />
    </div>
  );
}
