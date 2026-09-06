/**
 * Maluto AI — Auto Edit product page (restored).
 */
import { Link } from "@tanstack/react-router";
import {
  useCallback,
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
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AutoEditBeforeAfter } from "@/components/auto-edit/AutoEditBeforeAfter";
import { AutoEditResultViewer } from "@/components/auto-edit/AutoEditResultViewer";
import { useAuth } from "@/lib/auth";
import { runStandaloneAutoEdit } from "@/lib/auto-edit/auto-edit.functions";
import {
  AUTO_EDIT_PRODUCT_NAME,
  autoEditCreditCost,
} from "@/lib/auto-edit/constants";
import {
  autoEditQualitiesForPlan,
  defaultAutoEditQualityForPlan,
  type AutoEditQuality,
} from "@/lib/auto-edit/auto-edit.quality";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import { cn } from "@/lib/utils";

function isAcceptableImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export function AutoEditPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const runEdit = useServerFn(runStandaloneAutoEdit);
  const secureDl = useServerFn(secureDownloadImage);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const qualities = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() => defaultAutoEditQualityForPlan(plan));
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);

  const onPick = useCallback((f: File | null) => {
    if (!f) return;
    if (!isAcceptableImageFile(f)) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    setOutput(null);
    const url = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    onPick(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const clear = () => {
    setFile(null);
    setOutput(null);
    setProgress(0);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const run = async () => {
    if (!user) {
      toast.error("Sign in required");
      return;
    }
    if (!file) {
      toast.error("Upload a photo first");
      return;
    }
    setBusy(true);
    setProgress(8);
    setOutput(null);
    try {
      setProgress(20);
      const uploaded = await uploadToStorage(file, user.id, "auto-edit");
      setProgress(45);
      const result = await runEdit({ data: { imageUrl: uploaded, quality } });
      setProgress(90);
      const outUrl =
        (result as { outputUrl?: string; url?: string })?.outputUrl ||
        (result as { url?: string })?.url ||
        null;
      if (!outUrl) throw new Error("No output returned");
      setOutput(outUrl);
      setProgress(100);
      toast.success(AUTO_EDIT_PRODUCT_NAME + " complete");
      void refreshProfile?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto Edit failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadResult = async () => {
    if (!output) return;
    setDlBusy(true);
    try {
      try {
        const res = await secureDl({ data: { url: output } });
        const blobUrl = typeof res === "string" ? res : (res as { url?: string })?.url || output;
        await triggerBrowserDownload(blobUrl, "motio2edit-auto-edit.jpg");
      } catch {
        await triggerBrowserDownload(output, "motio2edit-auto-edit.jpg");
      }
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    } finally {
      setDlBusy(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/40">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{AUTO_EDIT_PRODUCT_NAME}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to enhance one photo in a single click.</p>
          <Link
            to="/auth"
            search={{ redirect: "/studio/image/auto-edit" }}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 via-background to-background dark:from-violet-950/30">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Motio2edit</p>
            <h1 className="text-xl font-extrabold tracking-tight">{AUTO_EDIT_PRODUCT_NAME}</h1>
            <p className="text-xs text-muted-foreground">One photo · one click · vision + edit</p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition",
            dragOver ? "border-primary bg-primary/5" : "border-border/70 bg-card/40",
          )}
        >
          {!preview ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-3 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <Upload className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold">Drop a photo or tap to upload</p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP</p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-black/5">
                {output && preview ? (
                  <AutoEditBeforeAfter before={preview} after={output} />
                ) : (
                  <img src={preview} alt="Upload preview" className="mx-auto max-h-[420px] w-auto object-contain" />
                )}
                <button type="button" onClick={clear} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/50 text-white" aria-label="Clear">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {qualities.map((q) => (
                  <button key={q} type="button" onClick={() => setQuality(q)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", quality === q ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200" : "border-border text-muted-foreground")}>
                    {q}
                  </button>
                ))}
              </div>
              {busy && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-xs text-muted-foreground">Enhancing… {progress}%</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => void run()} disabled={busy || !file} className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-5 font-semibold text-white">
                  {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Run {AUTO_EDIT_PRODUCT_NAME}</>)}
                </Button>
                {!isAdmin && <span className="text-xs text-muted-foreground">{creditCost} credits</span>}
                {output && (
                  <>
                    <Button type="button" variant="outline" className="rounded-full" onClick={() => setViewerOpen(true)}>
                      <ImageIcon className="mr-2 h-4 w-4" /> View
                    </Button>
                    <Button type="button" variant="outline" className="rounded-full" disabled={dlBusy} onClick={() => void downloadResult()}>
                      {dlBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInput} />
        </div>
        {output && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Ready · {AUTO_EDIT_PRODUCT_NAME}
          </p>
        )}
      </main>
      {output && (
        <AutoEditResultViewer src={output} open={viewerOpen} onClose={() => setViewerOpen(false)} onDownload={() => void downloadResult()} downloadBusy={dlBusy} />
      )}
    </div>
  );
}
