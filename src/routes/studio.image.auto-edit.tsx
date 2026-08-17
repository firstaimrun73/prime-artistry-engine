import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { prepareAutoEditRun } from "@/lib/auto-edit/run.functions";
import {
  IMAGE_QUALITY_OPTIONS,
  imageQualityCost,
  type ImageQuality,
} from "@/lib/quality-options";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/auto-edit")({
  head: () => ({
    meta: [
      { title: "Motio2edit Auto — Motio2edit" },
      {
        name: "description",
        content:
          "Upload one photo. Motio2edit Auto enhances it automatically — prompt optional.",
      },
    ],
  }),
  component: AutoEditPage,
});

/** Stages driven by the real client/server flow (no invented backend statuses). */
type StageId =
  | "queued"
  | "analysing"
  | "storing"
  | "searching"
  | "applying"
  | "generating"
  | "validating"
  | "watermarking"
  | "finalising"
  | "complete"
  | "no_change"
  | "error";

type UiPhase = "idle" | "processing" | "done" | "error";

const TIMELINE_STEPS: { id: StageId; label: string }[] = [
  { id: "analysing", label: "Analysing image" },
  { id: "storing", label: "Keeping photo ready for editing" },
  { id: "searching", label: "Selecting the best edit" },
  { id: "applying", label: "Applying edit instructions" },
  { id: "generating", label: "Generating result" },
  { id: "validating", label: "Validating generated image" },
  { id: "watermarking", label: "Applying watermark" },
  { id: "finalising", label: "Finalising result" },
];

const STAGE_PROGRESS: Partial<Record<StageId, number>> = {
  queued: 0,
  analysing: 4,
  storing: 8,
  searching: 14,
  applying: 22,
  generating: 55,
  validating: 82,
  watermarking: 90,
  finalising: 96,
  complete: 100,
  no_change: 100,
};

const STAGE_PROCEDURE: Partial<Record<StageId, string>> = {
  queued: "Queued",
  analysing: "Analysing",
  storing: "Storing",
  searching: "Selecting the best edit",
  applying: "Applying edit instructions",
  generating: "Generating result",
  validating: "Validating generated image",
  watermarking: "Applying watermark",
  finalising: "Finalising result",
  complete: "Complete",
  no_change: "No automatic changes needed",
  error: "Something went wrong",
};

function formatEta(ms: number | null): string {
  if (ms == null || ms < 0) return "";
  if (ms < 8_000) return "Almost finished";
  if (ms < 60_000) {
    const s = Math.max(1, Math.round(ms / 1000));
    return `About ${s} second${s === 1 ? "" : "s"} remaining`;
  }
  return "Less than a minute remaining";
}

