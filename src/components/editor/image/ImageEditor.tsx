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
  const [imageQuality, setImageQuality] = useState<ImageQuality>("hd");
  const [studioTier, setStudioTier] = useState<StudioTier>("standard");
  const qualityTouchedRef = useRef(false);

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loading = state === "loading";
  const adminNow = isAdminEmail(profile?.email);
  const creditsNow = profile?.credits ?? 0;
  const planLimits = getPlanLimits(profile?.plan ?? "free");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATERMARK_PREF_KEY);
      if (raw != null) setKeepWatermark(raw === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WATERMARK_PREF_KEY, keepWatermark ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [keepWatermark]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setStage(0);
      setProgress(0);
      return;
    }
    setStage(0);
    setProgress(8);
    const stages = getEditorStages("image");
    let s = 0;
    const id = window.setInterval(() => {
      s = Math.min(s + 1, stages.length - 1);
      setStage(s);
      setProgress(Math.min(92, 12 + s * 18));
    }, 2800);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (creditsNow < 10 && !adminNow && profile) {
      try {
        const shown = sessionStorage.getItem(LOW_CREDIT_TOAST_KEY);
        if (!shown) {
          sessionStorage.setItem(LOW_CREDIT_TOAST_KEY, "1");
          toast.message("Credits running low", {
            description: "Top up to keep generating without interruption.",
          });
        }
      } catch {
        /* ignore */
      }
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
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [prompt]);

  const suggestions = useMemo(
    () => getSmartSuggestions({ mediaType: "image", hasInput: !!inputDataUrl }),
    [inputDataUrl],
  );

  const quoted = useMemo(() => {
    if (removeMaskDataUrl) {
      return estimateImageStudioCredits({
        experience: "circle-remove",
        studioTier: "standard",
        quality: imageQuality,
      });
    }
    return quoteStandardCredits({
      quality: imageQuality,
      hasInputImage: !!inputDataUrl,
      strength,
    });
  }, [removeMaskDataUrl, imageQuality, inputDataUrl, strength]);

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_MB}MB.`);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setInputFile(file);
      setInputDataUrl(dataUrl);
      setInputPreview(dataUrl);
      setInputKind("image");
      setOutput(null);
      setRemoveMaskDataUrl(null);
      setError(null);
      setGallery((g) => {
        const next = [{ id: crypto.randomUUID(), url: dataUrl, kind: "image" as const }, ...g];
        return next.slice(0, MAX_GALLERY_IMAGES);
      });
      setActiveImage(0);
    } catch {
      toast.error("Could not read that image.");
    }
  };

  const switchImage = (idx: number) => {
    const item = gallery[idx];
    if (!item) return;
    setActiveImage(idx);
    setInputPreview(item.url);
    setInputDataUrl(item.url);
    setInputKind("image");
    setOutput(null);
    setRemoveMaskDataUrl(null);
  };

  const removeImage = (idx: number) => {
    setGallery((g) => {
      const next = g.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setInputPreview(null);
        setInputDataUrl(null);
        setInputFile(null);
        setInputKind(null);
        setActiveImage(0);
      } else if (idx === activeImage) {
        const ni = Math.min(idx, next.length - 1);
        setActiveImage(ni);
        setInputPreview(next[ni].url);
        setInputDataUrl(next[ni].url);
      } else if (idx < activeImage) {
        setActiveImage((a) => a - 1);
      }
      return next;
    });
  };

  const resetAll = () => {
    setPrompt("");
    setInputPreview(null);
    setInputDataUrl(null);
    setInputFile(null);
    setInputKind(null);
    setRefImages([]);
    setOutput(null);
    setState("idle");
    setError(null);
    setRemoveMaskDataUrl(null);
    setGallery([]);
    setActiveImage(0);
    setDownloaded(false);
    setSmartRemoveOpen(false);
  };

  const uploadToStorage = async (dataUrl: string, nameHint: string) => {
    return uploadToStorageUtil(dataUrl, nameHint);
  };

  const runGenerate = async () => {
    if (loading) return;
    if (!adminNow && creditsNow < (quoted?.credits ?? 1)) {
      toast.error("Not enough credits.");
      return;
    }

    setError(null);
    setState("loading");
    setDownloaded(false);
    startGeneration();

    try {
      let imageUrl: string | undefined;
      if (inputDataUrl) {
        imageUrl = await uploadToStorage(inputDataUrl, inputFile?.name ?? "input.png");
      }

      let maskUrl: string | undefined;
      if (removeMaskDataUrl) {
        maskUrl = await uploadToStorage(removeMaskDataUrl, "mask.png");
      }

      const body: Record<string, unknown> = {
        mediaType: "image",
        prompt: removeMaskDataUrl ? SMART_REMOVE_PROMPT : prompt.trim(),
        aspectRatio,
        imageQuality,
        strength,
        keepWatermark,
        studioTier,
      };
      if (imageUrl) body.imageUrl = imageUrl;
      if (maskUrl) {
        body.maskImageUrl = maskUrl;
        body.circleInstant = true;
      }
      if (refImages.length) body.refImages = refImages;

      const result = await generate({ data: body as never });
      const url =
        typeof result === "string"
          ? result
          : result && typeof result === "object" && "url" in result
            ? String((result as { url: string }).url)
            : null;
      if (!url) throw new Error("No image returned.");
      setOutput(url);
      setState("done");
      setProgress(100);
      void refreshProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed.";
      setError(msg);
      setState("error");
      toast.error(msg);
    } finally {
      endGeneration();
    }
  };

  const handleDownload = async () => {
    if (!output) return;
    try {
      const blobOrUrl = await secureDl({ data: { url: output, keepWatermark } });
      if (typeof blobOrUrl === "string") {
        triggerBrowserDownload(blobOrUrl, "motio2edit-image.png");
      } else if (blobOrUrl instanceof Blob) {
        const u = URL.createObjectURL(blobOrUrl);
        triggerBrowserDownload(u, "motio2edit-image.png");
        URL.revokeObjectURL(u);
      }
      setDownloaded(true);
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
      // Product path: open Circle 2edit page (not inline SmartRemoveModal)
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

  return (
    <div className={cn("min-h-screen", studioShellClass(studioTier))}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <StudioBackLink />
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", studioAccentClass(studioTier))}>
              {expLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={resetAll}
              disabled={loading}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <CreditWarningBanner credits={creditsNow} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <div className={cn("space-y-3 p-4 sm:p-5", studioCardClass(studioTier))}>
              <EditorUpload
                mediaType="image"
                loading={loading}
                inputPreview={inputPreview}
                inputKind={inputKind}
                fileRef={fileRef}
                onPickFile={onPickFile}
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
                prompt={prompt}
                setPrompt={setPrompt}
                taRef={taRef}
                suggestions={suggestions}
                onSelectTool={handleSelectTool}
              />
            </div>

            <div className={cn("space-y-4 p-4 sm:p-5", studioCardClass(studioTier))}>
              <StudioTierSelector
                value={studioTier}
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
                  keepWatermark={keepWatermark}
                  setKeepWatermark={setKeepWatermark}
                  videoDuration={noopVideoDuration}
                  setVideoDuration={noopSetVideoDuration}
                  videoAspect={noopVideoAspect}
                  setVideoAspect={noopSetVideoAspect}
                  videoRes={noopVideoRes}
                  setVideoRes={noopSetVideoRes}
                  studioTier={studioTier}
                />
              </div>
            </div>

            <div className={cn("space-y-3 p-4 sm:p-5", studioCardClass(studioTier))}>
              <EditorGenerationControls
                mediaType="image"
                loading={loading}
                canGenerate={!!prompt.trim() || !!removeMaskDataUrl}
                creditLabel={quoted ? `${quoted.credits} credits` : undefined}
                onGenerate={runGenerate}
                generateClassName={studioGenerateClass(studioTier)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className={cn("min-h-[280px] p-4 sm:p-5", studioCardClass(studioTier))}>
              <EditorPreview
                mediaType="image"
                loading={loading}
                inputPreview={inputPreview}
                output={output}
                error={error}
                msg={LOADING_MESSAGES[msgIdx]}
                stage={stage}
                progress={progress}
              />
            </div>
            {output && (
              <div className={cn("p-4 sm:p-5", studioCardClass(studioTier))}>
                <EditorResult
                  mediaType="image"
                  output={output}
                  downloaded={downloaded}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onAgain={() => {
                    setOutput(null);
                    setState("idle");
                    setDownloaded(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <EditorDisclaimer />
      </div>

      <SmartRemoveModal
        open={smartRemoveOpen}
        imageUrl={inputPreview}
        onCancel={() => setSmartRemoveOpen(false)}
        onApply={(masked) => {
          setRemoveMaskDataUrl(masked.maskDataUrl);
          setSmartRemoveOpen(false);
          setPrompt(SMART_REMOVE_PROMPT);
          toast.success("Mask applied — tap Generate to remove.");
        }}
      />

      {loading && studioTier === "premium" && (
        <PremiumImageGenerationOverlay progress={progress} stage={stage} />
      )}
      {loading && studioTier === "ultra" && (
        <UltraAIImageGenerationOverlay progress={progress} stage={stage} />
      )}
    </div>
  );
}
