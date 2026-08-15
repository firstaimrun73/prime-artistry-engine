import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, EXAMPLE_PROMPTS, ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  IMAGE_QUALITY_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  imageQualityCost,
  videoResolutionMultiplier,
  type ImageQuality,
  type VideoResolution,
} from "@/lib/quality-options";
import { watermarkImage, applyDownloadWatermarkGrid } from "@/lib/watermark";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { EditorToolCategories } from "@/components/EditorToolCategories";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CompareSlider } from "@/components/CompareSlider";
import { MultiImageInput } from "@/components/MultiImageInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { getPlanLimits } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import {
  VIDEO_DURATIONS,
  VIDEO_ASPECT_RATIOS,
  videoCreditCost,
  isDurationAllowed,
  planRequiredForDuration,
  modelTierForDuration,
  MODEL_TIER_LABEL,
  MODEL_TIER_DESCRIPTION,
  type VideoDuration,
  type VideoAspectRatio,
} from "@/lib/video-options";

import { toast } from "sonner";
import {
  Upload, Sparkles, Download, Lock, Image as ImageIcon, Video,
  Square, RotateCcw, Pencil, Recycle, Check, RefreshCw, Share2, Wand2, Eraser,
  Plus, X, Coins,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor,
});

type GenState = "idle" | "analyzing" | "loading" | "success" | "blocked";

/** One uploaded image slot in the multi-image strip. */
type GalleryItem = {
  id: string;
  preview: string;
  dataUrl: string | null;
  file: File | null;
};

const MAX_GALLERY_IMAGES = 10;
const WATERMARK_PREF_KEY = "motio2edit-watermark-pref";

const LOADING_MESSAGES = [
  "Creating your masterpiece…",
  "Enhancing with AI…",
  "Generating cinematic results…",
  "Applying advanced AI edits…",
  "Perfecting every pixel…",
  "Bringing your idea to life…",
];

type QuickStyle = { emoji: string; label: string; prompt: string };

const VIDEO_QUICK_STYLES: QuickStyle[] = [
  { emoji: "🎬", label: "Slow Motion", prompt: "Animate as smooth cinematic slow motion, ~0.5x speed, buttery frame interpolation, subtle motion blur and stable camera. Keep the subject's identity and scene unchanged." },
  { emoji: "💫", label: "Cinematic FX", prompt: "Add cinematic camera motion with a slow dolly-in, shallow depth of field, atmospheric particles and filmic color grading while preserving the original subject and composition." },
  { emoji: "🎵", label: "Music Video Vibe", prompt: "Turn into a stylish music-video shot with rhythmic camera moves, bold color grading, punchy lighting and dynamic energy; keep the subject centered." },
  { emoji: "🌊", label: "Smooth Motion", prompt: "Generate very smooth, natural motion with a gentle parallax pan and subtle environmental movement (hair, fabric, background). No warping or identity drift." },
  { emoji: "⚡", label: "Action Scene", prompt: "Turn into a high-energy action sequence with a fast tracking camera, dynamic angles, motion blur and dramatic lighting while keeping the subject sharp and recognizable." },
  { emoji: "🎭", label: "Scene Continue", prompt: "Naturally continue the scene as if the camera keeps rolling: consistent lighting, consistent subject identity, coherent environment motion and no cuts." },
];