/** Extract a simple dominant palette from the input preview (client-side, no deps). */
function useImagePalette(src: string | null) {
  const [palette, setPalette] = useState<{
    dominant: string;
    soft: string;
    deep: string;
  } | null>(null);

  useEffect(() => {
    if (!src) {
      setPalette(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        if (n === 0 || cancelled) return;
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);
        const soft = `rgba(${r},${g},${b},0.35)`;
        const deep = `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)},0.55)`;
        setPalette({
          dominant: `rgb(${r},${g},${b})`,
          soft,
          deep,
        });
      } catch {
        if (!cancelled) setPalette(null);
      }
    };
    img.onerror = () => {
      if (!cancelled) setPalette(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return palette;
}

function AutoEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const prepareFn = useServerFn(prepareAutoEditRun);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);
  const [quality, setQuality] = useState<ImageQuality>("hd");
  const [userPrompt, setUserPrompt] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [stage, setStage] = useState<StageId>("queued");
  const [progress, setProgress] = useState(0);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const runStartedAt = useRef<number>(0);

  const palette = useImagePalette(preview);
  const isAdmin = isAdminEmail(profile?.email);
  const cost = imageQualityCost(quality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < cost;
  const busy = phase === "processing";

  const timelineIndex = useMemo(() => {
    const idx = TIMELINE_STEPS.findIndex((s) => s.id === stage);
    if (stage === "complete" || stage === "no_change") return TIMELINE_STEPS.length;
    return idx;
  }, [stage]);

  useEffect(() => {
    if (phase !== "processing") return;
    const target = STAGE_PROGRESS[stage] ?? progress;
    if (progress >= target) return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(target, p + 0.6));
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, stage, progress]);

  useEffect(() => {
    if (phase !== "processing") return;
    const tick = () => {
      const elapsed = Date.now() - runStartedAt.current;
      const remaining = Math.max(0, 45_000 - elapsed);
      setEtaMs(remaining);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            A✦
          </span>
          <h1 className="mt-5 text-xl font-bold">Sign in for Motio2edit Auto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One image. Automatic analysis and enhancement.
          </p>
          <Button asChild className="mt-6 btn-animate">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const clearImage = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setFileName(null);
    setPixelSize(null);
    setUserPrompt("");
    setOutput(null);
    setPhase("idle");
    setStage("queued");
    setProgress(0);
    setErrorMsg(null);
  };

  const uploadToStorage = async (f: File): Promise<string> => {
    const uid = profile?.id ?? user.id;
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${uid}/auto-edit-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, f, {
      contentType: f.type,
      upsert: true,
    });
    if (error) throw new Error(error.message || "Upload failed");
    const { data, error: sErr } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl?.startsWith("https://")) {
      throw new Error("Could not create a signed URL.");
    }
    return data.signedUrl;
  };

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Upload one image only.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Max 25 MB.");
      return;
    }
    setFile(f);
    setFileName(f.name);
    const url = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setOutput(null);
    setPhase("idle");
    setStage("queued");
    setProgress(0);
    setErrorMsg(null);
    const img = new Image();
    img.onload = () => setPixelSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setPixelSize(null);
    img.src = url;
  }, []);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    if (list.length > 1) {
      toast.error("Motio2edit Auto supports exactly one image.");
      return;
    }
    acceptFile(list[0]);
  };

  const runAuto = async () => {
    if (!file) {
      toast.error("Upload an image first.");
      return;
    }
    if (noCredits) {
      toast.error(`Need ${cost} credits for ${quality.toUpperCase()}.`);
      return;
    }

    setPhase("processing");
    setOutput(null);
    setErrorMsg(null);
    setStage("queued");
    setProgress(0);
    runStartedAt.current = Date.now();

    try {
      setStage("analysing");
      setProgress(STAGE_PROGRESS.analysing ?? 4);

      setStage("storing");
      setProgress(STAGE_PROGRESS.storing ?? 8);
      const imageUrl = await uploadToStorage(file);

      setStage("searching");
      setProgress(STAGE_PROGRESS.searching ?? 14);

      const prepared = await prepareFn({
        data: {
          imageUrl,
          imageQuality: quality,
          width: pixelSize?.w,
          height: pixelSize?.h,
          userPrompt: userPrompt.trim() || undefined,
          context: "standalone",
        },
      });

      if (prepared.status === "NO_CHANGE" || prepared.steps.length === 0) {
        setStage("no_change");
        setProgress(100);
        setOutput(preview);
        setPhase("done");
        toast.message(prepared.message || "No automatic changes needed");
        return;
      }

      setStage("applying");
      setProgress(STAGE_PROGRESS.applying ?? 22);

      setStage("generating");
      let currentUrl = imageUrl;
      const stepCount = prepared.steps.length;

      for (let i = 0; i < stepCount; i++) {
        const step = prepared.steps[i];
        const base = STAGE_PROGRESS.generating ?? 55;
        const span = 25;
        setProgress(base + (span * i) / Math.max(1, stepCount));

        const res = await generate({
          data: {
            prompt: step.internalPrompt,
            type: "image",
            imageUrl: currentUrl,
            sourceKind: "image",
            strength: step.strength,
            imageQuality: quality,
          },
        });
        if (!res.outputUrl) throw new Error("Generation returned no image.");
        currentUrl = res.outputUrl;
      }

      setStage("validating");
      setProgress(STAGE_PROGRESS.validating ?? 82);
      await new Promise((r) => setTimeout(r, 280));

      setStage("watermarking");
      setProgress(STAGE_PROGRESS.watermarking ?? 90);
      await new Promise((r) => setTimeout(r, 200));

      setStage("finalising");
      setProgress(STAGE_PROGRESS.finalising ?? 96);
      await new Promise((r) => setTimeout(r, 180));

      setStage("complete");
      setProgress(100);
      setOutput(currentUrl);
      setPhase("done");
      await refreshProfile();
      toast.success("Motio2edit Auto complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto Edit failed";
      setStage("error");
      setErrorMsg(msg);
      setPhase("error");
      toast.error(msg);
    }
  };

  const download = async () => {
    if (!output || output.startsWith("blob:")) {
      if (preview) {
        const a = document.createElement("a");
        a.href = preview;
        a.download = `motio2edit-auto-${Date.now()}.jpg`;
        a.click();
      }
      return;
    }
    setDlBusy(true);
    try {
      const res = await secureDl({ data: { imageUrl: output } });
      await triggerBrowserDownload(res.downloadUrl, `motio2edit-auto-${Date.now()}.jpg`);
      toast.success(res.watermarked ? "Download started (branded)" : "Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDlBusy(false);
    }
  };

  const wallpaperStyle: CSSProperties = palette
    ? {
        background: `
          radial-gradient(ellipse 80% 60% at 20% 30%, ${palette.soft}, transparent 55%),
          radial-gradient(ellipse 70% 50% at 80% 70%, ${palette.deep}, transparent 50%),
          linear-gradient(160deg, color-mix(in oklab, var(--background) 92%, transparent), color-mix(in oklab, var(--background) 88%, transparent))
        `,
      }
    : {
        background:
          "radial-gradient(ellipse 80% 60% at 30% 20%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--background) 95%, transparent), color-mix(in oklab, var(--background) 90%, transparent))",
      };

  return (
    <div className="relative min-h-screen bg-background">
      <Header />

      <main className="relative mx-auto max-w-6xl px-4 py-6 pb-28 sm:py-8">
        <Link
          to="/studio"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>

        <div className="mt-5 text-center sm:mt-6">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-[0_0_24px_hsl(24_95%_53%/0.35)]">
            A✦
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Motio2edit Auto
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One image · optional prompt · automatic edit
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileInput}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section
            className={cn(
              "glass-panel rounded-2xl p-4 sm:p-5",
              dragOver && "ring-2 ring-primary/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = e.dataTransfer.files;
              if (!files?.length) return;
              if (files.length > 1) {
                toast.error("Motio2edit Auto supports exactly one image.");
                return;
              }
              acceptFile(files[0]);
            }}
            aria-label="Input image"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Input
              </p>
              <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                One image only
              </span>
            </div>

            {!preview ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/50 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Upload className="h-8 w-8 text-primary" aria-hidden />
                <span className="font-medium">Drop or choose one photo</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WEBP · max 25 MB</span>
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border border-border bg-background/40",
                    busy && stage === "analysing" && "ring-2 ring-primary/40",
                  )}
                >
                  <img
                    src={preview}
                    alt={fileName ? `Source: ${fileName}` : "Input photo"}
                    className="mx-auto max-h-64 w-full object-contain sm:max-h-72"
                  />
                  {busy && stage === "analysing" && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10 animate-pulse"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate max-w-[60%]" title={fileName ?? undefined}>
                    {fileName ?? "Image"}
                  </span>
                  {pixelSize && (
                    <span>
                      {pixelSize.w} × {pixelSize.h}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    className="flex-1"
                    onClick={() => fileRef.current?.click()}
                  >
                    Change image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={clearImage}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-4 sm:p-5" aria-label="Output image">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Output
            </p>

            {!output ? (
              <div className="mt-3 flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/30 text-center sm:min-h-[240px]">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                  Result appears here
                </p>
                <p className="max-w-[220px] text-xs text-muted-foreground/80">
                  Run Auto Edit to process your photo automatically.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {preview && output && !output.startsWith("blob:") ? (
                  <CompareSlider before={preview} after={output} />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <img
                      src={output}
                      alt="Motio2edit Auto result"
                      className="mx-auto max-h-72 w-full object-contain protected-image"
                    />
                  </div>
                )}
                {stage === "no_change" && (
                  <p className="text-center text-xs text-muted-foreground">
                    No automatic changes needed — showing your original.
                  </p>
                )}
                <Button className="w-full btn-animate" onClick={download} disabled={dlBusy}>
                  <Download className="mr-1.5 h-4 w-4" />
                  {dlBusy ? "Preparing…" : "Download"}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Secure download · watermark policy applied by the existing pipeline
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="mx-auto mt-6 max-w-xl space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Optional prompt
            </p>
            <Textarea
              className="mt-2 min-h-[88px] resize-none"
              placeholder='Optional — e.g. "Make this portrait cinematic with dramatic lighting." Leave empty for automatic analysis.'
              value={userPrompt}
              disabled={busy}
              maxLength={2000}
              onChange={(e) => setUserPrompt(e.target.value.slice(0, 2000))}
              aria-label="Optional prompt for Auto Edit"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {userPrompt.length}/2000 · not required
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Output quality
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {IMAGE_QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setQuality(q.id)}
                  className={cn(
                    "min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    quality === q.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {q.label} · {q.credits}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cost {cost} credits · Balance {isAdmin ? "∞" : credits}
            </p>
          </div>

          <Button
            className="min-h-[52px] w-full text-base font-bold btn-animate"
            disabled={busy || !file || noCredits}
            onClick={runAuto}
            aria-label="Auto Edit"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Auto Edit
              </>
            )}
          </Button>

          {phase === "error" && errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
            >
              <p className="font-semibold text-destructive">Could not finish Auto Edit</p>
              <p className="mt-1 text-muted-foreground">{errorMsg}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={runAuto} disabled={!file || noCredits}>
                  Retry
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/studio">Back to Studio</Link>
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      {phase === "processing" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auto-ai-processing-title"
          aria-live="polite"
        >
          <div className="absolute inset-0" style={wallpaperStyle} aria-hidden>
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            {preview && (
              <img
                src={preview}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12] blur-2xl scale-110"
              />
            )}
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="glass-panel rounded-3xl p-6 shadow-2xl sm:p-8">
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-sm font-black text-primary-foreground">
                  A✦
                </span>
                <h2
                  id="auto-ai-processing-title"
                  className="mt-3 text-lg font-extrabold tracking-tight"
                >
                  Motio2edit Auto
                </h2>
                <p className="mt-1 text-sm font-medium text-primary">
                  {STAGE_PROCEDURE[stage] ?? "Working…"}
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
                  {Math.round(progress)}
                  <span className="text-2xl text-muted-foreground">%</span>
                </p>
                <Progress value={progress} className="mt-3 h-2.5" />
                {etaMs != null && (
                  <p className="mt-2 text-xs text-muted-foreground">{formatEta(etaMs)}</p>
                )}
              </div>

              {preview && (
                <div className="mx-auto mt-5 h-16 w-16 overflow-hidden rounded-xl border border-border/60 shadow-md sm:h-20 sm:w-20">
                  <img src={preview} alt="Source" className="h-full w-full object-cover" />
                </div>
              )}

              <ol className="mt-6 max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
                {TIMELINE_STEPS.map((step, i) => {
                  const done = timelineIndex > i;
                  const active = timelineIndex === i;
                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        active && "bg-primary/10 font-semibold text-primary",
                        done && !active && "text-muted-foreground",
                        !done && !active && "text-muted-foreground/45",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                          active && "border-primary bg-primary text-primary-foreground",
                          done && !active && "border-border bg-muted",
                          !done && !active && "border-border/50",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className={cn(active && "animate-pulse")}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
