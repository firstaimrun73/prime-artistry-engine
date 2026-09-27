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
      if (!maskImageUrl && effectiveMaxImages > 1 && refImages.length > 0) {
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
        referenceImageUrls = uploaded;
      }

      const result = await generate({
        data: {
          prompt: opts.jobPrompt,
          mediaUrl,
          mediaType: inputKind === "image" ? "image" : undefined,
          strength,
          aspectRatio,
          imageQuality,
          studioTier,
          referenceImageUrls,
          maskImageUrl,
          contextTags: contextTags.length > 0 ? contextTags : undefined,
          keepWatermark,
        },
      });

      if (runId !== runIdRef.current) return;

      const url = result?.url ?? result?.imageUrl ?? null;
      if (!url) throw new Error("No image returned. Please try again.");

      await preloadImage(url);
      if (runId !== runIdRef.current) return;

      setOutput(url);
      setState("success");
      setProgress(100);
      toast.success("Image ready");
      void refreshProfile();
    } catch (err: unknown) {
      if (runId !== runIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Generation failed";
      setState("error");
      if (isPremiumExp) setPremiumGenError(msg);
      if (isUltraExp) setUltraGenError(msg);
      if (isStandardExp) setStandardGenError(msg);
      toast.error(msg);
    } finally {
      progressTimers.forEach(clearTimeout);
      endGeneration();
    }
  };

  const onGenerate = () => {
    if (!prompt.trim() && !inputDataUrl) {
      return toast.error("Add a prompt or upload an image.");
    }
    void runImageJob({ jobPrompt: prompt.trim() || "Enhance this image" });
  };

  const onSmartRemove = (masked: string) => {
    setRemoveMaskDataUrl(masked);
    setSmartRemoveOpen(false);
    void runImageJob({
      jobPrompt: SMART_REMOVE_PROMPT,
      maskDataUrl: masked,
      toastStart: "Removing selected area…",
    });
  };

  const onDownload = async () => {
    if (!output) return;
    try {
      const res = await secureDl({ data: { url: output, keepWatermark } });
      if (res?.downloadUrl) {
        triggerBrowserDownload(res.downloadUrl, `prime-artistry-${Date.now()}.png`);
        setDownloaded(true);
        try {
          localStorage.setItem(WATERMARK_PREF_KEY, keepWatermark ? "on" : "off");
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      toast.error("Download failed. Please try again.");
    }
  };

  const onReset = () => {
    if (loading) return;
    setPrompt("");
    setInputPreview(null);
    setInputDataUrl(null);
    setInputFile(null);
    setInputKind(null);
    setRefImages([]);
    setOutput(null);
    setState("idle");
    setGallery([]);
    setActiveImage(0);
    setRemoveMaskDataUrl(null);
    setDownloaded(false);
    setContextTags([]);
  };

  const onTierChange = (tier: StudioTier) => {
    setStudioTier(tier);
    if (!qualityTouchedRef.current) {
      const qs = imageQualitiesForStudioTier(tier);
      if (qs.length > 0) setImageQuality(qs[0] as ImageQuality);
    }
  };

  return (
    <div className={cn(studioShellClass, "space-y-4")}>
      <StudioBackLink />
      <CreditWarningBanner />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Image Studio</h1>
          <p className="text-sm text-muted-foreground">Upload · Select · Prompt · Generate</p>
        </div>
        <div className="flex items-center gap-2">
          <StudioTierSelector value={studioTier} onChange={onTierChange} />
        </div>
      </div>

      {!hideFormDuringGen && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <EditorUpload
              fileRef={fileRef}
              onFile={onFile}
              gallery={gallery}
              activeImage={activeImage}
              onSwitch={switchImage}
              onRemove={removeImage}
              effectiveMaxImages={effectiveMaxImages}
              isFree={isFree}
              loading={loading}
              inputPreview={inputPreview}
              canAddRefImages={canAddRefImages}
              refImages={refImages}
              setRefImages={setRefImages}
            />
            <EditorPromptPanel
              prompt={prompt}
              setPrompt={setPrompt}
              taRef={taRef}
              suggestions={suggestions}
              contextTags={contextTags}
              setContextTags={setContextTags}
              loading={loading}
            />
            <EditorOptionsPanel
              studioTier={studioTier}
              imageQuality={imageQuality}
              setImageQuality={(q) => {
                qualityTouchedRef.current = true;
                setImageQuality(q);
              }}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              strength={strength}
              setStrength={setStrength}
              keepWatermark={keepWatermark}
              setKeepWatermark={setKeepWatermark}
              loading={loading}
              hasSource={!!inputDataUrl}
            />
            <EditorGenerationControls
              onGenerate={onGenerate}
              cost={cost}
              noCredits={noCredits}
              loading={loading}
              onReset={onReset}
              credits={profile.credits}
            />
          </div>
          <div className="space-y-4">
            <EditorPreview
              inputPreview={inputPreview}
              output={output}
              state={state}
              progress={progress}
              msgIdx={msgIdx}
              stage={stage}
              stages={stages}
              showInlinePreview={showInlinePreview}
              onSmartRemoveOpen={() => setSmartRemoveOpen(true)}
              hasSource={!!inputDataUrl}
            />
            {showInlinePreview && (
              <EditorResult
                output={output!}
                onDownload={onDownload}
                downloaded={downloaded}
                keepWatermark={keepWatermark}
              />
            )}
          </div>
        </div>
      )}

      {showStandardOverlay && (
        <StandardImageGenerationOverlay
          progress={progress}
          message={LOADING_MESSAGES[msgIdx]}
          stage={stage}
          stages={stages}
          completeHold={standardCompleteHold}
          error={standardGenError}
          onDismissError={() => {
            setStandardGenError(null);
            setState("idle");
          }}
        />
      )}
      {showPremiumOverlay && (
        <PremiumImageGenerationOverlay
          progress={progress}
          message={LOADING_MESSAGES[msgIdx]}
          stage={stage}
          stages={stages}
          completeHold={premiumCompleteHold}
          error={premiumGenError}
          onDismissError={() => {
            setPremiumGenError(null);
            setState("idle");
          }}
        />
      )}
      {showUltraOverlay && (
        <UltraAIImageGenerationOverlay
          progress={progress}
          message={LOADING_MESSAGES[msgIdx]}
          stage={stage}
          stages={stages}
          completeHold={ultraCompleteHold}
          error={ultraGenError}
          onDismissError={() => {
            setUltraGenError(null);
            setState("idle");
          }}
        />
      )}

      <EditorDisclaimer />

      {smartRemoveOpen && inputPreview && (
        <div className="fixed inset-0 z-50">
          <SmartRemoveModal
            imageUrl={inputPreview}
            onClose={() => setSmartRemoveOpen(false)}
            onConfirm={(masked) => {
              onSmartRemove(masked);
            }}
          />
        </div>
      )}
    </div>
  );
}
