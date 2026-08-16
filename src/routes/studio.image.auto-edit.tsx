import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  IMAGE_QUALITY_OPTIONS,
  type ImageQuality,
} from "@/lib/quality-options";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import { OutputQualitySelector } from "@/components/editor/controls/OutputQualitySelector";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/auto-edit")({
  head: () => ({
    meta: [
      { title: "Auto Edit — Motio2edit" },
      {
        name: "description",
        content:
          "Analyze your photo and apply structured Auto Edit operations with Motio2edit.",
      },
    ],
  }),
  component: AutoEditPage,
});

type Step = "upload" | "analyze" | "review" | "generate" | "result";

function AutoEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const analyzeFn = useServerFn(analyzeForAutoEdit);
  const generate = useServerFn(generateMedia);

  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"vision" | "fallback" | null>(null);
  const [plan, setPlan] = useState<AutoEditPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageQuality, setImageQuality] = useState<ImageQuality>("hd");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [optionalNote, setOptionalNote] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [progressLabel, setProgressLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdminEmail(profile?.email);
  const selectedCount = selected.size;
  const creditEst = estimateAutoEditCredits(selectedCount, imageQuality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < creditEst.total;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Sign in for Auto Edit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Auto Edit analyzes your photo and applies selected operations.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Image must be under 25 MB.");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setPixelSize(null);
    const img = new Image();
    img.onload = () => setPixelSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    setOutput(null);
    setAnalysis(null);
    setPlan(null);
    setSelected(new Set());
    setHistory([]);
    setStep("upload");
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
      throw new Error("Could not create a signed URL for analysis.");
    }
    return data.signedUrl;
  };

  const runAnalyze = async () => {
    if (!file) return toast.error("Upload an image first.");
    setBusy(true);
    setStep("analyze");
    try {
      const imageUrl = await uploadToStorage(file);
      const res = await analyzeFn({
        data: {
          imageUrl,
          width: pixelSize?.w,
          height: pixelSize?.h,
        },
      });
      setAnalysis(res.analysis);
      setAnalysisMode(res.mode);
      setPlan(res.plan);
      if (res.plan.status === "NO_CHANGE") {
        setSelected(new Set());
        toast.message(res.plan.message);
      } else {
        setSelected(
          new Set(res.plan.operations.filter((o) => o.defaultSelected).map((o) => o.id)),
        );
        toast.success("Analysis complete — review suggested operations.");
      }
      setStep("review");
      if (res.mode === "fallback") {
        toast.message("Using standard suggestions (vision analysis limited).");
      }
    } catch (err) {
      setStep("upload");
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runApply = async () => {
    if (!file || !preview || !plan) return;
    if (plan.status === "NO_CHANGE") {
      toast.message(plan.message);
      return;
    }
    const ordered = selectedOperationsInOrder(plan, selected);
    if (ordered.length === 0) return toast.error("Select at least one operation.");
    if (noCredits) {
      return toast.error(`Not enough credits. Estimated ${creditEst.total} credits for ${ordered.length} step(s).`);
    }

    setBusy(true);
    setStep("generate");
    setHistory([]);
    try {
      let currentUrl = await uploadToStorage(file);
      const hist: { id: string; title: string }[] = [];

      for (let i = 0; i < ordered.length; i++) {
        const opId = ordered[i] as AutoEditOperationId;
        const opMeta = plan.operations.find((o) => o.id === opId);
        setProgressLabel(
          `Step ${i + 1}/${ordered.length}: ${opMeta?.title ?? opId}`,
        );
        const stepInput = buildStepForOperation(
          opId,
          currentUrl,
          imageQuality,
          optionalNote || undefined,
        );
        const res = await generate({
          data: {
            prompt: stepInput.prompt,
            type: "image",
            imageUrl: stepInput.imageUrl,
            sourceKind: "image",
            strength: stepInput.strength,
            imageQuality: stepInput.imageQuality,
          },
        });
        if (!res.outputUrl) throw new Error(`No output from ${opId}`);
        currentUrl = res.outputUrl;
        hist.push({ id: opId, title: opMeta?.title ?? opId });
      }

      setHistory(hist);
      setOutput(currentUrl);
      setStep("result");
      await refreshProfile();
      toast.success(`Auto Edit complete (${hist.length} step${hist.length > 1 ? "s" : ""}).`);
    } catch (err) {
      setStep("review");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
      setProgressLabel("");
    }
  };

  const download = () => {
    if (!output) return;
    const a = document.createElement("a");
    a.href = output;
    a.download = `motio2edit-auto-edit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download started");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/studio/image"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Image Studio
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <Sparkles className="h-6 w-6 text-primary" />
              Auto Edit
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyze → structured plan → confirm operations → quality → apply.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/editor">Open Image Editor</Link>
          </Button>
        </div>

        <ol className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {(["upload", "analyze", "review", "generate", "result"] as Step[]).map((s, i) => (
            <li
              key={s}
              className={cn(
                "rounded-full border px-2.5 py-1",
                step === s ? "border-primary bg-primary/10 text-primary" : "border-border",
              )}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <Upload className="h-6 w-6" />
            {preview ? "Replace image" : "Upload image to analyze"}
          </button>

          {preview && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <img src={preview} alt="Upload" className="mx-auto max-h-72 w-full object-contain" />
            </div>
          )}

          {pixelSize && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {pixelSize.w}×{pixelSize.h}px
            </p>
          )}

          {preview && step === "upload" && (
            <Button className="mt-4 w-full" disabled={busy} onClick={runAnalyze}>
              <Wand2 className="mr-1.5 h-4 w-4" /> Analyze image
            </Button>
          )}
        </section>

        {step === "analyze" && (
          <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center">
            <Wand2 className="mx-auto h-8 w-8 animate-pulse text-primary" />
            <p className="mt-3 text-sm font-semibold text-primary">Analyzing your photo…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Building a structured edit plan
            </p>
          </div>
        )}

        {step === "review" && plan && analysis && (
          <section className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Analysis
              </p>
              <p className="mt-2 text-sm text-foreground">{analysis.rawVisionResponse}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Confidence {(plan.confidence * 100).toFixed(0)}%
                {analysisMode === "fallback" ? " · standard suggestions" : " · vision"}
                {analysis.dimensions.width > 0
                  ? ` · ${analysis.dimensions.width}×${analysis.dimensions.height}`
                  : ""}
              </p>
              {plan.detectedIssues.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.detectedIssues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {issue.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{plan.message}</p>
            </div>

            {plan.status === "READY" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended operations (in priority order)
                </p>
                {plan.operations.map((op, idx) => {
                  const on = selected.has(op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => toggle(op.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                        on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {on ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{op.title}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            #{idx + 1} · {op.risk} risk
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {op.description} — {op.reason}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {plan.status === "READY" && (
              <>
                <OutputQualitySelector
                  value={imageQuality}
                  onChange={setImageQuality}
                  disabled={busy}
                />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Output size / aspect (for product completeness)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        disabled={busy}
                        onClick={() => setAspectRatio(a.id)}
                        className={cn(
                          "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium",
                          aspectRatio === a.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Edit steps preserve source framing; aspect is stored for future sizing controls.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Optional note (secondary)
                  </p>
                  <Textarea
                    value={optionalNote}
                    disabled={busy}
                    onChange={(e) => setOptionalNote(e.target.value.slice(0, 400))}
                    rows={2}
                    placeholder="Optional preference only — operations above drive the edit"
                    className="resize-none text-sm"
                  />
                </div>

                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  Estimated:{" "}
                  <span className="font-semibold text-foreground">{creditEst.total} credits</span>
                  {" "}
                  ({selectedCount} × {creditEst.perOperation})
                  {" · "}
                  Balance: {isAdmin ? "∞" : credits}
                  {" · "}
                  {IMAGE_QUALITY_OPTIONS.find((q) => q.id === imageQuality)?.label}
                  <p className="mt-1">{creditEst.note}</p>
                </div>

                <Button
                  className="w-full"
                  disabled={busy || noCredits || selectedCount === 0}
                  onClick={runApply}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" /> Generate Auto Edit
                </Button>
                {noCredits && (
                  <p className="text-center text-xs text-destructive">
                    Not enough credits.{" "}
                    <Link to="/pricing" className="underline">
                      Upgrade
                    </Link>
                  </p>
                )}
              </>
            )}

            {plan.status === "NO_CHANGE" && (
              <Button variant="outline" className="w-full" asChild>
                <Link to="/editor">Open Image Editor instead</Link>
              </Button>
            )}
          </section>
        )}

        {step === "generate" && (
          <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
            <p className="mt-3 text-sm font-semibold text-primary">
              {progressLabel || "Applying Auto Edit…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sequential operations via Motio2edit image pipeline
            </p>
          </div>
        )}

        {step === "result" && output && preview && (
          <section className="mt-4 space-y-4">
            {history.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Applied: {history.map((h) => h.title).join(" → ")}
              </p>
            )}
            <CompareSlider before={preview} after={output} />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={download}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("review");
                  setOutput(null);
                }}
              >
                Adjust & re-apply
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full"
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
              Continue in Image Editor
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
