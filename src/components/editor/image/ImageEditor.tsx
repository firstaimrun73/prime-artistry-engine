/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → PROMPT → SELECT → GENERATE → OUTPUT
 */
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, type AspectRatio } from "@/lib/prompt-suggestions";
import { type ImageQuality } from "@/lib/quality-options";
import { quoteStandardCredits } from "@/lib/studio/image/standard";
import { estimateImageStudioCredits } from "@/lib/studio/image/image-experience-credits";
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
  const [studioTier, setStudioTier] = useState<StudioTier>("standard");
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

  /** Authoritative pre-generation estimate — must match backend Standard / experience charge. */
  const cost = useMemo(() => {
    const hasSource = !!inputDataUrl;
    const refCount = refImages.length;
    const hasMask = !!removeMaskDataUrl;

    if (studioTier === "standard") {
      if (hasMask) {
        return quoteStandardCredits({ mode: "circle_to_remove" }).credits;
      }
      if (hasSource && refCount > 0) {
        return quoteStandardCredits({
          mode: "multi_image_to_image",
          referenceCount: refCount,
        }).credits;
      }
      if (hasSource) {
        return quoteStandardCredits({ mode: "image_to_image" }).credits;
      }
      const q = imageQuality === "hd" ? "hd" : "sd";
      return quoteStandardCredits({
        mode: "text_to_image",
        imageQuality: q,
      }).credits;
    }

    // Premium (pro) / Ultra AI (premium) — existing experience pricing
    return estimateImageStudioCredits({
      studioTier,
      hasSourceImage: hasSource,
      referenceCount: refCount,
      imageQuality,
      plan: profile?.plan,
      isAdmin,
    });
  }, [
    studioTier,
    inputDataUrl,
    refImages.length,
    removeMaskDataUrl,
    imageQuality,
    profile?.plan,
    isAdmin,
  ]);

  if (!profile) return null;

  const noCredits = !isAdmin && profile.credits < cost;
  const planLimits = getPlanLimits(profile.plan);
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
    (!(showPremiumOverlay || showUltraOverlay) && (loading || !!output));

  // NOTE: remainder of component body continues in part 2 - DO NOT USE THIS TRUNCATED VERSION
  return null;
}
