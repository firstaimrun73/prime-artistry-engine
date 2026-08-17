import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  ImageIcon,
  Sparkles,
  Upload,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { analyzeForAutoEdit } from "@/lib/auto-edit/analyze.functions";
import {
  selectedOperationsInOrder,
  type AutoEditPlan,
} from "@/lib/auto-edit/decision";
import { estimateAutoEditCredits } from "@/lib/auto-edit/credits";
import { buildStepForOperation } from "@/lib/auto-edit/execute";
import type { AutoEditOperationId } from "@/lib/auto-edit/operations";
import type { ImageAnalysisResult } from "@/lib/auto-edit/types";
import { type ImageQuality } from "@/lib/quality-options";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/auto-edit")({
  head: () => ({
    meta: [
      { title: "Auto Edit — Motio2edit" },
      {
        name: "description",
        content: "Upload one photo. Motio2AI analyzes and enhances it — no prompt needed.",
      },
    ],
  }),
  component: AutoEditPage,
});

type PipelinePhase =
  | "idle"
  | "analyzing"
  | "planning"
  | "generating"
  | "finalizing"
  | "done"
  | "error";

const PIPELINE_STEPS: { id: PipelinePhase; label: string }[] = [
  { id: "analyzing", label: "Analyzing Image" },
  { id: "planning", label: "Formulating Edit Plan" },
  { id: "generating", label: "Executing Model Frameworks" },
  { id: "finalizing", label: "Finalizing Canvas Render" },
];

function phaseIndex(phase: PipelinePhase): number {
  const i = PIPELINE_STEPS.findIndex((s) => s.id === phase);
  return i < 0 ? -1 : i;
}

function progressForPhase(phase: PipelinePhase, genPct: number): number {
  if (phase === "idle") return 0;
  if (phase === "analyzing") return 18;
  if (phase === "planning") return 36;
  if (phase === "generating") return 40 + Math.round(genPct * 0.5);
  if (phase === "finalizing") return 94;
  if (phase === "done") return 100;
  return 0;
}

function AutoEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const analyzeFn = useServerFn(analyzeForAutoEdit);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [plan, setPlan] = useState<AutoEditPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageQuality] = useState<ImageQuality>("hd");
  const [output, setOutput] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [statusText, setStatusText] = useState("Ready for one photo");
  const [genPct, setGenPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isAdmin = isAdminEmail(profile?.email);
  const selectedCount = selected.size;
  const creditEst = estimateAutoEditCredits(Math.max(selectedCount, 1), imageQuality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < creditEst.total;
  const progressPct = progressForPhase(phase, genPct);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-[0_0_28px_hsl(24_95%_53%/0.45)]">
            A✦
          </span>
          <h1 className="mt-6 text-xl font-bold">Sign in for Auto Edit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One photo · Motio2AI decides · no prompt required
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

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
      throw new Error("Could not create a signed URL for analysis.");
    }
    return data.signedUrl;
  };

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload a single image file.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Image must be under 25 MB.");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setOutput(null);
    setAnalysis(null);
    setPlan(null);
    setSelected(new Set());
    setHistory([]);
    setPhase("idle");
    setStatusText("Photo loaded — ready to run Motio2Auto");
    setGenPct(0);
    const img = new Image();
    img.onload = () => setPixelSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setPixelSize(null);
    img.src = url;
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) acceptFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  /** Full pipeline: analyze → decision plan → sequential generateMedia → finalize */
  const runMotio2Auto = async () => {
    if (!file || !preview) {
      toast.error("Upload one photo first.");
      return;
    }
    if (noCredits) {
      toast.error(`Not enough credits. Estimated ${creditEst.total} credits.`);
      return;
    }

    setBusy(true);
    setOutput(null);
    setHistory([]);
    setGenPct(0);

    try {
      // 1. Analyzing Image
      setPhase("analyzing");
      setStatusText("Analyzing Image…");
      const imageUrl = await uploadToStorage(file);
      const res = await analyzeFn({
        data: {
          imageUrl,
          width: pixelSize?.w,
          height: pixelSize?.h,
        },
      });

      // 2. Formulating Edit Plan (decision engine result already on server)
      setPhase("planning");
      setStatusText("Formulating Edit Plan…");
      setAnalysis(res.analysis);
      setPlan(res.plan);

      if (res.plan.status === "NO_CHANGE" || res.plan.operations.length === 0) {
        setSelected(new Set());
        setPhase("done");
        setStatusText(res.plan.message || "No safe automatic changes recommended.");
        toast.message(res.plan.message);
        return;
      }

      const nextSelected = new Set(
        res.plan.operations.filter((o) => o.defaultSelected).map((o) => o.id),
      );
      setSelected(nextSelected);

      const ordered = selectedOperationsInOrder(res.plan, nextSelected);
      if (ordered.length === 0) {
        setPhase("done");
        setStatusText("Plan ready but no operations were auto-selected.");
        toast.message("No automatic operations selected for this photo.");
        return;
      }

      // 3. Executing Model Frameworks (existing generateMedia / FAL path)
      setPhase("generating");
      setStatusText("Executing Model Frameworks…");
      let currentUrl = imageUrl;
      const hist: { id: string; title: string }[] = [];

      for (let i = 0; i < ordered.length; i++) {
        const opId = ordered[i] as AutoEditOperationId;
        const opMeta = res.plan.operations.find((o) => o.id === opId);
        setStatusText(`Executing: ${opMeta?.title ?? opId}`);
        setGenPct(Math.round(((i + 0.4) / ordered.length) * 100));

        const stepInput = buildStepForOperation(opId, currentUrl, imageQuality, undefined);
        const genRes = await generate({
          data: {
            prompt: stepInput.prompt,
            type: "image",
            imageUrl: stepInput.imageUrl,
            sourceKind: "image",
            strength: stepInput.strength,
            imageQuality: stepInput.imageQuality,
          },
        });
        if (!genRes.outputUrl) throw new Error(`No output from ${opId}`);
        currentUrl = genRes.outputUrl;
        hist.push({ id: opId, title: opMeta?.title ?? opId });
      }

      // 4. Finalizing Canvas Render
      setPhase("finalizing");
      setStatusText("Finalizing Canvas Render…");
      setGenPct(100);
      setHistory(hist);
      setOutput(currentUrl);
      await refreshProfile();

      setPhase("done");
      setStatusText("Transformation complete");
      toast.success("Your enhanced photo is ready.");
    } catch (err) {
      setPhase("error");
      setStatusText(err instanceof Error ? err.message : "Auto Edit failed");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!output) return;
    setDlBusy(true);
    try {
      const res = await secureDl({ data: { imageUrl: output } });
      await triggerBrowserDownload(
        res.downloadUrl,
        `motio2edit-auto-edit-${Date.now()}.jpg`,
      );
      toast.success(res.watermarked ? "Download started (branded)" : "Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDlBusy(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setOutput(null);
    setPlan(null);
    setAnalysis(null);
    setSelected(new Set());
    setHistory([]);
    setPhase("idle");
    setStatusText("Ready for one photo");
    setGenPct(0);
  };

  const findings =
    plan?.operations.filter((o) => selected.has(o.id)).map((o) => o.title) ?? [];
  const issueLabels = (plan?.detectedIssues ?? []).map((i) => i.replace(/_/g, " "));
  const activeIdx = phaseIndex(phase);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/studio"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Studio
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                A✦
              </span>
              Auto Edit Workspace
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One photo · no prompt · Motio2AI analyzes and transforms
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              Balance:{" "}
              <span className="font-semibold text-foreground">{isAdmin ? "∞" : credits}</span>
            </p>
            <p className="mt-0.5">Est. {creditEst.total} credits / run</p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />

        {/* Dual-column workspace */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left — ingestion */}
          <section
            className={cn(
              "flex min-h-[320px] flex-col rounded-2xl border-2 border-dashed bg-card/60 p-5 sm:p-6",
              dragOver ? "border-primary bg-primary/5" : "border-border",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Input · single image
            </p>

            {!preview ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/50 px-4 py-10 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <Upload className="h-8 w-8 text-primary" />
                <span className="text-sm font-semibold">Drop one photo here</span>
                <span className="text-xs text-muted-foreground">or click to browse · JPG / PNG · max 25 MB</span>
              </button>
            ) : (
              <div className="mt-4 flex flex-1 flex-col gap-3">
                <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background">
                  <img
                    src={preview}
                    alt="Input"
                    className="mx-auto max-h-[360px] w-full object-contain"
                  />
                  {pixelSize && (
                    <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                      {pixelSize.w}×{pixelSize.h}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Replace photo
                </button>
              </div>
            )}

            {plan && plan.status === "READY" && findings.length > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Detected plan
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {findings.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
                    >
                      <Check className="h-3 w-3" /> {f}
                    </span>
                  ))}
                </div>
                {issueLabels.length > 0 && (
                  <p className="mt-2 text-[11px] capitalize text-muted-foreground">
                    Issues: {issueLabels.join(", ")}
                    {analysis?.analysisConfidence != null
                      ? ` · ${(analysis.analysisConfidence * 100).toFixed(0)}% confidence`
                      : ""}
                  </p>
                )}
              </div>
            )}

            <Button
              className="mt-4 min-h-[48px] w-full text-sm font-bold"
              disabled={busy || !file || noCredits}
              onClick={runMotio2Auto}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {busy ? "Running Motio2Auto…" : "Execute Motio2Auto Transformation"}
            </Button>
            {noCredits && (
              <p className="mt-2 text-center text-xs text-destructive">
                Not enough credits.{" "}
                <Link to="/pricing" className="underline">
                  Upgrade
                </Link>
              </p>
            )}
          </section>

          {/* Right — output */}
          <section className="relative flex min-h-[320px] flex-col rounded-2xl border border-border bg-card/80 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Output canvas
            </p>

            <div className="relative mt-4 flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background">
              {!preview && !output && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Result appears here after Motio2Auto runs</p>
                </div>
              )}

              {preview && !output && phase !== "done" && (
                <div className="flex flex-1 items-center justify-center p-4 opacity-40">
                  <img src={preview} alt="" className="max-h-[360px] w-full object-contain" />
                </div>
              )}

              {output && preview && (
                <div className="p-2 sm:p-3">
                  <CompareSlider before={preview} after={output} />
                </div>
              )}

              {output && !preview && (
                <img src={output} alt="Result" className="max-h-[400px] w-full object-contain" />
              )}

              {/* UI chrome label only — real watermark remains via secure download */}
              <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                Secured by Motio2Auto Engine
              </div>
            </div>

            {output && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={download} disabled={dlBusy} className="flex-1 sm:flex-none">
                  <Download className="mr-1.5 h-4 w-4" />
                  {dlBusy ? "Preparing…" : "Download"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("motio2edit-mode", "image");
                      sessionStorage.setItem(
                        "motio2edit-reuse",
                        JSON.stringify({ url: output, kind: "image" }),
                      );
                    } catch {
                      /* ignore */
                    }
                    navigate({ to: "/editor" });
                  }}
                >
                  Continue in Editor
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  New photo
                </Button>
              </div>
            )}

            {history.length > 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Applied: {history.map((h) => h.title).join(" → ")}
              </p>
            )}
          </section>
        </div>

        {/* Pipeline tracker — maps to real analyze / decision / generateMedia phases */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pipeline status
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                phase === "error" ? "text-destructive" : "text-primary",
              )}
            >
              {statusText}
            </p>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PIPELINE_STEPS.map((s, i) => {
              const done = activeIdx > i || phase === "done";
              const active = phase === s.id;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-center text-[11px] font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : done
                        ? "border-border bg-secondary/50 text-foreground"
                        : "border-border text-muted-foreground",
                  )}
                >
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {i + 1}
                  </span>
                  {s.label}
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
