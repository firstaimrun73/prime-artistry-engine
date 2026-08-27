/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → PROMPT → SELECT → GENERATE → OUTPUT
 */
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import { type ImageQuality } from "@/lib/quality-options";
import { quoteStandardCredits } from "@/lib/studio/image/standard";
import { quoteUltraCredits, normalizeUltraQuality } from "@/lib/studio/image/ultra";
import { quotePremiumCredits, normalizePremiumQuality } from "@/lib/studio/image/premium";
import { quoteGptImage2MultiCredits } from "@/lib/studio/image/gpt-image-2";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getPlanLimits, maxImagesForPlan } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { StudioBackLink } from "@/components/StudioBackLink";
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
import { StudioTierSelector } from "@/components/studio/StudioTierSelector";
import { PremiumImageGenerationOverlay } from "@/components/studio/overlays/PremiumImageGenerationOverlay";
import { UltraAIImageGenerationOverlay } from "@/components/studio/overlays/UltraAIImageGenerationOverlay";
import { visibleImageExperiences } from "@/lib/studio/image/image-experience-access";
import {
  studioCardClass,
  studioShellClass,
  studioTierToImageQuality,
  studioGenerateClass,
  studioAccentClass,
  studioExperienceLabel,
  imageQualitiesForStudioTier,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { cn } from "@/lib/utils";

export type ImageEditorProps = {
  bootstrap?: EditorBootstrap;
};

export function ImageEditor({ bootstrap }: ImageEditorProps) {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
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
  const [imageQuality, setImageQuality] = useState<ImageQuality>("sd");
  const [studioTier, setStudioTier] = useState<StudioTier>("standard");
  const [contextTags, setContextTags] = useState<string[]>([]);
  const qualityTouchedRef = useRef(false);

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);
  const [premiumCompleteHold, setPremiumCompleteHold] = useState(false);
  const [premiumGenError, setPremiumGenError] = useState<string | null>(null);
  const [ultraCompleteHold, setUltraCompleteHold] = useState(false);
  const [ultraGenError, setUltraGenError] = useState<string | null>(null);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;
  const stages = getEditorStages(!!inputDataUrl);
  const isPremiumExp = studioTier === "pro";
  const isUltraExp = studioTier === "premium";

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
    if (pendingSmartRemove) {
      setPendingSmartRemove(false);
      void navigate({ to: "/studio/image/circle-remove" });
    }
  }, [pendingSmartRemove, navigate]);

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

  useEffect(() => {
    if (!isPremiumExp) {
      setPremiumCompleteHold(false);
      setPremiumGenError(null);
    }
    if (!isUltraExp) {
      setUltraCompleteHold(false);
      setUltraGenError(null);
    }
    if (isPremiumExp && state === "success") {
      setPremiumGenError(null);
      setPremiumCompleteHold(true);
      const t = window.setTimeout(() => setPremiumCompleteHold(false), 1400);
      return () => window.clearTimeout(t);
    }
    if (isUltraExp && state === "success") {
      setUltraGenError(null);
      setUltraCompleteHold(true);
      const t = window.setTimeout(() => setUltraCompleteHold(false), 1400);
      return () => window.clearTimeout(t);
    }
    if (state === "idle" || state === "blocked") {
      if (isPremiumExp && !premiumGenError) setPremiumCompleteHold(false);
      if (isUltraExp && !ultraGenError) setUltraCompleteHold(false);
    }
  }, [state, isPremiumExp, isUltraExp, premiumGenError, ultraGenError]);

  /** Authoritative pre-generation estimate — must match server charge (Standard / Premium / Ultra). */
  const cost = useMemo(() => {
    const hasSource = !!inputDataUrl;
    const refCount = refImages.length;
    const hasMask = !!removeMaskDataUrl;
    const totalImages = (hasSource ? 1 : 0) + refCount;

    if (studioTier === "standard") {
      if (hasMask) {
        return quoteStandardCredits({ mode: "circle_to_remove" }).credits;
      }
      if (totalImages >= 2) {
        return quoteStandardCredits({
          mode: "multi_image_to_image",
          referenceCount: totalImages,
          imageQuality: imageQuality === "hd" ? "hd" : "sd",
        }).credits;
      }
      if (hasSource) {
        return quoteStandardCredits({
          mode: "image_to_image",
          imageQuality: imageQuality === "hd" ? "hd" : "sd",
        }).credits;
      }
      return quoteStandardCredits({
        mode: "text_to_image",
        imageQuality: imageQuality === "hd" ? "hd" : "sd",
      }).credits;
    }

    // Premium (pro)
    if (studioTier === "pro") {
      if (totalImages >= 2) {
        const outputClass =
          imageQuality === "2k" ? "2k" : imageQuality === "hd" ? "hd" : "sd";
        return quoteGptImage2MultiCredits({
          experience: "premium",
          referenceCount: totalImages,
          outputClass,
        }).credits;
      }
      if (hasSource) {
        return quotePremiumCredits({
          mode: "image_to_image",
          quality: normalizePremiumQuality(imageQuality),
        }).credits;
      }
      return quotePremiumCredits({
        mode: "text_to_image",
        quality: normalizePremiumQuality(imageQuality),
      }).credits;
    }

    // Ultra AI (premium tier) — same quoteUltraCredits as server
    if (studioTier === "premium") {
      const quality = normalizeUltraQuality(imageQuality);
      if (totalImages >= 2) {
        return quoteUltraCredits({
          mode: "multi_image",
          quality,
          referenceCount: totalImages,
        }).credits;
      }
      if (hasSource) {
        return quoteUltraCredits({ mode: "image_to_image", quality }).credits;
      }
      return quoteUltraCredits({ mode: "text_to_image", quality }).credits;
    }

    return 25;
  }, [
    studioTier,
    inputDataUrl,
    refImages.length,
    removeMaskDataUrl,
    imageQuality,
  ]);

  if (!profile) return null;

  const noCredits = !isAdmin && profile.credits < cost;
  // Admin uses maxImagesForPlan(..., true) → 10; non-admin stays on plan matrix
  const planLimits = isAdmin
    ? { ...getPlanLimits(profile.plan), maxImages: maxImagesForPlan(profile.plan, true), videoEnabled: true, hd: true }
    : getPlanLimits(profile.plan);
  const canAddRefImages = !!inputDataUrl && planLimits.maxImages > 1;
  const loading = state === "loading" || state === "analyzing";
  const suggestions = getSmartSuggestions(prompt);
  const uploadToStorage = (file: File) => uploadToStorageUtil(file, profile?.id ?? "anon");

  const showPremiumOverlay =
    isPremiumExp && (loading || premiumCompleteHold || !!premiumGenError);
  const showUltraOverlay =
    isUltraExp && (loading || ultraCompleteHold || !!ultraGenError);

  const showInlinePreview =
    (!isPremiumExp && !isUltraExp) ||
    (!loading &&
      !premiumCompleteHold &&
      !premiumGenError &&
      !ultraCompleteHold &&
      !ultraGenError &&
      !!output);

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

    const room = Math.min(MAX_GALLERY_IMAGES, planLimits.maxImages) - gallery.length;
    if (room <= 0) {
      return toast.error(`Your plan allows up to ${planLimits.maxImages} images at a time.`);
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
    setPremiumCompleteHold(false);
    setPremiumGenError(null);
    setUltraCompleteHold(false);
    setUltraGenError(null);
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
          studioTier,
        },
      });

      if (runId !== runIdRef.current) return;
      const url = res.outputUrl;
      setProgress(100);
      setStage(stages.length);
      setOutput(url);
      setState("success");
      setPremiumGenError(null);
      setUltraGenError(null);
      setRemoveMaskDataUrl(null);
      await refreshProfile();
      toast.success("✅ Image ready!");
      endGeneration();
    } catch (err) {
      if (runId !== runIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed. Credits not charged.";
      endGeneration();
      if (isPremiumExp) {
        setPremiumGenError(msg);
        setState("idle");
      } else if (isUltraExp) {
        setUltraGenError(msg);
        setState("idle");
      } else {
        setState("idle");
      }
      toast.error(`❌ ${msg}`);
    } finally {
      progressTimers.forEach(clearTimeout);
    }
  };

  const runGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    await runImageJob({ jobPrompt: prompt.trim() });
  };

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
    setPremiumCompleteHold(false);
    setPremiumGenError(null);
    setUltraCompleteHold(false);
    setUltraGenError(null);
    toast("Generation stopped.");
  };

  const handleDismissPremiumError = () => {
    setPremiumGenError(null);
    setPremiumCompleteHold(false);
    setState("idle");
  };

  const handleDismissUltraError = () => {
    setUltraGenError(null);
    setUltraCompleteHold(false);
    setState("idle");
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
    setPremiumCompleteHold(false);
    setPremiumGenError(null);
    setUltraCompleteHold(false);
    setUltraGenError(null);
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
          studioTier,
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
      // Carry current image to Circle 2edit product page
      try {
        if (inputDataUrl) {
          sessionStorage.setItem("circle2edit-preview", inputDataUrl);
        } else {
          sessionStorage.removeItem("circle2edit-preview");
        }
      } catch {
        /* ignore */
      }
      void navigate({ to: "/studio/image/circle-remove" });
      return;
    }
    if (tool.prompt.startsWith("__") && tool.prompt.endsWith("__")) return;
  };

  const noopVideoDuration = 5 as const;
  const noopSetVideoDuration = () => {};
  const noopVideoAspect = "16:9" as const;
  const noopSetVideoAspect = () => {};
  const noopVideoRes = "1080p" as const;
  const noopSetVideoRes = () => {};

  const expLabel = studioExperienceLabel(studioTier);

  const premiumPhase =
    premiumGenError
      ? "error"
      : state === "analyzing"
        ? "analyzing"
        : state === "loading"
          ? "loading"
          : premiumCompleteHold
            ? "success"
            : "loading";

  const ultraPhase =
    ultraGenError
      ? "error"
      : state === "analyzing"
        ? "analyzing"
        : state === "loading"
          ? "loading"
          : ultraCompleteHold
            ? "success"
            : "loading";

  return (
    <div className={cn("min-h-[100dvh] pb-8", studioShellClass(studioTier))}>
      {showPremiumOverlay && (
        <PremiumImageGenerationOverlay
          phase={premiumPhase}
          progress={progress}
          error={premiumGenError}
          onRetry={runGenerate}
          onDismiss={handleDismissPremiumError}
        />
      )}

      {showUltraOverlay && (
        <UltraAIImageGenerationOverlay
          phase={ultraPhase}
          progress={progress}
          error={ultraGenError}
          onRetry={runGenerate}
          onDismiss={handleDismissUltraError}
        />
      )}

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="space-y-2 min-w-0">
            <StudioBackLink />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              <span className="text-foreground">Image</span>{" "}
              <span className="text-orange-500">Studio</span>
              <span className="mx-1.5 text-muted-foreground/50 font-normal">·</span>
              <span
                className={cn(
                  "align-middle text-sm sm:text-base font-semibold tracking-normal",
                  studioTier === "premium" && "text-[#E8C547]",
                  studioTier === "pro" && "text-orange-600 dark:text-orange-400",
                  studioTier === "standard" && "text-primary",
                )}
              >
                {expLabel}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload · Prompt · Experience · Generate
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1.5 text-xs font-semibold backdrop-blur-sm sm:px-3">
              {isAdmin ? "∞ credits" : `${profile.credits} credits`}
            </span>
            <Button size="sm" variant="ghost" onClick={handleClear} className="min-h-[36px]">
              <RotateCcw className="mr-1.5 h-4 w-4" /> New
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="order-1 space-y-5">
            <div className={cn("space-y-3 p-4 sm:p-5", studioCardClass(studioTier))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Image
              </p>
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
                maxGalleryImages={Math.min(MAX_GALLERY_IMAGES, planLimits.maxImages)}
                onSwitchImage={switchImage}
                onRemoveImage={removeImage}
              />
            </div>

            <div className={cn("space-y-3 p-4 sm:p-5", studioCardClass(studioTier))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prompt
              </p>
              <EditorPromptPanel
                mediaType="image"
                loading={loading}
                inputDataUrl={inputDataUrl}
                inputPreview={inputPreview}
                prompt={prompt}
                setPrompt={setPrompt}
                taRef={taRef}
                suggestions={suggestions}
                onSelectTool={handleSelectTool}
                studioTier={studioTier}
                referenceCount={refImages.length}
                maxChars={
                  studioTier === "premium"
                    ? 10000
                    : studioTier === "pro"
                      ? 4000
                      : 2000
                }
                contextTags={contextTags}
                onToggleTag={(id) => {
                  setContextTags((prev) =>
                    prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
                  );
                  setPrompt((p) => {
                    const tagLabel =
                      id === "outfit"
                        ? "@Outfit"
                        : id === "background"
                          ? "@Background"
                          : id === "color"
                            ? "@Color"
                            : id === "lighting"
                              ? "@Lighting"
                              : id === "style"
                                ? "@Style"
                                : id === "object"
                                  ? "@Object"
                                  : `@${id}`;
                    if (p.includes(tagLabel)) return p;
                    const base = p.trim();
                    return base ? `${base} ${tagLabel} ` : `${tagLabel} `;
                  });
                }}
              />
            </div>

            <div className={cn("space-y-4 p-4 sm:p-5", studioCardClass(studioTier))}>
               <StudioTierSelector
                value={studioTier}
                experiences={visibleImageExperiences(profile.plan, isAdmin)}
                onChange={(t) => {
                  setStudioTier(t);
                  const allowed = imageQualitiesForStudioTier(t);
                  const preferred = studioTierToImageQuality(t);
                  if (!qualityTouchedRef.current) {
                    setImageQuality(preferred);
                  } else if (!allowed.includes(imageQuality)) {
                    setImageQuality(preferred);
                  }
                }}
              />
              <div className="border-t border-border/50 pt-4">
              <EditorOptionsPanel
                mediaType="image"
                loading={loading}
                inputDataUrl={inputDataUrl}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                imageQuality={imageQuality}
                setImageQuality={(q) => {
                  qualityTouchedRef.current = true;
                  setImageQuality(q);
                }}
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
                studioTier={studioTier}
              />
              </div>
            </div>

            <div className={cn("space-y-3 p-4 sm:p-5 ring-1 ring-primary/15", studioCardClass(studioTier))}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Generate
              </p>
              <EditorGenerationControls
                loading={loading}
                onGenerate={runGenerate}
                onStop={handleStop}
                videoLocked={false}
                noCredits={noCredits}
                generateClassName={studioGenerateClass(studioTier)}
              />
            </div>
          </div>

          <div className="order-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
            {showInlinePreview && (loading || output) && (
              <div className={cn("p-3 sm:p-4", studioCardClass(studioTier))}>
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
                  studioTier={studioTier}
                />
              </div>
            )}

            <EditorResult
              output={output}
              loading={loading || premiumCompleteHold || ultraCompleteHold}
              onDownload={handleDownload}
              onRegenerate={runGenerate}
              onEditAgain={handleUseResultAsInput}
              onShare={handleShare}
              onClear={handleClear}
              isFree={isFree}
              downloaded={downloaded}
            />

            {!loading && !output && !premiumCompleteHold && !premiumGenError && !ultraCompleteHold && !ultraGenError && (
              <div
                className={cn(
                  "flex min-h-[100px] items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground",
                )}
              >
                Result appears here after Generate.
              </div>
            )}
          </div>
          <EditorDisclaimer />
        </div>

        <SmartRemoveModal
          open={smartRemoveOpen}
          imageUrl={inputPreview}
          onCancel={() => setSmartRemoveOpen(false)}
          onApply={(masked) => {
            void runSmartRemove(masked);
          }}
        />
      </div>
    </div>
  );
}
