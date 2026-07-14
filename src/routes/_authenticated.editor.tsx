import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";
import { watermarkImage, applyDownloadWatermarkGrid } from "@/lib/watermark";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CompareSlider } from "@/components/CompareSlider";
import { MultiImageInput } from "@/components/MultiImageInput";
import { getPlanLimits } from "@/utils/planLimits";

import { toast } from "sonner";
import {
  Upload, Sparkles, Download, Lock, Image as ImageIcon, Video,
  Square, RotateCcw, Pencil, Recycle, Check, RefreshCw, Share2, Wand2, Eraser,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor,
});

type GenState = "idle" | "analyzing" | "loading" | "success" | "blocked";

const LOADING_MESSAGES = [
  "Creating your masterpiece…",
  "Enhancing with AI…",
  "Generating cinematic results…",
  "Applying advanced AI edits…",
  "Perfecting every pixel…",
  "Bringing your idea to life…",
];

function Editor() {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
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
  const cost = CREDIT_COST[mediaType];
  const noCredits = !isAdmin && profile.credits < cost;
  const videoLocked = !isAdmin && mediaType === "video" && !plan.video;
  const planLimits = getPlanLimits(profile.plan);
  const canAddRefImages = mediaType === "image" && !!inputDataUrl && planLimits.maxImages > 1;
  const loading = state === "loading" || state === "analyzing";
  const suggestions = getSmartSuggestions(prompt);

  const MAX_IMAGE_MB = 25;
  const MAX_VIDEO_MB = 200;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video");
    const limitMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > limitMb * 1024 * 1024) {
      e.target.value = "";
      return toast.error(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${limitMb} MB for ${isVideo ? "videos" : "images"}.`,
      );
    }
    setOutput(null);
    setDownloaded(false);
    setState("idle");
    setInputPreview(URL.createObjectURL(file));
    setInputFile(file);
    const kind: "image" | "video" = isVideo ? "video" : "image";
    setInputKind(kind);
    // Read images as a data URI (sent inline). Videos upload at generate time.
    if (kind === "image") {
      const reader = new FileReader();
      reader.onload = () => setInputDataUrl(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(file);
    } else {
      setInputDataUrl(null);
    }
  };

  // Upload a (video) file to private storage and return a signed URL fal can fetch.
  const uploadToStorage = async (file: File): Promise<string> => {
    const uid = profile?.id ?? "anon";
    const ext = file.name.split(".").pop() || "bin";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) throw new Error("Upload failed. Try a smaller file.");
    const { data, error } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) throw new Error("Could not prepare your upload.");
    if (!data.signedUrl.startsWith("https://")) throw new Error("Upload preparation failed.");
    return data.signedUrl;
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
    try {
      // Resolve the source media URL to send to the AI.
      // Uploaded files (image OR video) go to private storage and we pass a
      // signed URL fal can fetch. This avoids sending huge base64 bodies that
      // fail for large phone photos. A reused result (already an https URL)
      // is passed through directly.
      let mediaUrl: string | undefined;
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
      if (runId !== runIdRef.current) return;

      const res = await generate({
        data: {
          prompt,
          type: mediaType,
          imageUrl: mediaUrl,
          sourceKind,
          strength: mediaType === "image" && sourceKind === "image" ? strength : undefined,
          referenceImageUrls:
            canAddRefImages && refImages.length > 0
              ? refImages.slice(0, planLimits.maxImages - 1)
              : undefined,
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
      if (!isVideoOut && url && !isAdmin) {
        if (isFree) {
          try { url = await watermarkImage(url, { strong: true }); } catch { /* keep original */ }
        } else if (keepWatermark) {
          try { url = await watermarkImage(url); } catch { /* keep original */ }
        }
      }
      if (runId !== runIdRef.current) return;
      setProgress(100);
      setStage(stages.length);
      setOutput(url);
      setState("success");
      await refreshProfile();
      toast.success("Done!");
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    }
  };

  const handleStop = () => {
    runIdRef.current++;
    setState("idle");
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
    // FREE users get an extra full-image protective watermark grid on download.
    if (isFree && !outputIsVideo) {
      try { downloadUrl = await applyDownloadWatermarkGrid(output); } catch { /* keep original */ }
    }
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `motio2edit-${Date.now()}.${outputIsVideo ? "mp4" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
  };

  const handleShare = async () => {
    if (!output) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Made with Motio2Edit", url: output });
      } else {
        await navigator.clipboard.writeText(output);
        toast.success("Link copied to clipboard.");
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <h1 className="text-2xl font-bold">Editor</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
            {isAdmin ? "∞ credits" : `${profile.credits} credits`}
          </span>
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Image {CREDIT_COST.image} · Video {CREDIT_COST.video} credits
          </span>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => { setMediaType("image"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            mediaType === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Image
        </button>
        <button
          onClick={() => { setMediaType("video"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            mediaType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Video className="h-4 w-4" /> Video
          {!plan.video && <Lock className="h-3 w-3" />}
        </button>
      </div>

      {videoLocked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm animate-fade-in">
          <span className="text-destructive-foreground">Video generation is a paid feature.</span>
          <Button asChild size="sm"><Link to="/pricing">Upgrade</Link></Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept={mediaType === "image" ? "image/*" : "image/*,video/*"}
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={videoLocked || loading}
            className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <Upload className="h-6 w-6" />
            {inputPreview
              ? `Replace ${inputKind ?? "media"}`
              : mediaType === "video"
                ? "Upload image or video (optional)"
                : "Upload image (optional)"}
          </button>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Max file size: {MAX_IMAGE_MB} MB for images{mediaType === "video" ? `, ${MAX_VIDEO_MB} MB for videos` : ""}.
          </p>
          {mediaType === "video" && (
            <p className="-mt-2 text-[11px] text-muted-foreground">
              {inputKind === "video"
                ? "Video → Video: your clip will be enhanced/transformed."
                : inputKind === "image"
                  ? "Image → Video: motion will be generated from your image."
                  : "No upload = Text → Video. Upload an image for Image → Video, or a video for Video → Video."}
            </p>
          )}

          <div className="relative">
            <Textarea
              ref={taRef}
              placeholder={
                inputDataUrl
                  ? "Describe the edit… e.g. remove background, make cinematic, enhance quality"
                  : `Describe the ${mediaType} you want…`
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
              rows={4}
              disabled={loading}
              className="resize-none pr-2"
            />
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
                  className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:scale-105"
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
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary hover:text-foreground hover:scale-105"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Smart Remove — "Circle to Remove" tool. Only shown when an image
              is uploaded. Costs the standard 25 image credits via the normal
              image-to-image pipeline (no separate backend call). */}
          {mediaType === "image" && inputDataUrl && !loading && (
            <button
              type="button"
              onClick={() => setSmartRemoveOpen(true)}
              className="flex w-full items-center justify-between rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Eraser className="h-4 w-4" />
                Circle to Remove — paint an object to erase it
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold">
                {CREDIT_COST.image} credits
              </span>
            </button>
          )}


          {mediaType === "image" && inputDataUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Edit strength</span>
                <span>{Math.round(strength * 100)}%</span>
              </div>
              <Slider
                value={[strength]}
                min={0.1}
                max={1}
                step={0.05}
                onValueChange={(v) => setStrength(v[0])}
                disabled={loading}
              />
              <p className="text-[11px] text-muted-foreground">
                Higher = more visible changes. Lower preserves the original more.
              </p>
            </div>
          )}

          {/* Plan-based reference images for richer multi-image edits. */}
          {canAddRefImages && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reference images (optional)
              </p>
              <MultiImageInput
                userPlan={profile.plan}
                images={refImages}
                onChange={setRefImages}
                disabled={loading}
              />
            </div>
          )}

          {/* Watermark control — free users are locked on; paid users choose. */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">MOTIO2EDIT watermark</span>
            {isFree ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> On (Free)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setKeepWatermark((v) => !v)}
                disabled={loading}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  keepWatermark ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {keepWatermark ? "Keep watermark" : "Remove watermark"}
              </button>
            )}
          </div>

          {loading ? (
            <Button variant="destructive" className="w-full" onClick={handleStop}>
              <Square className="mr-1.5 h-4 w-4 fill-current" /> Stop Generation
            </Button>
          ) : (
            <Button className="w-full hover-scale" onClick={runGenerate} disabled={videoLocked || noCredits}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Generate
            </Button>
          )}

          {noCredits && (
            <p className="text-center text-xs text-destructive-foreground">
              Out of credits — <Link to="/pricing" className="underline">get more</Link>.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {state === "analyzing" ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center animate-scale-in">
              <Wand2 className="h-8 w-8 animate-pulse text-primary" />
              <p className="mt-3 text-sm font-semibold text-primary">Analyzing your request…</p>
              <p className="mt-1 text-xs text-muted-foreground">Understanding exactly what you mean</p>
            </div>
          ) : state === "loading" ? (
            <div className="rounded-xl border border-border bg-card p-5 animate-scale-in">
              <p className="text-sm font-semibold text-primary">{LOADING_MESSAGES[msgIdx]}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {stages.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 text-sm">
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] transition-all ${
                        i < stage ? "bg-primary text-primary-foreground"
                        : i === stage ? "bg-primary/20 text-primary animate-pulse"
                        : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {i < stage ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : output && !outputIsVideo && mediaType === "image" && inputPreview ? (
            <div className="animate-scale-in">
              <CompareSlider before={inputPreview} after={output} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                  {inputPreview ? (
                    inputKind === "video" ? (
                      <video src={inputPreview} className="h-full w-full object-cover" controls />
                    ) : (
                      <img src={inputPreview} alt="input" className="h-full w-full object-contain" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">No upload</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After</p>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                  {output ? (
                    outputIsVideo ? (
                      <video src={output} className="h-full w-full object-contain animate-scale-in" controls autoPlay loop muted />
                    ) : (
                      <img
                        src={output}
                        alt="output"
                        className="h-full w-full object-contain animate-scale-in select-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                      />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">Output appears here</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {output && !loading && (
            <div className="space-y-2 animate-fade-in">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="default" onClick={handleDownload}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
                <Button variant="outline" onClick={runGenerate}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
                </Button>
                <Button variant="outline" onClick={handleUseResultAsInput}>
                  <Recycle className="mr-1.5 h-4 w-4" /> Edit Again
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="mr-1.5 h-4 w-4" /> Share
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={handleClear}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
              </Button>
              {isFree && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Free images include a small watermark. <Link to="/pricing" className="underline">Upgrade</Link> to remove it.
                </p>
              )}
            </div>
          )}

          {downloaded && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm animate-fade-in">
              <span className="text-muted-foreground">Saved! What next?</span>
              <Button size="sm" variant="secondary" onClick={handleClear}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Smart Remove ("Circle to Remove") — plan-agnostic, gated by credits. */}
      <SmartRemoveModal
        open={smartRemoveOpen}
        imageUrl={inputPreview}
        onCancel={() => setSmartRemoveOpen(false)}
        onApply={(masked) => {
          setInputPreview(masked);
          setInputDataUrl(masked);
          setInputFile(null); // masked composite is not the original File
          setInputKind("image");
          setPrompt(SMART_REMOVE_PROMPT);
          setSmartRemoveOpen(false);
          toast.success("Selection applied — click Generate to remove.");
        }}
      />
    </div>
  );
}
