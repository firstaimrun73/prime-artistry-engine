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
import { getPlanLimits, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";
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

  // PLACEHOLDER_RESTORE_MARKER — remaining content continues in follow-up if truncated
  return null;
}
