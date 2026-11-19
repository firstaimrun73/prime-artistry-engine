/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)
 * RESTORED 2026-11-04 from 53c55f95 + FreeUserSponsorStrip (client-only Multitag unlock)
 */
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
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
import { getPlanLimits, maxPromptCharsForPlan, isPromptEffectivelyUnlimited, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { FreeUserSponsorStrip } from "@/components/sponsor/FreeUserSponsorStrip";
import { isSponsorUnlockActive } from "@/lib/sponsor-unlock";
import { toast } from "sonner";
import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon } from "lucide-react";
import { StudioBackLink } from "@/components/StudioBackLink";
import { resolveAvatarSrc } from "@/lib/avatar-presets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { visibleImageExperiences, canAccessImageExperience } from "@/lib/studio/image/image-experience-access";
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
  /** Auto = default compact; Composer = expanded controls. */
  const [workspaceMode, setWorkspaceMode] = useState<"auto" | "composer">("auto");
  const [aspectMenuOpen, setAspectMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
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
  /** Watermark entitlement follows plan only — admin does not unlock OFF for Free. */
  const isFreePlanForWm = (profile?.plan ?? "free") === "free";
  const stages = getEditorStages(!!(inputDataUrl || inputFile || inputPreview));
  const isStandardExp = studioTier === "standard";
  const isPremiumExp = studioTier === "pro";
  const isUltraExp = studioTier === "premium";

  const experienceMax = maxImagesForStudioTier(studioTier);
  // Experience ceiling is hard (Standard multi = 5 total). Admin may bypass plan locks
  // but must never exceed the experience/provider contract — that caused page crashes.
  const planMaxImages = getPlanLimits(profile?.plan ?? "free").maxImages;
  const effectiveMaxImages = Math.min(planMaxImages, experienceMax);

  // Keep gallery within the active experience + plan ceiling (prevents Standard 5-cap overflow crash).
  useEffect(() => {
    if (gallery.length <= effectiveMaxImages) return;
    setGallery((prev) => {
      if (prev.length <= effectiveMaxImages) return prev;
      const kept = prev.slice(0, effectiveMaxImages);
      for (const g of prev.slice(effectiveMaxImages)) {
        if (g.preview?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(g.preview);
          } catch {
            /* ignore */
          }
        }
      }
      return kept;
    });
    setActiveImage((idx) => Math.min(idx, Math.max(0, effectiveMaxImages - 1)));
  }, [effectiveMaxImages]); // eslint-disable-line react-hooks/exhaustive-deps


  // Keep refImages synchronized with gallery selection (primary = active; extras = references).
  useEffect(() => {
    if (gallery.length <= 1) {
      if (refImages.length > 0) setRefImages([]);
      return;
    }
    const extras = gallery
      .filter((_, i) => i !== activeImage)
      .map((g) => g.dataUrl || g.preview)
      .filter(Boolean) as string[];
    const same =
      extras.length === refImages.length && extras.every((u, i) => u === refImages[i]);
    if (!same) setRefImages(extras);
  }, [gallery, activeImage, refImages]);

  useEffect(() => {
    // Free users: watermark forced ON unless sponsor unlock is active this session.
    // Server watermark policy is unchanged — this only drives client UI preference.
    if ((profile?.plan ?? "free") === "free" && !isAdminEmail(profile?.email)) {
      setKeepWatermark(!isSponsorUnlockActive());
    } else {
      setKeepWatermark(readKeepWatermarkPref());
    }
  }, [profile?.plan, profile?.email]);

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
    const hasSource = !!(inputDataUrl || inputFile || inputPreview);
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
  const canAddRefImages = !!(inputDataUrl || inputFile || gallery.length > 0) && effectiveMaxImages > 1;
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
    setInputDataUrl(item.dataUrl || item.preview);
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
    const doomed = gallery[idx];
    if (doomed?.preview?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(doomed.preview);
      } catch {
        /* ignore */
      }
    }
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
    // Memory-safe multi-select: never base64 the whole selection.
    // Preview via blob URL; File is the source of truth for upload.
    try {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      e.target.value = "";

      const maxAllowed = Math.max(1, effectiveMaxImages);
      const room = Math.min(MAX_GALLERY_IMAGES, maxAllowed) - gallery.length;
      if (room <= 0) {
        return toast.error(
          maxAllowed <= 5
            ? ("Standard supports up to " + maxAllowed + " images (base + references).")
            : ("This experience allows up to " + maxAllowed + " images at a time."),
        );
      }
      if (files.length > room) {
        toast.message(
          "Only " + room + " more image" + (room === 1 ? "" : "s") + " can be added (max " + maxAllowed + ").",
        );
      }
      

      // Cap BEFORE any preview allocation (critical for 9/11-at-once mobile).
      const accepted: File[] = [];
      for (const f of files.slice(0, room)) {
        if (!f.type.startsWith("image")) {
          toast.error("This workspace accepts images only. Use Video Editor for video.");
          continue;
        }
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          toast.error(
            f.name + " is too large (" + (f.size / 1024 / 1024).toFixed(1) + " MB). Maximum is " + MAX_IMAGE_MB + " MB.",
          );
          continue;
        }
        accepted.push(f);
      }
      if (accepted.length === 0) return;

      const items: GalleryItem[] = accepted.map((f) => ({
        id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
        preview: URL.createObjectURL(f),
        dataUrl: null,
        file: f,
      }));

      const next = [...gallery, ...items];
      setGallery(next);
      activateSlot(next, gallery.length);
      toast.success(items.length > 1 ? String(items.length) + " images added" : "Upload complete");
    } catch (err) {
      console.error(err);
      toast.error("Could not add images. Try fewer or smaller files.");
    }
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
        const sources = extras.map((g) => g.dataUrl || g.preview).slice(0, Math.max(0, effectiveMaxImages - 1));
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
          keepWatermark: isFreePlanForWm ? true : keepWatermark,
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
    if (!isAdmin && !canAccessImageExperience(profile?.plan, studioTier, isAdmin)) {
      toast.error("Upgrade to use this experience.");
      window.location.href = "/pricing";
      return;
    }
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
          keepWatermark: isFreePlanForWm ? true : keepWatermark,
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

  const showResultView =
    !!output && state === "success" && !loading && !standardCompleteHold && !premiumCompleteHold && !ultraCompleteHold;
  const displayPreview = inputPreview || (gallery[activeImage]?.preview ?? null);
  return (
    <div className={cn("flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background", studioShellClass(studioTier))}>
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

      {showResultView && !hideFormDuringGen && (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-3">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <StudioBackLink className="shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Motio2edit</span>
              <h1 className="truncate text-base font-extrabold tracking-tight">
                <span className="text-foreground">Image</span>{" "}
                <span className="text-[#FF5A1F]">Studio</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition hover:border-[#FF5A1F]/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pb-4">
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
                keepWatermark={isFreePlanForWm ? true : keepWatermark}
                studioTier={studioTier}
              />
              <EditorResult
                output={output}
                loading={false}
                onDownload={handleDownload}
                onRegenerate={runGenerate}
                onEditAgain={handleUseResultAsInput}
                onShare={handleShare}
                onClear={handleClear}
                isFree={isFree}
                downloaded={downloaded}
                hasSourceImage={!!inputDataUrl || refImages.length > 0}
              />
            </div>
          </div>
        </div>
      )}

      {!hideFormDuringGen && !showResultView && (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden px-3 pt-2 sm:px-4 sm:pt-3 lg:px-6">
          {/* ——— HEADER ——— */}
          <header className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <StudioBackLink className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Motio2edit
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-base font-extrabold tracking-tight sm:text-lg">
                    <span className="text-foreground">Image</span>{" "}
                    <span className="text-[#FF5A1F]">Studio</span>
                  </h1>
                  <span className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setTierMenuOpen((o) => !o)}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-lg border border-border/50 bg-card/60 px-1.5 py-0.5 text-xs font-semibold backdrop-blur-md transition hover:border-[#FF5A1F]/40 sm:text-sm",
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
                        <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setTierMenuOpen(false)} />
                        <ul
                          role="listbox"
                          className="absolute left-0 top-full z-50 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-border/60 bg-card/95 py-1 shadow-xl backdrop-blur-xl"
                        >
                          {visibleImageExperiences(profile?.plan ?? "free", isAdmin).map((tier) => (
                            <li key={tier}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={studioTier === tier}
                                className={cn(
                                  "flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#FF5A1F]/10",
                                  studioTier === tier && "bg-[#FF5A1F]/10 text-[#FF5A1F]",
                                )}
                                onClick={() => {
                                  if (!canAccessImageExperience(profile?.plan, tier, isAdmin)) {
                                    setTierMenuOpen(false);
                                    window.location.href = "/pricing";
                                    return;
                                  }
                                  setStudioTier(tier);
                                  const preferred = studioTierToImageQuality(tier);
                                  if (!qualityTouchedRef.current) setImageQuality(preferred);
                                  setTierMenuOpen(false);
                                }}
                              >
                                {studioExperienceLabel(tier)}
                                {!canAccessImageExperience(profile?.plan, tier, isAdmin) && (
                                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-[#FF5A1F]">Upgrade</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            {!isAdmin && (
              <span className="shrink-0 rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm">
                {profile.credits} credits
              </span>
            )}
          </header>

          {/* ——— BODY: mobile stack | desktop 2-col ——— */}
          <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.75fr)] lg:gap-4">
            {/* DISPLAY */}
            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl">
              <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3">
                {displayPreview ? (
                  <button
                    type="button"
                    className="relative max-h-full max-w-full overflow-hidden rounded-xl"
                    onClick={() => setLightboxSrc(displayPreview)}
                  >
                    <img
                      src={displayPreview}
                      alt="Selected"
                      className="max-h-[min(18vh,160px)] w-auto max-w-full object-contain sm:max-h-[min(20vh,180px)] lg:max-h-[min(28vh,260px)]"
                      draggable={false}
                    />
                  </button>
                ) : prompt.trim() ? (
                  <div className="max-w-md px-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#FF5A1F]/80">
                      Prompt preview
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm text-foreground/90 sm:line-clamp-4">
                      {prompt.trim()}
                    </p>
                  </div>
                ) : (
                  <div className="flex max-w-sm flex-col items-center px-3 py-2 text-center">
                    <ImageIcon className="mb-1.5 h-7 w-7 text-[#FF5A1F]/30" strokeWidth={1.5} />
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                      Describe or upload to begin
                    </p>
                  </div>
                )}
              </div>

              {/* Compact upload + gallery (always available; not a tall dropzone) */}
              <div className="shrink-0 border-t border-border/30 px-2 py-1.5">
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
                  lockAdd={gallery.length >= effectiveMaxImages}
                  onLockedAdd={() =>
                    toast.error(
                      isFree && effectiveMaxImages <= 1
                        ? MULTI_IMAGE_UPGRADE_MESSAGE
                        : `Up to ${effectiveMaxImages} images on this experience.`,
                      isFree && effectiveMaxImages <= 1
                        ? { action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } } }
                        : undefined,
                    )
                  }
                  compact
                />
              </div>
            </section>

            {/* DESKTOP SIDE: tips / secondary glass panel */}
            <aside className="hidden min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border/40 bg-card/30 p-3 backdrop-blur-xl lg:flex">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Workspace
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                  <span className="font-semibold text-foreground">Auto</span> — describe what you want; settings adapt automatically.
                </li>
                <li className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                  <span className="font-semibold text-foreground">Composer</span> — expand Aspect Ratio and Quality when you need control.
                </li>
                <li className="rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                  Upload references from the Display strip. Charge updates with experience and quality.
                </li>
              </ul>
              <div className="mt-auto rounded-xl border border-[#FF5A1F]/20 bg-[#FF5A1F]/5 px-3 py-2 text-xs text-muted-foreground">
                Prompt + optional image → Generate. Results open in a dedicated view.
              </div>
            </aside>
          </div>

          {/* ——— UPGRADE / CHARGE ——— */}
          <div className="mt-2 flex shrink-0 items-center justify-between gap-2 text-xs sm:text-sm">
            <Link to="/pricing" className="font-semibold text-[#FF5A1F] underline-offset-2 hover:underline">
              Upgrade
            </Link>
            <span className="rounded-full border border-border/50 bg-card/50 px-2.5 py-1 font-medium tabular-nums text-muted-foreground backdrop-blur-sm">
              Charge: <span className="text-foreground">{cost}</span> credits
            </span>
          </div>

          {/* ——— BOTTOM COMPOSER + GENERATE ——— */}
          <div className="mt-2 shrink-0 space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="rounded-2xl border border-border/50 bg-card/70 p-2 shadow-lg backdrop-blur-xl sm:p-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  ref={taRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  rows={2}
                  placeholder="Describe what you want to create..."
                  className="min-h-[44px] max-h-[88px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="button"
                  className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F]"
                  aria-label="Voice input"
                  title="Voice input"
                  onClick={() => {
                    try {
                      const W = window as unknown as {
                        SpeechRecognition?: new () => { start: () => void; onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null };
                        webkitSpeechRecognition?: new () => { start: () => void; onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null };
                      };
                      const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
                      if (!SR) {
                        toast.message("Voice input is not supported in this browser.");
                        return;
                      }
                      const rec = new SR();
                      rec.onresult = (e) => {
                        const said = e.results?.[0]?.[0]?.transcript;
                        if (said) setPrompt((prev) => (prev ? `${prev} ${said}` : said));
                      };
                      rec.start();
                    } catch {
                      toast.message("Could not start voice input.");
                    }
                  }}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode("auto");
                    setAspectMenuOpen(false);
                    setQualityMenuOpen(false);
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs",
                    workspaceMode === "auto"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("composer")}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:text-xs",
                    workspaceMode === "composer"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  Composer
                </button>

                {workspaceMode === "composer" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAspectMenuOpen((v) => !v);
                        setQualityMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:text-xs"
                    >
                      Aspect {aspectRatio}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQualityMenuOpen((v) => !v);
                        setAspectMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:text-xs"
                    >
                      Quality {imageQuality.toUpperCase()}
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </>
                )}
              </div>

              {workspaceMode === "composer" && aspectMenuOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-2">
                  {(["1:1", "4:3", "16:9", "9:16", "3:4"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAspectRatio(a);
                        setAspectMenuOpen(false);
                      }}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-semibold",
                        aspectRatio === a
                          ? "border-[#FF5A1F] bg-[#FF5A1F]/15 text-[#FF5A1F]"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
              {workspaceMode === "composer" && qualityMenuOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-2">
                  {imageQualitiesForStudioTier(studioTier)
                    .filter((id) => id !== "8k_max")
                    .map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          qualityTouchedRef.current = true;
                          setImageQuality(q);
                          setQualityMenuOpen(false);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          imageQuality === q
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {noCredits ? (
              <Link
                to="/pricing"
                className={cn(
                  "flex min-h-[48px] w-full items-center justify-center rounded-2xl text-base font-semibold text-primary-foreground",
                  studioGenerateClass(studioTier),
                )}
              >
                Upgrade
              </Link>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={runGenerate}
                className={cn(
                  "flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60",
                  studioGenerateClass(studioTier),
                )}
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating…" : "Generate"}
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {cost}
                </span>
              </button>
            )}
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
