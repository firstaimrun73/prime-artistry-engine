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
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { analyzeForAutoEdit } from "@/lib/auto-edit/analyze.functions";
import {
  buildImprovementsFromAnalysis,
  composeImprovementPrompt,
  type AutoImprovement,
} from "@/lib/auto-edit/improvements";
import type { ImageAnalysisResult } from "@/lib/auto-edit/types";
import {
  IMAGE_QUALITY_OPTIONS,
  imageQualityCost,
  type ImageQuality,
} from "@/lib/quality-options";
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
        content: "Analyze your photo and apply selected professional improvements with Motio2edit Auto Edit.",
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
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"vision" | "fallback" | null>(null);
  const [improvements, setImprovements] = useState<AutoImprovement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageQuality, setImageQuality] = useState<ImageQuality>("hd");
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdminEmail(profile?.email);
  const cost = imageQualityCost(imageQuality);
  const credits = profile?.credits ?? 0;
  const noCredits = !isAdmin && credits < cost;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Sign in for Auto Edit</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Auto Edit analyzes your photo and applies selected improvements.
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
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setAnalysis(null);
    setImprovements([]);
    setSelected(new Set());
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
      const res = await analyzeFn({ data: { imageUrl } });
      setAnalysis(res.analysis);
      setAnalysisMode(res.mode);
      const list = buildImprovementsFromAnalysis(res.analysis);
      setImprovements(list);
      setSelected(new Set(list.filter((i) => i.defaultSelected).map((i) => i.id)));
      setStep("review");
      if (res.mode === "fallback") {
        toast.message("Using standard improvement suggestions (vision analysis limited).");
      } else {
        toast.success("Analysis complete — review suggested improvements.");
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
    if (!file || !preview) return;
    if (noCredits) return toast.error(`Not enough credits. This costs ${cost} credits.`);
    const chosen = improvements.filter((i) => selected.has(i.id));
    if (chosen.length === 0) return toast.error("Select at least one improvement.");

    setBusy(true);
    setStep("generate");
    try {
      const imageUrl = await uploadToStorage(file);
      const prompt = composeImprovementPrompt(chosen);
      const res = await generate({
        data: {
          prompt,
          type: "image",
          imageUrl,
          sourceKind: "image",
          strength: 0.55,
          imageQuality,
        },
      });
      setOutput(res.outputUrl);
      setStep("result");
      await refreshProfile();
      toast.success("Auto Edit complete.");
    } catch (err) {
      setStep("review");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
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
              Analyze → choose improvements → apply through the real Motio2edit pipeline.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/editor">Open Image Editor</Link>
          </Button>
        </div>

        {/* Steps indicator */}
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

        {/* Upload */}
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
            <p className="mt-1 text-xs text-muted-foreground">Detecting quality, lighting, faces and scene issues</p>
          </div>
        )}

        {step === "review" && analysis && (
          <section className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analysis</p>
              <p className="mt-2 text-sm text-foreground">{analysis.rawVisionResponse}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Confidence {(analysis.analysisConfidence * 100).toFixed(0)}%
                {analysisMode === "fallback" ? " · standard suggestions" : " · vision analysis"}
              </p>
            </div>

            <OutputQualitySelector value={imageQuality} onChange={setImageQuality} disabled={busy} />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select improvements
              </p>
              {improvements.map((imp) => {
                const on = selected.has(imp.id);
                return (
                  <button
                    key={imp.id}
                    type="button"
                    onClick={() => toggle(imp.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{imp.title}</span>
                      <span className="block text-xs text-muted-foreground">{imp.reason}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Apply cost: <span className="font-semibold text-foreground">{cost} credits</span>
              {" · "}
              Balance: {isAdmin ? "∞" : credits}
              {" · "}
              {IMAGE_QUALITY_OPTIONS.find((q) => q.id === imageQuality)?.label} output
            </div>

            <Button className="w-full" disabled={busy || noCredits} onClick={runApply}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Apply selected improvements
            </Button>
            {noCredits && (
              <p className="text-center text-xs text-destructive">
                Not enough credits. <Link to="/pricing" className="underline">Upgrade</Link>
              </p>
            )}
          </section>
        )}

        {step === "generate" && (
          <div className="mt-4 rounded-xl border border-border bg-card p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
            <p className="mt-3 text-sm font-semibold text-primary">Applying improvements…</p>
            <p className="mt-1 text-xs text-muted-foreground">Using the Motio2edit image pipeline</p>
          </div>
        )}

        {step === "result" && output && preview && (
          <section className="mt-4 space-y-4">
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
