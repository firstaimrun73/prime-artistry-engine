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
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { runStandaloneAutoEdit } from "@/lib/auto-edit/auto-edit.functions";
import { AUTO_EDIT_CREDIT_COST } from "@/lib/auto-edit/constants";
import type { AutoEditAnalysisSummary } from "@/lib/auto-edit/auto-edit.types";
import {
  IMAGE_QUALITY_OPTIONS,
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
      { title: "MOTIO2EDIT Auto Edit — Motio2edit" },
      {
        name: "description",
        content:
          "Upload one photo. MOTIO2EDIT Auto Edit analyses and improves it automatically — no prompt needed.",
      },
    ],
  }),
  component: AutoEditPage,
});

type StageId =
  | "queued"
  | "analysing"
  | "preparing"
  | "generating"
  | "finalising"
  | "complete"
  | "error";

type UiPhase = "idle" | "processing" | "done" | "error";

const TIMELINE_STEPS: { id: StageId; label: string }[] = [
  { id: "analysing", label: "Analysing image" },
  { id: "preparing", label: "Selecting the best improvements" },
  { id: "generating", label: "Applying AI edit" },
  { id: "finalising", label: "Finalising" },
];

const STAGE_PROGRESS: Partial<Record<StageId, number>> = {
  queued: 0,
  analysing: 12,
  preparing: 28,
  generating: 62,
  finalising: 92,
  complete: 100,
};

const STAGE_PROCEDURE: Partial<Record<StageId, string>> = {
  queued: "Queued",
  analysing: "Analysing image…",
  preparing: "Choosing the best edit…",
  generating: "Creating your improved image…",
  finalising: "Finalising…",
  complete: "Complete",
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
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        if (n === 0 || cancelled) return;
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);
        setPalette({
          dominant: `rgb(${r},${g},${b})`,
          soft: `rgba(${r},${g},${b},0.35)`,
          deep: `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)},0.55)`,
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
  const runAutoFn = useServerFn(runStandaloneAutoEdit);
  const secureDl = useServerFn(secureDownloadImage);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);
  const [quality, setQuality] = useState<ImageQuality>("hd");
  const [output, setOutput] = useState<string | null>(null);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [stage, setStage] = useState<StageId>("queued");
  const [progress, setProgress] = useState(0);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [summary, setSummary] = useState<AutoEditAnalysisSummary | null>(null);
  const [jobStatus, setJobStatus] = useState<"COMPLETE" | "NO_CHANGE" | null>(null);
  const runStartedAt = useRef<number>(0);

  const palette = useImagePalette(preview);
  const isAdmin = isAdminEmail(profile?.email);
  const cost = AUTO_EDIT_CREDIT_COST;
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < cost;
  const busy = phase === "processing";

  const timelineIndex = useMemo(() => {
    const idx = TIMELINE_STEPS.findIndex((s) => s.id === stage);
    if (stage === "complete") return TIMELINE_STEPS.length;
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
      setEtaMs(Math.max(0, 50_000 - elapsed));
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
          <h1 className="mt-5 text-xl font-bold">Sign in for MOTIO2EDIT Auto Edit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One image. AI analyses and improves it — no prompt needed.
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
    setOutput(null);
    setSummary(null);
    setJobStatus(null);
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
    setSummary(null);
    setJobStatus(null);
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
      toast.error("Auto Edit supports exactly one image.");
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
      toast.error(`Need ${cost} credits for Auto Edit.`);
      return;
    }

    setPhase("processing");
    setOutput(null);
    setSummary(null);
    setJobStatus(null);
    setErrorMsg(null);
    setStage("queued");
    setProgress(0);
    runStartedAt.current = Date.now();

    try {
      setStage("analysing");
      setProgress(STAGE_PROGRESS.analysing ?? 12);
      const imageUrl = await uploadToStorage(file);

      setStage("preparing");
      setProgress(STAGE_PROGRESS.preparing ?? 28);

      setStage("generating");
      setProgress(STAGE_PROGRESS.generating ?? 62);

      // Backend: vision analysis → plan → one fal.ai job → watermark → charge once
      const result = await runAutoFn({
        data: {
          imageUrl,
          imageQuality: quality,
          width: pixelSize?.w,
          height: pixelSize?.h,
        },
      });

      if (!result.success || !result.outputUrl) {
        throw new Error(result.message || "Auto Edit failed");
      }

      setStage("finalising");
      setProgress(STAGE_PROGRESS.finalising ?? 92);

      setStage("complete");
      setProgress(100);
      setOutput(result.outputUrl);
      setSummary(result.analysisSummary);
      setJobStatus(result.status ?? (result.changed ? "COMPLETE" : "NO_CHANGE"));
      setPhase("done");
      await refreshProfile();

      if (result.status === "NO_CHANGE" || result.changed === false) {
        toast.message(result.message || "No automatic changes needed.");
      } else {
        toast.success("MOTIO2EDIT Auto Edit complete");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto Edit failed";
      setStage("error");
      setErrorMsg(msg);
      setPhase("error");
      toast.error(msg);
    }
  };

  const download = async () => {
    if (!output) return;
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
            MOTIO2EDIT Auto Edit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One photo · AI analysis · automatic edit · no prompt
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
                toast.error("Auto Edit supports exactly one image.");
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
                <div className="relative overflow-hidden rounded-xl border border-border bg-background/40">
                  <img
                    src={preview}
                    alt={fileName ? `Source: ${fileName}` : "Input photo"}
                    className="mx-auto max-h-64 w-full object-contain sm:max-h-72"
                  />
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
                <p className="text-sm font-medium text-muted-foreground">Result appears here</p>
                <p className="max-w-[220px] text-xs text-muted-foreground/80">
                  AI analyses your photo and applies the right improvements automatically.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {preview ? (
                  <CompareSlider before={preview} after={output} />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <img
                      src={output}
                      alt="Auto Edit result"
                      className="mx-auto max-h-72 w-full object-contain protected-image"
                    />
                  </div>
                )}
                {jobStatus === "NO_CHANGE" && (
                  <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
                    No automatic changes needed — your photo already looks good.
                  </p>
                )}
                {summary && (
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3 text-left text-xs">
                    <p className="text-muted-foreground">
                      Quality score {Math.round(summary.qualityScore * 100)}%
                      {summary.improvementsApplied > 0
                        ? ` · ${summary.improvementsApplied} improvement${summary.improvementsApplied === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    {summary.detectedIssues?.length > 0 && (
                      <div>
                        <p className="font-semibold text-foreground">Detected</p>
                        <ul className="mt-1 list-inside list-disc text-muted-foreground">
                          {summary.detectedIssues.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.recommended?.length > 0 && (
                      <div>
                        <p className="font-semibold text-foreground">Applied</p>
                        <ul className="mt-1 list-inside list-disc text-muted-foreground">
                          {summary.recommended.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <Button className="w-full btn-animate" onClick={download} disabled={dlBusy}>
                  <Download className="mr-1.5 h-4 w-4" />
                  {dlBusy ? "Preparing…" : "Download"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={clearImage}>
                  Edit another photo
                </Button>
              </div>
            )}
          </section>
        </div>

        <section className="mx-auto mt-6 max-w-xl space-y-4">
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
                  {q.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Auto Edit costs <span className="font-semibold text-foreground">{cost} credits</span> per
              complete job (analysis + edit) · Balance {isAdmin ? "∞" : credits}
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
                  MOTIO2EDIT Auto Edit
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

              <ol className="mt-6 space-y-1.5 pr-1">
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
