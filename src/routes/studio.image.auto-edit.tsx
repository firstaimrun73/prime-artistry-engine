import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/image/auto-edit")({
  head: () => ({
    meta: [
      { title: "Auto Edit — Motio2edit" },
      {
        name: "description",
        content: "Upload a photo. MOTIO2EDIT analyzes and enhances it automatically.",
      },
    ],
  }),
  component: AutoEditPage,
});

type Step = "upload" | "analyze" | "ready" | "generate" | "result";

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
  const [plan, setPlan] = useState<AutoEditPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageQuality] = useState<ImageQuality>("hd");
  const [output, setOutput] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPct, setProgressPct] = useState(8);
  const [busy, setBusy] = useState(false);
  const autoAnalyzeRef = useRef(false);

  const isAdmin = isAdminEmail(profile?.email);
  const selectedCount = selected.size;
  const creditEst = estimateAutoEditCredits(selectedCount, imageQuality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < creditEst.total;

  // Estimated seconds: ~6–8s per operation (honest range, not a hard promise)
  const estSeconds =
    selectedCount <= 0 ? 0 : Math.max(12, Math.min(90, selectedCount * 7 + 6));

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
            Drop a photo — AI analyzes and enhances it for you.
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

  const runAnalyze = async (f: File, size: { w: number; h: number } | null) => {
    setBusy(true);
    setStep("analyze");
    try {
      const imageUrl = await uploadToStorage(f);
      const res = await analyzeFn({
        data: {
          imageUrl,
          width: size?.w,
          height: size?.h,
        },
      });
      setAnalysis(res.analysis);
      setPlan(res.plan);
      if (res.plan.status === "NO_CHANGE") {
        setSelected(new Set());
        toast.message(res.plan.message);
      } else {
        // Auto-select all recommended defaults — user does not configure ops
        setSelected(
          new Set(res.plan.operations.filter((o) => o.defaultSelected).map((o) => o.id)),
        );
      }
      setStep("ready");
    } catch (err) {
      setStep("upload");
      toast.error(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(false);
      autoAnalyzeRef.current = false;
    }
  };

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
    setOutput(null);
    setAnalysis(null);
    setPlan(null);
    setSelected(new Set());
    setHistory([]);
    autoAnalyzeRef.current = true;
    const img = new Image();
    img.onload = () => {
      const size = { w: img.naturalWidth, h: img.naturalHeight };
      setPixelSize(size);
      if (autoAnalyzeRef.current) void runAnalyze(f, size);
    };
    img.onerror = () => {
      if (autoAnalyzeRef.current) void runAnalyze(f, null);
    };
    img.src = url;
  };

  const runApply = async () => {
    if (!file || !preview || !plan) return;
    if (plan.status === "NO_CHANGE") {
      toast.message(plan.message);
      return;
    }
    const ordered = selectedOperationsInOrder(plan, selected);
    if (ordered.length === 0) return toast.error("No recommended operations for this photo.");
    if (noCredits) {
      return toast.error(
        `Not enough credits. Estimated ${creditEst.total} credits for ${ordered.length} step(s).`,
      );
    }

    setBusy(true);
    setStep("generate");
    setProgressPct(10);
    setHistory([]);
    try {
      let currentUrl = await uploadToStorage(file);
      const hist: { id: string; title: string }[] = [];

      for (let i = 0; i < ordered.length; i++) {
        const opId = ordered[i] as AutoEditOperationId;
        const opMeta = plan.operations.find((o) => o.id === opId);
        setProgressLabel(opMeta?.title ?? opId);
        setProgressPct(12 + Math.round(((i + 0.35) / ordered.length) * 80));
        const stepInput = buildStepForOperation(
          opId,
          currentUrl,
          imageQuality,
          undefined,
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
      setProgressPct(100);
      setOutput(currentUrl);
      setStep("result");
      await refreshProfile();
      toast.success("Your enhanced photo is ready.");
    } catch (err) {
      setStep("ready");
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

  const reset = () => {
    setStep("upload");
    setPreview(null);
    setFile(null);
    setOutput(null);
    setPlan(null);
    setAnalysis(null);
    setSelected(new Set());
    setHistory([]);
  };

  // Detected findings for display (from plan — no invented %)
  const findings =
    plan?.operations.filter((o) => selected.has(o.id)).map((o) => o.title) ?? [];
  const issueLabels = (plan?.detectedIssues ?? []).map((i) => i.replace(/_/g, " "));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 pb-28 md:pb-12">
        <Link
          to="/studio"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>

        <div className="mt-5 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_0_28px_hsl(24_95%_53%/0.5)]">
            A✦
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Auto Edit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a photo. AI takes care of the rest.
          </p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {/* UPLOAD — primary UI */}
        {(step === "upload" || (step === "ready" && !preview)) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-8 flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-12 text-center transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
              <Upload className="h-6 w-6" />
            </span>
            <span className="text-base font-bold">Upload your photo</span>
            <span className="text-xs text-muted-foreground">JPG, PNG · up to 25 MB</span>
          </button>
        )}

        {/* ANALYZE */}
        {step === "analyze" && (
          <div className="mt-8 space-y-4">
            {preview && (
              <div className="overflow-hidden rounded-2xl border border-border">
                <img src={preview} alt="" className="mx-auto max-h-56 w-full object-contain opacity-80" />
              </div>
            )}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <Wand2 className="mx-auto h-8 w-8 animate-pulse text-primary" />
              <p className="mt-3 text-sm font-bold text-primary">Analyzing your photo…</p>
              <p className="mt-1 text-xs text-muted-foreground">Detecting quality, lighting, and detail</p>
              <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          </div>
        )}

        {/* READY — findings + one enhance button (no prompt, no ops checklist required) */}
        {step === "ready" && plan && preview && (
          <div className="mt-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img src={preview} alt="Upload" className="mx-auto max-h-56 w-full object-contain" />
            </div>

            {plan.status === "READY" && (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    We found
                  </p>
                  <ul className="mt-3 space-y-2">
                    {issueLabels.length > 0
                      ? issueLabels.map((label) => (
                          <li key={label} className="flex items-center gap-2 text-sm capitalize">
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                            {label}
                          </li>
                        ))
                      : findings.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                            {f}
                          </li>
                        ))}
                  </ul>
                  {analysis?.analysisConfidence != null && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Analysis confidence {(analysis.analysisConfidence * 100).toFixed(0)}%
                      {pixelSize ? ` · ${pixelSize.w}×${pixelSize.h}` : ""}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recommended edits
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {findings.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Estimated ~{estSeconds}s · {creditEst.total} credits
                    {" · "}
                    Balance: {isAdmin ? "∞" : credits}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{creditEst.note}</p>
                </div>

                <Button
                  className="min-h-[48px] w-full text-base"
                  disabled={busy || noCredits || selectedCount === 0}
                  onClick={runApply}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" /> Enhance my photo
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
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">{plan.message}</p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to="/editor">Open Image Editor</Link>
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Use a different photo
            </button>
          </div>
        )}

        {/* GENERATE */}
        {step === "generate" && (
          <div className="mt-8 space-y-4">
            {preview && (
              <div className="overflow-hidden rounded-2xl border border-border opacity-70">
                <img src={preview} alt="" className="mx-auto max-h-48 w-full object-contain" />
              </div>
            )}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
              <p className="mt-3 text-sm font-bold text-primary">AI is restoring your photo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {progressLabel ? `Working: ${progressLabel}` : "Applying recommended edits…"}
              </p>
              <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Analyzing → Restoring → Enhancing → Finalizing
              </p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {step === "result" && output && preview && (
          <section className="mt-6 space-y-4">
            {history.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
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
                Use in Image Studio
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={reset}>
              Try another photo
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
