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
import { autoEditCreditCost } from "@/lib/auto-edit/constants";
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

  const isAdmin = isAdminEmail(profile?.email);
  const cost = autoEditCreditCost(quality);
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
          <h1 className="mt-5 text-xl font-bold">Sign in for MOTIO2EDIT Auto Edit</h1>
          <Button asChild className="mt-6">
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
              "rounded-2xl border border-border bg-card p-4 sm:p-5",
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Input
            </p>

            {!preview ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/50 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Output image">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Output
            </p>

            {!output ? (
              <div className="mt-3 flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">Result appears here</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {preview ? (
                  <CompareSlider before={preview} after={output} />
                ) : (
                  <img src={output} alt="Auto Edit result" className="mx-auto max-h-72 w-full object-contain" />
                )}
                {summary && (
                  <p className="text-xs text-muted-foreground">
                    Quality score {Math.round(summary.qualityScore * 100)}%
                    {summary.improvementsApplied > 0
                      ? ` · ${summary.improvementsApplied} improvements`
                      : ""}
                  </p>
                )}
                <Button className="w-full" onClick={download} disabled={dlBusy}>
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
                    "min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold",
                    quality === q.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Auto Edit costs <span className="font-semibold text-foreground">{cost} credits</span> ·
              Balance {isAdmin ? "∞" : credits}
            </p>
          </div>

          <Button
            className="min-h-[52px] w-full text-base font-bold"
            disabled={busy || !file || noCredits}
            onClick={runAuto}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Auto Edit
              </>
            )}
          </Button>

          {phase === "error" && errorMsg && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">Could not finish Auto Edit</p>
              <p className="mt-1 text-muted-foreground">{errorMsg}</p>
              <Button size="sm" className="mt-3" onClick={runAuto} disabled={!file || noCredits}>
                Retry
              </Button>
            </div>
          )}
        </section>
      </main>

      {phase === "processing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-center text-lg font-extrabold">MOTIO2EDIT Auto Edit</h2>
            <p className="mt-1 text-center text-sm font-medium text-primary">
              {STAGE_PROCEDURE[stage] ?? "Working…"}
            </p>
            <p className="mt-6 text-center text-4xl font-black tabular-nums">
              {Math.round(progress)}%
            </p>
            <Progress value={progress} className="mt-3 h-2.5" />
            {etaMs != null && (
              <p className="mt-2 text-center text-xs text-muted-foreground">{formatEta(etaMs)}</p>
            )}
            <ol className="mt-6 space-y-1.5">
              {TIMELINE_STEPS.map((step, i) => {
                const done = timelineIndex > i;
                const active = timelineIndex === i;
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2.5 text-xs",
                      active && "font-semibold text-primary",
                      !done && !active && "text-muted-foreground/45",
                    )}
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full border text-[10px]">
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
