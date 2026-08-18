import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, Download, Share2, Pencil, RefreshCw, X, Camera, Sparkles, Image as ImageIcon,
} from "lucide-react";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { generateMedia } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";
import { CompareSlider } from "@/components/CompareSlider";

export const CIRCLE_INSTANT_CREDITS = 35;
export const CIRCLE_PREP_CREDITS = 15;
export const CIRCLE_STUDIO_EDIT_CREDITS = 25;

export const SMART_ADD_PROMPT =
  "In the masked region only, generate and insert the described content so it matches the surrounding lighting, perspective, scale and textures. Keep every unmasked pixel identical. If no object was described, fill the masked area with natural continuation of the nearby background.";

const OVERLAY_STAGES = [
  "Analyzing image…",
  "Understanding the selected area…",
  "Preparing the removal…",
  "AI is rebuilding the background…",
  "Checking image quality…",
  "Applying final processing…",
  "Finishing your image…",
];

export const Route = createFileRoute("/studio/image/circle-remove")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "add" ? ("add" as const) : ("remove" as const),
  }),
  head: () => ({
    meta: [
      { title: "Circle to Remove — Motio2edit" },
      { name: "description", content: "Paint a region to remove or add content with Motio2edit." },
    ],
  }),
  component: CircleRemovePage,
});

type Phase = "idle" | "mask" | "generating" | "result";