function Editor() {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
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


  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const runIdRef = useRef(0);

  const isAdmin = isAdminEmail(profile?.email);
  const isFree = profile?.plan === "free" && !isAdmin;

  // Stages depend on whether an image is being edited.
  const stages = inputDataUrl
    ? ["Understanding your prompt", "Analyzing image details", "Planning AI edits", "Applying advanced enhancements", "Creating final masterpiece"]
    : ["Understanding your prompt", "Building enhanced prompt", "Composing the scene", "Applying advanced enhancements", "Creating final masterpiece"];

  // Watermark preference (paid users only) — persisted across sessions.
  useEffect(() => {
    try {
      const pref = localStorage.getItem(WATERMARK_PREF_KEY);
      if (pref === "on") setKeepWatermark(true);
      if (pref === "off") setKeepWatermark(false);
    } catch {
      /* ignore */
    }
  }, []);

  // One-time low-credit warning toast per session.
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

  // Preload media handed over from the History page ("Edit Again").
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

  // Preload a starting prompt/mode from a Studio preset click.
  // FIX 2: Direct visits to /editor with no preset/reuse redirect to /studio/image.
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

  // "Try Circle Remove" from the homepage: open the tool as soon as an image exists.
  useEffect(() => {
    if (pendingSmartRemove && mediaType === "image" && inputDataUrl) {
      setPendingSmartRemove(false);
      setSmartRemoveOpen(true);
    }
  }, [pendingSmartRemove, mediaType, inputDataUrl]);


  // Auto-resize the prompt box.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
  }, [prompt]);

  // Rotating messages, stage progression + progress bar while loading.
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
  // Video → Video enhancement is an upscale pass, not a generation: flat cost.
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

  const MAX_IMAGE_MB = 25;
  const MAX_VIDEO_MB = 200;

  const readAsDataUrl = (file: File) =>
    new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

  /** Load a gallery slot into the active editing state. */
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

    // Video keeps the existing single-file flow untouched.
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

    // Images: append to the multi-image strip (max 10 per session).
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
    if (accepted.length === 0) return;    const items: GalleryItem[] = await Promise.all(
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

  // Upload a (video) file to private storage and return a signed URL fal can fetch.
  // Retries twice on transient failures; videos get a 2h signed URL so long
  // renders never expire mid-job.
  const uploadToStorage = async (file: File): Promise<string> => {
    const isVideo = file.type.startsWith("video");
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      throw new Error(`Video too large. Maximum ${MAX_VIDEO_MB}MB allowed.`);
    }
    const uid = profile?.id ?? "anon";
    const ext = file.name.split(".").pop() || "bin";

    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const path = `${uid}/${isVideo ? "video-" : ""}${Date.now()}-${attempt}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) {
        lastErr = upErr.message;
        if (attempt < 2) {
          if (isVideo) toast(`Upload retrying… (${attempt + 2}/3)`);
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break;
      }
      const { data, error } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, isVideo ? 7200 : 3600);
      if (error || !data?.signedUrl || !data.signedUrl.startsWith("https://")) {
        lastErr = error?.message ?? "signed url failed";
        if (attempt < 2) continue;
        break;
      }
      return data.signedUrl;
    }
    console.error("[editor] upload failed:", lastErr);    throw new Error(
      isVideo
        ? "Video upload failed. Try a smaller file or check your connection."
        : "Upload failed. Try a smaller file or check your connection.",
    );
  };


  const runGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    if (videoLocked) { setState("blocked"); return toast.error("Video generation requires a paid plan."); }
    if (noCredits) { setState("blocked"); return toast.error(`Not enough credits. This costs ${cost} credits.`); }

    const runId = ++runIdRef.current;
    // 1) "Analyzing your request…" beat so the AI feels intelligent.
    setState("analyzing");
    setOutput(null);
    setDownloaded(false);
    await new Promise((r) => setTimeout(r, 1500));
    if (runId !== runIdRef.current) return;

    setState("loading");
    toast(mediaType === "video" ? "🎬 Generating your video..." : "🎨 Generating your image...");
    startGeneration(mediaType === "video" ? "video" : "image", "/editor");
    // Long-run progress messages so the user knows we're still working while
    // the server retries a slow or failed AI attempt.
    const progressTimers = [
      setTimeout(() => {
        if (runId === runIdRef.current) toast("⏳ Still working — high quality takes a moment...");
      }, 30_000),
      setTimeout(() => {
        if (runId === runIdRef.current) toast("🔁 Taking longer than usual — retrying automatically...");
      }, 75_000),
    ];
    try {

      // Resolve the source media URL to send to the AI.
      // Uploaded files (image OR video) go to private storage and we pass a
      // signed URL fal can fetch. This avoids sending huge base64 bodies that
      // fail for large phone photos. A reused result (already an https URL)
      // is passed through directly.
      let mediaUrl: string | undefined;
      let maskImageUrl: string | undefined;
      let sourceKind: "image" | "video" | undefined;
      if (inputKind === "image" && inputFile) {
        // Fresh upload → upload to Supabase
        mediaUrl = await uploadToStorage(inputFile);
        sourceKind = "image";
      } else if (inputKind === "image" && inputDataUrl) {
        if (inputDataUrl.startsWith("data:") || inputDataUrl.startsWith("blob:")) {
          // Convert base64/blob → File → upload to Supabase
          const res = await fetch(inputDataUrl);
          const blob = await res.blob();
          const file = new File([blob], `img-${Date.now()}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          mediaUrl = await uploadToStorage(file);
        } else if (inputDataUrl.startsWith("https://")) {
          // Already a real URL (reused from history)
          mediaUrl = inputDataUrl;
        } else {
          throw new Error("Invalid image. Please re-upload your photo.");
        }
        sourceKind = "image";
      } else if (inputKind === "video" && inputFile) {
        mediaUrl = await uploadToStorage(inputFile);
        sourceKind = "video";
      }

      // SAFETY CHECK: Verify URL is valid https before sending to FAL.ai
      if (mediaUrl && !mediaUrl.startsWith("https://")) {
        throw new Error("Image upload failed. Please re-upload and try again.");
      }
      // SAFETY CHECK: If image mode needs a URL
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

      // Reference images (2-5) come from the picker as data URIs. FAL cannot
      // fetch data:/blob: URLs, so every one of them is uploaded to storage
      // first and sent as a real https URL alongside the primary image.
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
      // Watermarking for images. Free users get the STRONG variant (full-image
      // grid + corner pill) burned in BEFORE the URL ever reaches the DOM —
      // right-click / long-press / view-source cannot recover a clean image
      // because no clean version is ever stored on the client. Paid users on
      // "keep watermark" get only the subtle corner pill. Admins are exempt.
      if (!isVideoOut && url && !isAdmin && (isFree || keepWatermark)) {
        console.log("[Editor] Applying watermark...", "plan:", profile?.plan, "| free:", isFree, "| keep:", keepWatermark);
        try {
          const marked = await watermarkImage(url, { strong: isFree });
          if (marked && marked !== url) {
            url = marked;
            console.log("[Editor] Watermark done:", marked.substring(0, 50));
          } else {
            console.warn("[Editor] Watermark returned source URL unchanged");
          }
        } catch (e) {
          console.error("[Editor] Watermark error:", e);
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

  };  const handleStop = () => {
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
    // FREE users are already stamped at generation time (strong watermark on
    // the displayed data URL). Re-applying on download caused a double stamp.
    // Only re-stamp free if the output is still a remote https URL (stamp
    // failed earlier). Paid users only get a watermark when they opted in.
    // Admin downloads are always clean.
    if (!outputIsVideo && !isAdmin) {
      console.log("[watermark] download — plan:", profile?.plan, "| free:", isFree, "| keep:", keepWatermark);
      if (isFree) {
        const alreadyClientStamped = output.startsWith("data:");
        if (!alreadyClientStamped) {
          try { downloadUrl = await applyDownloadWatermarkGrid(output); } catch (e) { console.error("[watermark] download grid failed:", e); }
        }
      } else if (keepWatermark) {
        try { downloadUrl = await watermarkImage(output); } catch (e) { console.error("[watermark] download pill failed:", e); }
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

      {/* FIX 2: Image/Video toggle removed. Mode is fixed by the studio entry point. */}


      {videoLocked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm animate-fade-in">
          <span className="text-destructive-foreground">Video generation is a paid feature.</span>
          <Button asChild size="sm"><Link to="/pricing">Upgrade</Link></Button>
        </div>
      )}

      {/* Desktop: controls left / preview right. Mobile: natural vertical stack. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* LEFT — configuration flow: Upload → Tools → Prompt → Options → Generate */}
        <div className="order-1 space-y-5">
          <input
            ref={fileRef}
            type="file"
            accept={mediaType === "image" ? "image/*" : "image/*,video/*"}
            multiple={mediaType === "image"}
            onChange={onFile}
            className="hidden"
          />

          {/* 1. UPLOAD */}
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              1. Upload
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={videoLocked || loading}
              className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 sm:min-h-[140px]"
            >
              <Upload className="h-6 w-6" />
              {inputPreview
                ? `Replace ${inputKind ?? "media"}`
                : mediaType === "video"
                  ? "Upload image or video (optional)"
                  : "Upload image (optional)"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Max file size: {MAX_IMAGE_MB} MB for images{mediaType === "video" ? `, ${MAX_VIDEO_MB} MB for videos` : ""}.
            </p>
            {mediaType === "video" && (
              <p className="text-[11px] text-muted-foreground">
                {inputKind === "video"
                  ? "Video → Video: your clip will be enhanced/transformed."
                  : inputKind === "image"
                    ? "Image → Video: motion will be generated from your image."
                    : "No upload = Text → Video. Upload an image for Image → Video, or a video for Video → Video."}
              </p>
            )}

            {/* Multi-image strip — switch between uploads, each edits separately. */}
            {gallery.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Image {activeImage + 1} of {gallery.length}</span>
                  <span>{gallery.length}/{MAX_GALLERY_IMAGES}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gallery.map((item, i) => (
                    <div key={item.id} className="relative h-16 w-16">
                      <button
                        type="button"
                        onClick={() => switchImage(i)}
                        className={`h-full w-full overflow-hidden rounded-lg border-2 transition-colors ${
                          i === activeImage ? "border-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <img src={item.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover protected-image" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove image ${i + 1}`}
                        onClick={() => removeImage(i)}
                        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < MAX_GALLERY_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={loading}
                      className="grid h-16 w-16 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                      aria-label="Add more images"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2. TOOLS — primary tool entry (Circle to Remove lives only in EditorToolCategories) */}
          {!loading && mediaType === "image" && (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                2. Choose a tool
              </p>
              <EditorToolCategories
                hasImage={!!inputDataUrl}
                disabled={loading}
                onSelectTool={(tool) => {
                  if (tool.prompt === "__CIRCLE_REMOVE__") {
                    if (!inputDataUrl) {
                      toast.error("Upload an image first to use Circle to Remove.");
                      return;
                    }
                    setSmartRemoveOpen(true);
                    return;
                  }
                  setPrompt(tool.prompt);
                }}
              />
            </section>
          )}
          {!loading && mediaType === "video" && (
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                2. Quick styles
              </p>
              <div className="flex flex-wrap gap-2">
                {VIDEO_QUICK_STYLES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setPrompt(q.prompt)}
                    className="btn-animate min-h-[40px] rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    <span className="mr-1">{q.emoji}</span>{q.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. PROMPT */}
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              3. Describe
            </p>
            <div className="relative">
              <Textarea
                ref={taRef}
                placeholder={
                  inputDataUrl
                    ? "Describe the edit… e.g. remove background, make cinematic, enhance quality (any language)"
                    : `Describe the ${mediaType} you want… (any language supported)`
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                rows={4}
                disabled={loading}
                className="min-h-[100px] resize-none pr-12 text-base sm:text-sm"
              />
              <div className="absolute right-2 top-2">
                <VoiceInputButton
                  disabled={loading}
                  onTranscript={(t) => setPrompt((p) => (p ? `${p} ${t}` : t).slice(0, 2000))}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-primary">
                  <Wand2 className="h-3 w-3" /> Auto-enhanced before generating
                </span>
                <span>{prompt.length}/2000</span>
              </div>
            </div>

            {/* Smart, keyword-triggered suggestions */}
            {!loading && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setPrompt(s.prompt)}
                    className="min-h-[36px] rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:scale-105"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Example prompts when the box is empty */}
            {!loading && !prompt.trim() && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Try an example</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setPrompt(s.prompt)}
                      className="min-h-[36px] rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary hover:text-foreground hover:scale-105"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>