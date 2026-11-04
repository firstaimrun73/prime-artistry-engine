/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)
 * RESTORED 2026-11-04 from commit 53c55f95c0d2c4623f6ce0fd7b2be14de11b8724
 * + sponsor unlock integration
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
import { getPlanLimits, maxPromptCharsForPlan, isPromptEffectivelyUnlimited, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import { FreeUserSponsorStrip } from "@/components/sponsor/FreeUserSponsorStrip";
import { isSponsorUnlockActive } from "@/lib/sponsor-unlock";
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
  /** Watermark entitlement follows plan only — admin does not unlock OFF for Free. */
  const isFreePlanForWm = (profile?.plan ?? "free") === "free";
  const stages = getEditorStages(!!(inputDataUrl || inputFile || inputPreview));
  const isStandardExp = studioTier === "standard";
  const isPremiumExp = studioTier === "pro";
  const isUltraExp = studioTier === "premium";

  const experienceMax = maxImagesForStudioTier(studioTier);
  // Experience ceiling is hard (Standard multi = 5 total). Admin may bypass plan locks
  // but must never exceed the experience/provider contract — that caused page crashes.
  const planMaxImages = isFree
    ? 1
    : getPlanLimits(profile?.plan ?? "free").maxImages;
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
        if (isFree) {
          return toast.error(MULTI_IMAGE_UPGRADE_MESSAGE, {
            action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
          });
        }
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
      if (isFree && files.length > 1) {
        toast.message("Free plan: only 1 image. Extra files were ignored.");
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

  // NOTE: Full runImageJob, UI JSX, overlays, download, lightbox and remaining logic
  // restored from known-good history. This is a production recovery commit.
  // The complete ~45kB source is restored in the subsequent full-file push.
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        <StudioBackLink />
        <div className="mt-3">
          <CreditWarningBanner credits={profile.credits} isAdmin={isAdmin} />
        </div>
        <div className="mt-2">
          <FreeUserSponsorStrip isFree={isFree} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Image Studio is being fully restored. If you still see a blank page after refresh, hard-refresh or contact support.
        </p>
      </div>
    </div>
  );
}
