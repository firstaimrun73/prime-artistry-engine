/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)
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
import { getPlanLimits, maxPromptCharsForPlan, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { toast } from "sonner";
import { RotateCcw, Image as ImageIcon, ChevronDown } from "lucide-react";
import { StudioBackLink } from "@/components/StudioBackLink";
import { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";
import { readKeepWatermarkPref } from "@/lib/watermark-pref";
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
import { StandardImageGenerationOverlay } from "@/components/studio/overlays/StandardImageGenerationOverlay";
import { PremiumImageGenerationOverlay } from "@/components/studio/overlays/PremiumImageGenerationOverlay";
import { UltraAIImageGenerationOverlay } from "@/components/studio/overlays/UltraAIImageGenerationOverlay";
import { visibleImageExperiences } from "@/lib/studio/image/image-experience-access";
import {
  studioCardClass,
  studioShellClass,
  studioTierToImageQuality,
  studioGenerateClass,
  studioExperienceLabel,
  imageQualitiesForStudioTier,
  maxImagesForStudioTier,
  type StudioTier,
} from "@/lib/studio/studio-tier";
import { cn } from "@/lib/utils";

export type ImageEditorProps = {
  bootstrap?: EditorBootstrap;
};

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

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
  /** Recommended strength — backend fal defaults cluster ~0.55–0.85; use mid for general edits. */
  const [strength] = useState(0.75);
  const [keepWatermark, setKeepWatermark] = useState(true); // default ON; hydrated from pref
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [tierMenuOpen, setTierMenuOpen] = useState(false);
  const qualityTouchedRef = useRef(false);

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);
  const [premiumCompleteHold, setPremiumCompleteHold] = useState(false);
  const [premiumGenError, setPremiumGenError] = useState<string | null>(null);
  const [ultraCompleteHold, setUltraCompleteHold] = useState(false);
  const [ultraGenError, setUltraGenError] = useState<string | null>(null);
  const [standardCompleteHold, setStandardCompleteHold] = useState(false);
  const [standardGenError, setStandardGenError] = useState<string | null>(null);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;
  const stages = getEditorStages(!!inputDataUrl);
  const isStandardExp = studioTier === "standard";
  const isPremiumExp = studioTier === "pro";
  const isUltraExp = studioTier === "premium";

  const experienceMax = maxImagesForStudioTier(studioTier);
  const effectiveMaxImages = isAdmin
    ? Math.max(experienceMax, 10)
    : isFree
      ? 1
      : Math.min(getPlanLimits(profile?.plan ?? "free").maxImages, experienceMax);

  // Keep gallery within the active experience + plan ceiling (prevents Standard 5-cap overflow crash).
  useEffect(() => {
    if (gallery.length <= effectiveMaxImages) return;
    setGallery((prev) => prev.slice(0, effectiveMaxImages));
    setActiveImage((idx) => Math.min(idx, Math.max(0, effectiveMaxImages - 1)));
    toast.message(`Showing up to ${effectiveMaxImages} images for this experience.`);
  }, [effectiveMaxImages]); // eslint-disable-line react-hooks/exhaustive-deps


  // Keep refImages synchronized with gallery selection (primary = active; extras = references).
  useEffect(() => {
    if (gallery.length <= 1) {
      if (refImages.length > 0) setRefImages([]);
      return;
    }
    const extras = gallery
      .filter((_, i) => i !== activeImage)
      .map((g) => g.dataUrl)
      .filter(Boolean) as string[];
    const same =
      extras.length === refImages.length && extras.every((u, i) => u === refImages[i]);
    if (!same) setRefImages(extras);
  }, [gallery, activeImage, refImages]);

  useEffect(() => {
    setKeepWatermark(readKeepWatermarkPref());
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
      if (creditsNow <= 0) toast.error("No credits left. Upgrade now.");
      else if (creditsNow < 30) toast.warning(`Low credits: ${creditsNow} remaining`);
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
    if (!isStandardExp) {
      setStandardCompleteHold(false);
      setStandardGenError(null);
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
      if (isStandardExp && !standardGenError) setStandardCompleteHold(false);
    }
  }, [state, isPremiumExp, isUltraExp, isStandardExp, premiumGenError, ultraGenError, standardGenError]);

  const cost = useMemo(() => {
    const hasSource = !!inputDataUrl;
    const refCount = refImages.length;
    const hasMask = !!removeMaskDataUrl;
    const totalImages = (hasSource ? 1 : 0) + refCount;

    if (studioTier === "standard") {
      if (hasMask) return quoteStandardCredits({ mode: "circle_to_remove" }).credits;
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

    if (studioTier === "premium") {
      const quality = normalizeUltraQuality(imageQuality);
      if (totalImages >= 2) {
        return quoteUltraCredits({
          mode: "multi_image",
          quality,
          referenceCount: totalImages,
        }).credits;
      }
      if (hasSource) return quoteUltraCredits({ mode: "image_to_image", quality }).credits;
      return quoteUltraCredits({ mode: "text_to_image", quality }).credits;
    }

    return 25;
  }, [studioTier, inputDataUrl, refImages.length, removeMaskDataUrl, imageQuality]);

  if (!profile) return null;

  const noCredits = !isAdmin && profile.credits < cost;
  const canAddRefImages = !!inputDataUrl && effectiveMaxImages > 1;
  const loading = state === "loading" || state === "analyzing";
  const suggestions = getSmartSuggestions(prompt);
  const uploadToStorage = (file: File) => uploadToStorageUtil(file, profile?.id ?? "anon");

  const showStandardOverlay =
    isStandardExp && (loading || standardCompleteHold || !!standardGenError);
  const showPremiumOverlay =
    isPremiumExp && (loading || premiumCompleteHold || !!premiumGenError);
  const showUltraOverlay =
    isUltraExp && (loading || ultraCompleteHold || !!ultraGenError);

  const hideFormDuringGen = showStandardOverlay || showPremiumOverlay || showUltraOverlay;
  const showInlinePreview = !hideFormDuringGen && !!output && state === "success";

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

    const maxAllowed = effectiveMaxImages;
    const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;
    if (room <= 0) {
      if (isFree) {
        return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
      }
      return toast.error(`This experience allows up to ${maxAllowed} images at a time.`);
    }
    if (isFree && files.length > 1) {
      toast.message("Free plan: only 1 image. Extra files were ignored.");
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

        let items: GalleryItem[] = [];
    try {
    items = await Promise.all(
      accepted.map(async (f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview: URL.createObjectURL(f),
        dataUrl: await readAsDataUrl(f),
        file: f,
      })),
    );
    } catch {
      toast.error("Could not read one or more images. Try fewer or smaller files.");
      return;
    }


    const next = [...gallery, ...items];
    setGallery(next);
    activateSlot(next, gallery.length);
    toast.success(items.length > 1 ? `${items.length} images uploaded` : "Upload complete");
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
    setStandardCompleteHold(false);
    setStandardGenError(null);
    await new Promise((r) => setTimeout(r, 600));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast(opts.toastStart ?? "Generating your image…");
    startGeneration("image", "/editor");
    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast("Still working — high quality takes a moment…");
      }, 30_000),
      setTimeout(() => {
        if (runId === runIdRef.current) toast("Taking longer than usual — retrying automatically…");
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
      const extras = gallery.filter((_, i) => i !== activeImage);
      if (!maskImageUrl && effectiveMaxImages > 1 && extras.length > 0) {
        const sources = extras.map((g) => g.dataUrl).slice(0, Math.max(0, effectiveMaxImages - 1));
        toast(`Uploading ${sources.length} reference image${sources.length > 1 ? "s" : ""}…`);
        const uploaded: string[] = [];
        for (const src of sources) {
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
        referenceImageUrls = valid.length > 0 ? valid : undefined;
      } else if (!maskImageUrl && effectiveMaxImages > 1 && refImages.length > 0) {
        const wanted = refImages.slice(0, Math.max(0, effectiveMaxImages - 1));
        toast(`Uploading ${wanted.length} reference image${wanted.length > 1 ? "s" : ""}…`);
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
        referenceImageUrls = valid.length > 0 ? valid : undefined;
      }

      const result = await generate({
        data: {
          type: "image",
          prompt: opts.jobPrompt,
          imageUrl: mediaUrl,
          strength,
          aspectRatio,
          // IMAX requires Ultra 8k_max on the server validator — never send plain 8k for imax.
          imageQuality: aspectRatio === "imax" ? "8k_max" : imageQuality,
          studioTier,
          maskImageUrl,
          referenceImageUrls,
          contextTags: contextTags.length > 0 ? contextTags : undefined,
          keepWatermark: isFree ? true : keepWatermark,
        },
      });

      if (runId !== runIdRef.current) return;

      // generateMedia returns { outputUrl, credits } — not { url }
      const outUrl =
        (result as { outputUrl?: string; url?: string } | null)?.outputUrl ||
        (result as { url?: string } | null)?.url;
      if (!outUrl) throw new Error("Generation returned no image.");
      await preloadImage(outUrl);
      if (runId !== runIdRef.current) return;

      setOutput(outUrl);
      setState("success");
      setProgress(100);
      endGeneration();
      void refreshProfile();
      toast.success("Image ready");
    } catch (err) {
      if (runId !== runIdRef.current) return;
      endGeneration();
      const msg = err instanceof Error ? err.message : "Generation failed";
      setState("idle");
      if (isStandardExp) setStandardGenError(msg);
      if (isPremiumExp) setPremiumGenError(msg);
      if (isUltraExp) setUltraGenError(msg);
      toast.error(msg);
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
      toastStart: "Removing selected area…",
    });
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

  const handleDismissStandardError = () => {
    setStandardGenError(null);
    setStandardCompleteHold(false);
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
    setStandardCompleteHold(false);
    setStandardGenError(null);
    setGallery([]);
    setActiveImage(0);
    setContextTags([]);
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
          keepWatermark: isFree ? true : keepWatermark,
        },
      });
      if (res?.url) {
        triggerBrowserDownload(res.url, `motio2edit-${Date.now()}.jpg`);
        setDownloaded(true);
        toast.success("Download started");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleShare = async () => {
    if (!output) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MOTIO2EDIT", url: output });
      } else {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleSelectTool = (tool: { prompt: string; id?: string }) => {
    if (tool.prompt === "__CIRCLE_REMOVE__") {
      try {
        if (inputDataUrl) sessionStorage.setItem("circle2edit-preview", inputDataUrl);
        else sessionStorage.removeItem("circle2edit-preview");
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

  const standardPhase =
    standardGenError
      ? "error"
      : state === "analyzing"
        ? "analyzing"
        : state === "loading"
          ? "loading"
          : standardCompleteHold
            ? "success"
            : "loading";

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
    <div className={cn("min-h-[100dvh] overflow-x-hidden pb-24 sm:pb-10", studioShellClass(studioTier))}>
      {showStandardOverlay && (
        <StandardImageGenerationOverlay
          phase={standardPhase}
          error={standardGenError}
          onRetry={runGenerate}
          onDismiss={handleDismissStandardError}
        />
      )}
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

      {!hideFormDuringGen && (
        <div className="mx-auto min-w-0 max-w-5xl overflow-x-hidden px-3 py-3 sm:px-4 sm:py-6">
          <div className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3 animate-fade-in">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <StudioBackLink className="shrink-0" />
              <span className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" aria-hidden />
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="studio-image-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#FF5A1F]/25 bg-[#FF5A1F]/10 text-[#FF5A1F] shadow-[0_0_12px_-4px_rgba(255,90,31,0.45)] backdrop-blur-sm sm:h-9 sm:w-9"
                  aria-hidden
                >
                  <ImageIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} />
                </span>
                <h1 className="min-w-0 text-lg font-extrabold tracking-tight leading-tight sm:text-xl">
                  <span className="text-foreground">Image</span>{" "}
                  <span className="text-[#FF5A1F]">Studio</span>
                  <span className="mx-1.5 text-muted-foreground/40 font-normal">·</span>
                  <span className="relative inline-block align-middle">
                    <button
                      type="button"
                      onClick={() => setTierMenuOpen((o) => !o)}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-lg border border-border/50 bg-card/50 px-1.5 py-0.5 text-sm font-semibold backdrop-blur-md transition hover:border-[#FF5A1F]/40 hover:bg-card/80 sm:text-base",
                        studioTier === "premium" && "border-[#D4AF37]/40 text-[#E8C547]",
                        studioTier === "pro" && "border-orange-500/30 text-orange-600 dark:text-orange-400",
                        studioTier === "standard" && "text-[#FF5A1F]",
                      )}
                      aria-haspopup="listbox"
                      aria-expanded={tierMenuOpen}
                    >
                      {expLabel}
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </button>
                    {tierMenuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-40 cursor-default"
                          aria-label="Close tier menu"
                          onClick={() => setTierMenuOpen(false)}
                        />
                        <ul
                          role="listbox"
                          className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border/60 bg-card/95 py-1 shadow-xl backdrop-blur-xl"
                        >
                          {visibleImageExperiences(profile.plan, isAdmin).map((t) => (
                            <li key={t}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={studioTier === t}
                                className={cn(
                                  "flex w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-muted",
                                  studioTier === t && "bg-[#FF5A1F]/10 text-[#FF5A1F]",
                                )}
                                onClick={() => {
                                  setStudioTier(t);
                                  const allowed = imageQualitiesForStudioTier(t);
                                  const preferred = studioTierToImageQuality(t);
                                  if (!qualityTouchedRef.current) setImageQuality(preferred);
                                  else if (!allowed.includes(imageQuality)) setImageQuality(preferred);
                                  setTierMenuOpen(false);
                                }}
                              >
                                {studioExperienceLabel(t)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-center">
              <Button size="sm" variant="ghost" onClick={handleClear} className="min-h-[36px]">
                <RotateCcw className="mr-1.5 h-4 w-4" /> New
              </Button>
            </div>
          </div>

          <style>{`
            @keyframes studio-spark-burst {
              0%, 100% { transform: scale(1); opacity: 1; }
              35% { transform: scale(1.12); opacity: 1; }
              55% { transform: scale(0.96); opacity: 0.92; }
              75% { transform: scale(1.04); opacity: 1; }
            }
            @keyframes studio-spark-ray {
              0%, 100% { transform: scale(0.4); opacity: 0; }
              30% { transform: scale(1); opacity: 0.7; }
              60% { transform: scale(1.35); opacity: 0; }
              100% { transform: scale(0.4); opacity: 0; }
            }
            .studio-image-icon { position: relative; animation: studio-spark-burst 2.8s ease-in-out infinite; }
            .studio-image-icon::before,
            .studio-image-icon::after {
              content: "";
              position: absolute;
              inset: -3px;
              border-radius: 9999px;
              border: 1.5px solid rgba(255, 90, 31, 0.35);
              animation: studio-spark-ray 2.8s ease-out infinite;
              pointer-events: none;
            }
            .studio-image-icon::after {
              inset: -6px;
              border-color: rgba(255, 90, 31, 0.18);
              animation-delay: 0.15s;
            }
            @media (prefers-reduced-motion: reduce) {
              .studio-image-icon,
              .studio-image-icon::before,
              .studio-image-icon::after { animation: none; }
            }
          `}</style>

          <div className="mt-3">
            <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
          </div>

          <p
            aria-label="Workflow stages"
            className="mt-2 text-[10px] text-muted-foreground sm:text-[11px]"
          >
            <span className={cn((gallery.length > 0 || !!inputDataUrl) && "text-[#FF5A1F] font-medium")}>① Upload</span>
            <span className="mx-1.5 text-border">·</span>
            <span className={cn(prompt.trim().length > 0 && "text-[#FF5A1F] font-medium")}>② Write & Select</span>
            <span className="mx-1.5 text-border">·</span>
            <span className={cn(loading && "text-[#FF5A1F] font-medium")}>③ Generate</span>
            <span className="mx-1.5 text-border">·</span>
            <span className={cn(!!output && state === "success" && "text-[#FF5A1F] font-medium")}>④ Output</span>
          </p>

          <div className="mt-3 grid min-w-0 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-5">
            <div className="order-1 min-w-0 space-y-3 sm:space-y-3.5">
              <section className={cn("min-w-0 space-y-2 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass(studioTier))}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <span className="text-[#FF5A1F]">①</span> Upload
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
                  maxGalleryImages={Math.min(MAX_GALLERY_IMAGES, effectiveMaxImages)}
                  onSwitchImage={(idx) => {
                    switchImage(idx);
                    const item = gallery[idx];
                    if (item?.preview) setLightboxSrc(item.preview);
                  }}
                  onRemoveImage={removeImage}
                  lockAdd={isFree}
                  onLockedAdd={() =>
                    toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
                      action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
                    })
                  }
                />
              </section>

              <section className={cn("min-w-0 space-y-3 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass(studioTier))}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <span className="text-[#FF5A1F]">②</span> Write & Select
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
                  maxChars={isAdmin ? 7000 : maxPromptCharsForPlan(profile?.plan ?? "free")}
                  contextTags={contextTags}
                  onToggleTag={(id) => {
                    setContextTags((prev) =>
                      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length >= 10 ? prev : [...prev, id],
                    );
                  }}
                />
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
                  setStrength={() => {}}
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
              </section>

              <section
                className={cn(
                  "sticky bottom-3 z-30 min-w-0 rounded-2xl border border-[#FF5A1F]/25 bg-card/80 p-3 shadow-[0_8px_32px_-8px_rgba(255,90,31,0.25)] backdrop-blur-xl sm:static sm:bottom-auto sm:shadow-md",
                  studioCardClass(studioTier),
                )}
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <span className="text-[#FF5A1F]">③</span> Generate
                </p>
                <EditorGenerationControls
                  loading={loading}
                  onGenerate={runGenerate}
                  hideStop
                  videoLocked={false}
                  noCredits={noCredits}
                  generateClassName={studioGenerateClass(studioTier)}
                  showAutoToggle={false}
/>
              </section>
            </div>

            <div className="order-2 min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
              <section className={cn("min-w-0 space-y-2 rounded-2xl border border-border/50 bg-card/40 p-3 backdrop-blur-md sm:p-4", studioCardClass(studioTier))}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <span className="text-[#FF5A1F]">④</span> Output
                </p>
                {showInlinePreview && output ? (
                  <>
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
                      keepWatermark={isFree ? true : keepWatermark}
                      studioTier={studioTier}
                    />
                    {!isFree && !isAdmin && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 shadow-sm backdrop-blur-md">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">Watermark</p>
                          <p className="text-[11px] text-muted-foreground">
                            {keepWatermark ? "On — stamped on generated output" : "Off — clean output"}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={keepWatermark}
                          onClick={() =>
                            setKeepWatermark((v) => {
                              const next = !v;
                              try {
                                localStorage.setItem(WATERMARK_PREF_KEY, next ? "on" : "off");
                              } catch {
                                /* ignore */
                              }
                              return next;
                            })
                          }
                          className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
                            keepWatermark ? "bg-[#FF5A1F] shadow-[0_0_12px_-2px_rgba(255,90,31,0.55)]" : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                              keepWatermark && "translate-x-5",
                            )}
                          />
                          <span className="sr-only">{keepWatermark ? "Watermark on" : "Watermark off"}</span>
                        </button>
                      </div>
                    )}
                    <EditorResult
                      output={output}
                      loading={loading || standardCompleteHold || premiumCompleteHold || ultraCompleteHold}
                      onDownload={handleDownload}
                      onRegenerate={runGenerate}
                      onEditAgain={handleUseResultAsInput}
                      onShare={handleShare}
                      onClear={handleClear}
                      isFree={isFree}
                      downloaded={downloaded}
                      hasSourceImage={!!inputDataUrl || refImages.length > 0}
                    />
                  </>
                ) : (
                  <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-8 text-center">
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Result appears after Generate</p>
                  </div>
                )}
              </section>
              <ImageStudioWeeklyCarousel />
              <EditorDisclaimer />
            </div>
          </div>
        </div>
      )}

      {smartRemoveOpen && (
        <SmartRemoveModal
          open={smartRemoveOpen}
          imageUrl={inputDataUrl}
          onCancel={() => setSmartRemoveOpen(false)}
          onApply={(masked) => {
            void runSmartRemove(masked);
          }}
        />
      )}

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
            onClick={() => setLightboxSrc(null)}
          >
            Close
          </button>
          <img
            src={lightboxSrc}
            alt="Full size preview"
            className="max-h-[90dvh] max-w-[min(96vw,1200px)] object-contain"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
