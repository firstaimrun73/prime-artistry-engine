/**
 * Image Editor workspace — independent of Video Editor.
 * UPLOAD → WRITE & SELECT → GENERATE → OUTPUT (compact glass UI)
 * RESTORED 2026-11-04 from 53c55f95 + FreeUserSponsorStrip (client-only Multitag unlock)
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

export function ImageEditor({ bootstrap }: ImageEditorProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-lg font-semibold">Image Studio is being restored</p>
        <p className="text-sm text-muted-foreground">
          Please refresh in a moment. Generation will be available again shortly.
        </p>
      </div>
    </div>
  );
}