function CircleRemovePage() {
  const { mode } = Route.useSearch();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateMedia);
  const fileRef = useRef<HTMLInputElement>(null);
  const generatingLockRef = useRef(false);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"remove" | "add">(mode);
  const [addDescribe, setAddDescribe] = useState("");
  const [instantRemove, setInstantRemove] = useState(true);
  const [lastMaskDataUrl, setLastMaskDataUrl] = useState<string | null>(null);
  const [lastMaskMeta, setLastMaskMeta] = useState<{ width: number; height: number } | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [etaSec, setEtaSec] = useState(55);

  useEffect(() => {
    let next: "remove" | "add" = mode;
    try {
      const stored = sessionStorage.getItem("motio2edit-circle-mode");
      if (stored === "add" || stored === "remove") next = stored;
      sessionStorage.removeItem("motio2edit-circle-mode");
    } catch { /* */ }
    setActiveMode(next);
  }, [mode]);

  useEffect(() => {
    if (phase !== "generating") return;
    setStageIdx(0);
    setEtaSec(55);
    const stageTimer = setInterval(() => setStageIdx((i) => Math.min(i + 1, OVERLAY_STAGES.length - 1)), 9000);
    const etaTimer = setInterval(() => setEtaSec((s) => Math.max(5, s - 3)), 3000);
    return () => { clearInterval(stageTimer); clearInterval(etaTimer); };
  }, [phase]);

  const isAdmin = isAdminEmail(profile?.email);
  const displayCost = instantRemove ? CIRCLE_INSTANT_CREDITS : CIRCLE_PREP_CREDITS + CIRCLE_STUDIO_EDIT_CREDITS;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Sign in to use Circle tools.</p>
        <Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button>
      </div>
    );
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f?.type.startsWith("image/")) return toast.error("Upload an image.");
    if (f.size > 25 * 1024 * 1024) return toast.error("Max 25 MB.");
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOutput(null);
    setLastMaskDataUrl(null);
    setLastMaskMeta(null);
    setPhase("mask");
  };

  const upload = async (blob: Blob, name: string) => {
    const uid = profile?.id ?? user.id;
    const path = `${uid}/circle-${Date.now()}-${name}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, {
      contentType: blob.type || "image/png", upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data, error: sErr } = await supabase.storage.from("uploads").createSignedUrl(path, 3600 * 6);
    if (sErr || !data?.signedUrl) throw new Error("Signed URL failed");
    return data.signedUrl;
  };

  const runInstantGenerate = useCallback(
    async (maskDataUrl: string, meta: { width: number; height: number }) => {
      if (!file || !preview || generatingLockRef.current) return;
      if (!isAdmin && (profile?.credits ?? 0) < CIRCLE_INSTANT_CREDITS) {
        toast.error(`Not enough credits (${CIRCLE_INSTANT_CREDITS} required).`);
        setPhase("mask");
        return;
      }
      generatingLockRef.current = true;
      setPhase("generating");
      setLastMaskDataUrl(maskDataUrl);
      setLastMaskMeta(meta);
      const t0 = performance.now();
      try {
        const tUp = performance.now();
        const imageUrl = await upload(file, file.name || "src.jpg");
        const maskRes = await fetch(maskDataUrl);
        const maskBlob = await maskRes.blob();
        const maskUrl = await upload(maskBlob, "mask.png");
        console.log("[circle] upload+sign ms:", Math.round(performance.now() - tUp));

        const prompt =
          activeMode === "remove"
            ? SMART_REMOVE_PROMPT
            : addDescribe.trim()
              ? `${SMART_ADD_PROMPT} Content to add: ${addDescribe.trim()}`
              : SMART_ADD_PROMPT;

        const tFal = performance.now();
        const res = await generate({
          data: {
            prompt, type: "image", imageUrl, sourceKind: "image",
            maskImageUrl: maskUrl, imageQuality: "hd", circleInstant: true,
          },
        });
        console.log("[circle] fal+wm ms:", Math.round(performance.now() - tFal));
        console.log("[circle] total ms:", Math.round(performance.now() - t0));
        setOutput(res.outputUrl);
        setPhase("result");
        await refreshProfile();
        toast.success(activeMode === "remove" ? "Removal complete" : "Add complete");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        setPhase("mask");
      } finally {
        generatingLockRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, preview, isAdmin, profile?.credits, activeMode, addDescribe, generate, refreshProfile],
  );

  const handoffToStudio = useCallback(
    async (maskDataUrl: string, meta: { width: number; height: number }) => {
      if (!file || !preview) return;
      try {
        const imageUrl = await upload(file, file.name || "src.jpg");
        const maskRes = await fetch(maskDataUrl);
        const maskBlob = await maskRes.blob();
        const maskUrl = await upload(maskBlob, "mask.png");
        sessionStorage.setItem("motio2edit-circle-handoff", JSON.stringify({
          source: "circle-remove", imageUrl, maskUrl,
          naturalWidth: meta.width, naturalHeight: meta.height, mode: activeMode,
          promptHint: activeMode === "remove" ? SMART_REMOVE_PROMPT : (addDescribe.trim() || SMART_ADD_PROMPT),
          prepCredits: CIRCLE_PREP_CREDITS,
          message: "Your selected removal area has been preserved. Add any additional edits you want, then generate.",
        }));
        sessionStorage.setItem("motio2edit-mode", "image");
        setLastMaskDataUrl(maskDataUrl);
        setLastMaskMeta(meta);
        toast.message("Selected area ready — continue in Image Studio");
        navigate({ to: "/editor" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not prepare handoff");
        setPhase("mask");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, preview, activeMode, addDescribe, navigate],
  );

  const onMaskApply = async (maskDataUrl: string, meta: { width: number; height: number }) => {
    setLastMaskDataUrl(maskDataUrl);
    setLastMaskMeta(meta);
    if (instantRemove) await runInstantGenerate(maskDataUrl, meta);
    else await handoffToStudio(maskDataUrl, meta);
  };

  const shareResult = async () => {
    if (!output) return;
    try {
      if (navigator.share) await navigator.share({ title: "Motio2edit result", url: output });
      else { await navigator.clipboard.writeText(output); toast.success("Link copied"); }
    } catch { /* */ }
  };

  if (phase === "generating") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' stroke='%23f97316' stroke-width='1.2'><rect x='18' y='22' width='44' height='34' rx='4'/><circle cx='40' cy='39' r='10'/><circle cx='40' cy='39' r='4'/><path d='M28 22 l4-6 h16 l4 6'/></g></svg>`,
          )}")`,
          backgroundSize: "80px 80px",
        }} />
        <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full bg-secondary/80 p-2 text-muted-foreground hover:text-foreground"
          onClick={() => toast.message("Generation is in progress. Result will appear when ready.")}>
          <X className="h-5 w-5" />
        </button>
        <div className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border/60 bg-card/90 px-6 py-10 shadow-xl backdrop-blur">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15">
            <Sparkles className="h-7 w-7 animate-pulse text-orange-500" />
          </div>
          <p className="text-center text-base font-semibold">{OVERLAY_STAGES[stageIdx]}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-700"
              style={{ width: `${Math.min(95, ((stageIdx + 1) / OVERLAY_STAGES.length) * 100)}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">Estimated time: ~{etaSec}s</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/80">
            <Camera className="h-3.5 w-3.5" /><span>Motio2edit AI</span><ImageIcon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && output && preview) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
          <button type="button" onClick={() => { setPhase("mask"); setOutput(null); }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Edit mask
          </button>
          <h1 className="text-sm font-semibold">Result</h1>
          <span className="w-16" />
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <CompareSlider before={preview} after={output} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button asChild className="h-11 bg-orange-500 hover:bg-orange-600">
              <a href={output} download={`motio2edit-circle-${Date.now()}.jpg`}>
                <Download className="mr-1.5 h-4 w-4" /> Download
              </a>
            </Button>
            <Button variant="outline" className="h-11" onClick={shareResult}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" className="h-11" onClick={() => setPhase("mask")}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit mask
            </Button>
            <Button variant="outline" className="h-11"
              onClick={() => {
                if (lastMaskDataUrl && lastMaskMeta) void runInstantGenerate(lastMaskDataUrl, lastMaskMeta);
                else setPhase("mask");
              }}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Generate again
            </Button>
          </div>
          <Button variant="secondary" className="h-11 w-full" onClick={() => navigate({ to: "/studio/image" })}>
            Continue in Image Studio
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <button type="button" onClick={() => navigate({ to: "/studio/image" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="inline-flex overflow-hidden rounded-full border border-border text-xs font-semibold">
          <button type="button" onClick={() => setActiveMode("remove")}
            className={cn("px-3 py-1.5", activeMode === "remove" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
            Remove
          </button>
          <button type="button" onClick={() => setActiveMode("add")}
            className={cn("px-3 py-1.5", activeMode === "add" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
            Add
          </button>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">{displayCost} cr</span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4">
        {activeMode === "add" && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground">What to add (optional)</label>
            <input value={addDescribe} onChange={(e) => setAddDescribe(e.target.value.slice(0, 400))}
              placeholder="e.g. a red balloon, a wooden bench…"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="instant-remove" className="text-sm font-semibold">Instant Remove</Label>
            <p className="text-[11px] text-muted-foreground">
              {instantRemove
                ? `ON — generate now (${CIRCLE_INSTANT_CREDITS} credits)`
                : `OFF — continue in Image Studio (${CIRCLE_PREP_CREDITS}+${CIRCLE_STUDIO_EDIT_CREDITS} later)`}
            </p>
          </div>
          <Switch id="instant-remove" checked={instantRemove} onCheckedChange={setInstantRemove} />
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {!preview ? (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-8 w-8" />
            Upload image to paint a region
          </button>
        ) : (
          <div className="space-y-3">
            {phase !== "mask" && (
              <div className="overflow-hidden rounded-xl border border-border">
                <img src={preview} alt="" className="mx-auto max-h-[50vh] w-full object-contain" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPhase("mask")}>{lastMaskDataUrl ? "Edit mask" : "Paint mask"}</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Replace image</Button>
            </div>
          </div>
        )}
      </main>

      <SmartRemoveModal
        open={phase === "mask" && !!preview}
        imageUrl={preview}
        onCancel={() => setPhase("idle")}
        onApply={onMaskApply}
        applyLabel={instantRemove ? "Generate" : "Continue"}
        externalBusy={generatingLockRef.current}
      />
    </div>
  );
}
