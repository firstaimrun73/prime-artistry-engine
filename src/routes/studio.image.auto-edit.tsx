/**
 * Maluto AI — Auto Edit product page
 * Upload one photo → one click → fal.ai vision + edit (branded Maluto AI on frontend).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  ImageIcon,
  Loader2,
  Radio,
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
import {
  AUTO_EDIT_PRODUCT_NAME,
  autoEditCreditCost,
  labelImprovement,
  labelIssue,
} from "@/lib/auto-edit/constants";
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
      { title: "Maluto AI Auto Edit — Motio2edit" },
      {
        name: "description",
        content:
          "Upload one photo. Maluto AI analyses and improves it in one click — no prompt needed.",
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
  { id: "analysing", label: "Maluto AI is looking at your photo" },
  { id: "preparing", label: "Choosing the best improvements" },
  { id: "generating", label: "Applying the edit" },
  { id: "finalising", label: "Polishing the result" },
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
  queued: "Ready when you are",
  analysing: "Listening to your image…",
  preparing: "Planning the best fix…",
  generating: "Creating your improved photo…",
  finalising: "Almost done…",
  complete: "Complete",
  error: "Something went wrong",
};

function formatEta(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 5) return "a few seconds";
  if (s < 60) return `~${s}s`;
  return `~${Math.ceil(s / 60)} min`;
}

const MAX_MB = 40;

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
  const [livePulse, setLivePulse] = useState(0);
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
    if (phase === "processing") return;
    const id = window.setInterval(() => setLivePulse((n) => n + 1), 2200);
    return () => window.clearInterval(id);
  }, [phase]);

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
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadToStorage = async (f: File): Promise<string> => {
    const uid = profile?.id ?? user!.id;
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${uid}/auto-edit-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, f, {
      contentType: f.type || "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(error.message || "Upload failed. Check the uploads storage bucket.");
    const { data, error: sErr } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, 3600);
    if (sErr || !data?.signedUrl?.startsWith("https://")) {
      throw new Error("Could not create a signed URL for your image.");
    }
    return data.signedUrl;
  };

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image (JPG, PNG, or WEBP).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image is too large. Maximum is ${MAX_MB} MB.`);
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
    toast.success("Photo ready for Maluto AI");
  }, []);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    if (list.length > 1) {
      toast.error("Upload exactly one image.");
      return;
    }
    acceptFile(list[0]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const runAuto = async () => {
    if (!file) {
      toast.error("Upload a photo first.");
      fileRef.current?.click();
      return;
    }
    if (noCredits) {
      toast.error(`Need ${cost} credits for Maluto AI.`);
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
        throw new Error(result.message || "Maluto AI could not finish this edit.");
      }

      setStage("finalising");
      setProgress(STAGE_PROGRESS.finalising ?? 92);

      setStage("complete");
      setProgress(100);
      setOutput(result.outputUrl);
      setSummary(result.analysisSummary);
      setJobStatus(result.status ?? (result.changed ? "COMPLETE" : "NO_CHANGE"));
      setPhase("done");
      await refreshProfile?.();
      toast.success(
        result.changed
          ? "Maluto AI finished your photo"
          : "Maluto AI reviewed the photo — little change needed",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto Edit failed";
      setPhase("error");
      setStage("error");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const downloadResult = async () => {
    if (!output) return;
    setDlBusy(true);
    try {
      const res = await secureDl({ data: { imageUrl: output, keepWatermark: false } });
      await triggerBrowserDownload(res.downloadUrl, `maluto-ai-${Date.now()}.jpg`);
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDlBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/40">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Sign in for <span className="text-violet-600 dark:text-violet-300">Maluto AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One photo. One click. Maluto AI improves it for you.
          </p>
          <Button asChild className="mt-6 bg-violet-600 hover:bg-violet-700">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const liveHints = [
    "Maluto AI is ready",
    "Listening for your photo…",
    "Drop an image anytime",
    "One click · full auto polish",
  ];
  const liveHint = liveHints[livePulse % liveHints.length];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 via-background to-cyan-50/40 dark:from-violet-950/50 dark:via-background dark:to-slate-950">
      <Header />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/studio/image"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Image Studio
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/50 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-violet-500/25">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              {AUTO_EDIT_PRODUCT_NAME}
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload one photo. Maluto AI studies it and improves lighting, clarity, and cleanup —{" "}
            <strong className="text-foreground">no prompt</strong>. Everything in{" "}
            <strong className="text-foreground">one click</strong>.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span key={liveHint}>{busy ? STAGE_PROCEDURE[stage] : liveHint}</span>
          </p>
        </header>

        <section className="mb-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
            className="sr-only"
            onChange={onFileInput}
            disabled={busy}
          />

          {!preview ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex w-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-all",
                "bg-card/70 shadow-sm backdrop-blur-sm",
                dragOver
                  ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
                  : "border-violet-300/60 hover:border-violet-500 hover:bg-violet-500/5 dark:border-violet-500/40",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-md">
                <Upload className="h-7 w-7" />
              </span>
              <span className="text-base font-bold text-foreground">Drop your photo here</span>
              <span className="text-sm text-muted-foreground">
                or tap to choose · JPG / PNG / WEBP · max {MAX_MB} MB
              </span>
              <span className="mt-1 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow">
                Select image
              </span>
            </button>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-violet-200/60 bg-card shadow-md dark:border-violet-500/30">
              <div className="relative bg-muted/40 p-2">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="mx-auto max-h-[42vh] w-full rounded-2xl object-contain"
                />
                {!busy && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 truncate font-medium text-foreground">
                  <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                  {fileName ?? "Photo"}
                </span>
                <span>
                  {pixelSize ? `${pixelSize.w}×${pixelSize.h}` : "—"}
                  {file ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                </span>
              </div>
              {!busy && (
                <div className="border-t border-border/40 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300"
                  >
                    Replace photo
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Output quality
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {IMAGE_QUALITY_OPTIONS.map((q) => {
              const c = autoEditCreditCost(q.id);
              const active = quality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setQuality(q.id)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? "border-transparent bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-md"
                      : "border-border bg-card hover:border-violet-400/50",
                  )}
                >
                  <p className="text-sm font-bold">{q.label}</p>
                  <p className={cn("text-[11px]", active ? "text-white/80" : "text-muted-foreground")}>
                    {c} credits
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Your balance:{" "}
            <strong className="text-foreground">{isAdmin ? "∞" : credits.toLocaleString()}</strong>
            {!isAdmin && ` · this run uses ${cost} credits`}
          </p>
        </section>

        <section className="mb-8 space-y-3">
          <Button
            type="button"
            size="lg"
            disabled={busy || (!file && !output) || noCredits}
            onClick={() => void runAuto()}
            className={cn(
              "h-14 w-full rounded-2xl text-base font-bold shadow-lg",
              "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-white hover:opacity-95",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Maluto AI is working…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate with Maluto AI · one click
              </>
            )}
          </Button>
          {!file && (
            <p className="text-center text-xs text-muted-foreground">
              Add a photo above, then tap generate. Maluto AI handles the rest.
            </p>
          )}
          {noCredits && (
            <p className="text-center text-xs text-destructive">
              Not enough credits.{" "}
              <Link to="/pricing" className="underline">
                Upgrade or buy credits
              </Link>
            </p>
          )}
          {phase === "error" && errorMsg && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">Maluto AI could not finish</p>
              <p className="mt-1 text-muted-foreground">{errorMsg}</p>
              <Button size="sm" className="mt-3" onClick={() => void runAuto()} disabled={!file || noCredits}>
                Try again
              </Button>
            </div>
          )}
        </section>

        {phase === "done" && output && preview && (
          <section className="mb-8 space-y-4">
            <h2 className="text-center text-sm font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
              Before & after
            </h2>
            <div className="overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-md">
              <CompareSlider before={preview} after={output} />
            </div>
            {summary && (
              <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm">
                <p className="font-semibold text-foreground">What Maluto AI saw</p>
                {summary.detectedIssues?.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Issues: {summary.detectedIssues.map(labelIssue).join(", ")}
                  </p>
                )}
                {summary.recommended?.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applied: {summary.recommended.map(labelImprovement).join(", ")}
                  </p>
                )}
                {jobStatus === "NO_CHANGE" && (
                  <p className="mt-2 text-xs text-amber-600">Photo already looked strong — little change applied.</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11 bg-violet-600 hover:bg-violet-700"
                disabled={dlBusy}
                onClick={() => void downloadResult()}
              >
                {dlBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                Download
              </Button>
              <Button variant="outline" className="h-11" onClick={clearImage}>
                Edit another
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">FAQ</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-foreground">What is Maluto AI?</dt>
              <dd className="mt-0.5 text-muted-foreground">
                The Auto Edit engine on Motio2edit. You upload a photo; Maluto AI analyses and improves it in one click.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Do I write a prompt?</dt>
              <dd className="mt-0.5 text-muted-foreground">No. Maluto AI decides the edits for you.</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Why can’t I upload?</dt>
              <dd className="mt-0.5 text-muted-foreground">
                Use JPG, PNG, or WEBP under {MAX_MB} MB. You must be signed in. Storage needs the private{" "}
                <code className="text-[11px]">uploads</code> bucket in Supabase.
              </dd>
            </div>
          </dl>
        </section>
      </main>

      {phase === "processing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-violet-400/30 bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <h2 className="text-center text-lg font-extrabold">Maluto AI</h2>
            <p className="mt-1 text-center text-sm font-medium text-violet-600 dark:text-violet-300">
              {STAGE_PROCEDURE[stage] ?? "Working…"}
            </p>
            <p className="mt-6 text-center text-4xl font-black tabular-nums text-foreground">
              {Math.round(progress)}%
            </p>
            <Progress value={progress} className="mt-3 h-2.5" />
            {etaMs != null && (
              <p className="mt-2 text-center text-xs text-muted-foreground">{formatEta(etaMs)} left</p>
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
                      active && "font-semibold text-violet-600 dark:text-violet-300",
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
