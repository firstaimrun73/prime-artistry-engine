import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CompareSlider } from "@/components/CompareSlider";
import { toast } from "sonner";
import {
  Upload, Sparkles, Download, Lock, Image as ImageIcon, Video,
  Square, RotateCcw, Pencil, Recycle, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor,
});

type GenState = "idle" | "loading" | "success" | "blocked";

const LOADING_MESSAGES = [
  "Enhancing your vision…",
  "Motion AI is editing…",
  "Refining every detail…",
  "Perfecting every pixel…",
  "Creating premium quality…",
  "Bringing your idea to life…",
  "Enhancing with Motion AI…",
  "Transforming imagination into reality…",
];

const STAGES = [
  "Upload Complete",
  "Prompt Analyzed",
  "AI Processing",
  "Finalizing Output",
  "Ready to Download",
] as const;

function Editor() {
  const { profile, refreshProfile } = useAuth();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [inputDataUrl, setInputDataUrl] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [state, setState] = useState<GenState>("idle");
  const [strength, setStrength] = useState(0.7);
  const [downloaded, setDownloaded] = useState(false);

  const [msgIdx, setMsgIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  // Client-side cancellation: a run is identified by an id; if it changes
  // (Stop / Clear / new run) the in-flight result is ignored.
  const runIdRef = useRef(0);

  // Rotating loading messages, stage progression + progress bar.
  useEffect(() => {
    if (state !== "loading") return;
    setMsgIdx(0);
    setStage(inputDataUrl ? 1 : 1);
    setProgress(8);
    const msg = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
    const stg = setInterval(() => setStage((s) => Math.min(STAGES.length - 2, s + 1)), 2500);
    const prg = setInterval(() => setProgress((p) => Math.min(92, p + Math.random() * 9)), 700);
    return () => { clearInterval(msg); clearInterval(stg); clearInterval(prg); };
  }, [state, inputDataUrl]);

  if (!profile) return null;
  const plan = getPlan(profile.plan);
  const cost = CREDIT_COST[mediaType];
  const noCredits = profile.credits < cost;
  const videoLocked = mediaType === "video" && !plan.video;
  const loading = state === "loading";

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInputPreview(URL.createObjectURL(file));
    if (mediaType === "image") {
      const reader = new FileReader();
      reader.onload = () => setInputDataUrl(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(file);
    } else {
      setInputDataUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first.");
    if (videoLocked) { setState("blocked"); return toast.error("Video generation requires a paid plan."); }
    if (noCredits) { setState("blocked"); return toast.error(`Not enough credits. This costs ${cost} credits.`); }

    const runId = ++runIdRef.current;
    setState("loading");
    setOutput(null);
    setDownloaded(false);
    try {
      const res = await generate({
        data: {
          prompt,
          type: mediaType,
          imageUrl: mediaType === "image" ? inputDataUrl ?? undefined : undefined,
          strength: mediaType === "image" && inputDataUrl ? strength : undefined,
        },
      });
      if (runId !== runIdRef.current) return; // cancelled
      setProgress(100);
      setStage(STAGES.length - 1);
      setOutput(res.outputUrl);
      setState("success");
      await refreshProfile();
      toast.success("Done!");
    } catch (err) {
      if (runId !== runIdRef.current) return; // cancelled
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    }
  };

  const handleStop = () => {
    runIdRef.current++; // invalidate any in-flight result
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
    setOutput(null);
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
    if (!output) return;
    setInputPreview(output);
    setInputDataUrl(output);
    setOutput(null);
    setState("idle");
    setDownloaded(false);
    toast.success("Result moved to input — keep editing.");
  };

  const handleDownload = () => {
    if (!output) return;
    const a = document.createElement("a");
    a.href = output;
    a.download = `motio2edit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Editor</h1>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
            {profile.credits} credits
          </span>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => { setMediaType("image"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mediaType === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Image
        </button>
        <button
          onClick={() => { setMediaType("video"); setState("idle"); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mediaType === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Video className="h-4 w-4" /> Video
          {!plan.video && <Lock className="h-3 w-3" />}
        </button>
      </div>

      {videoLocked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <span className="text-destructive-foreground">Video generation is a paid feature.</span>
          <Button asChild size="sm"><Link to="/pricing">Upgrade</Link></Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={videoLocked || loading}
            className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground transition-colors hover:border-primary disabled:opacity-50"
          >
            <Upload className="h-6 w-6" />
            {inputPreview ? "Replace image" : `Upload ${mediaType} (optional)`}
          </button>

          <Textarea
            placeholder={
              inputDataUrl
                ? "Describe the edit… e.g. enhance lighting, remove background, watercolor style"
                : `Describe the ${mediaType} you want…`
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={loading}
          />

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

          {loading ? (
            <Button variant="destructive" className="w-full" onClick={handleStop}>
              <Square className="mr-1.5 h-4 w-4 fill-current" /> Stop Generation
            </Button>
          ) : (
            <Button className="w-full" onClick={handleGenerate} disabled={videoLocked || noCredits}>
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
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-primary">{LOADING_MESSAGES[msgIdx]}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 text-sm">
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                        i < stage ? "bg-primary text-primary-foreground"
                        : i === stage ? "bg-primary/20 text-primary"
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
          ) : output && mediaType === "image" && inputPreview ? (
            <CompareSlider before={inputPreview} after={output} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
                  {inputPreview ? (
                    mediaType === "image" ? (
                      <img src={inputPreview} alt="input" className="h-full w-full object-contain" />
                    ) : (
                      <video src={inputPreview} className="h-full w-full object-cover" controls />
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
                    <img src={output} alt="output" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Output appears here</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {output && !loading && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleEditAgain}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit Again
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleUseResultAsInput}>
                <Recycle className="mr-1.5 h-4 w-4" /> Use as Input
              </Button>
            </div>
          )}

          {downloaded && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="text-muted-foreground">Saved! What next?</span>
              <Button size="sm" variant="secondary" onClick={handleEditAgain}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit Again
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClear}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> New Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
