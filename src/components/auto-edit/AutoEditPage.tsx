/**
 * Maluto AI — Auto Edit product page.
 * Backend: runStandaloneAutoEdit (vision + FLUX Kontext).
 * Back always navigates to homepage `/` (never Image Studio).
 */
import { Link, useNavigate } from "@tanstack/react-router";
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
  ChevronDown,
  Cloud,
  Download,
  Eye,
  FileStack,
  Gem,
  ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AutoEditBeforeAfter } from "@/components/auto-edit/AutoEditBeforeAfter";
import { AutoEditResultViewer } from "@/components/auto-edit/AutoEditResultViewer";
import { useAuth } from "@/lib/auth";
import { runStandaloneAutoEdit } from "@/lib/auto-edit/auto-edit.functions";
import {
  AUTO_EDIT_PRODUCT_NAME,
  AUTO_EDIT_CREDITS_BY_QUALITY,
  autoEditCreditCost,
  type AutoEditQuality,
} from "@/lib/auto-edit/constants";
import {
  autoEditQualitiesForPlan,
  defaultAutoEditQualityForPlan,
} from "@/lib/auto-edit/auto-edit.quality";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import { cn } from "@/lib/utils";

const PIPELINE = ["Upload", "Analyse", "Plan", "Generate", "Finish"] as const;

const CREDIT_TABLE: { label: string; credits: number }[] = [
  { label: "SD", credits: AUTO_EDIT_CREDITS_BY_QUALITY.sd },
  { label: "HD", credits: AUTO_EDIT_CREDITS_BY_QUALITY.hd },
  { label: "2K", credits: AUTO_EDIT_CREDITS_BY_QUALITY["2k"] },
  { label: "4K", credits: AUTO_EDIT_CREDITS_BY_QUALITY["4k"] },
  { label: "8K", credits: AUTO_EDIT_CREDITS_BY_QUALITY["8k"] },
  { label: "8K Max", credits: AUTO_EDIT_CREDITS_BY_QUALITY["8k_max"] },
];

const FAQ_ITEMS = [
  {
    q: "What is Maluto AI?",
    a: "Maluto AI is Motio2edit’s one-tap Auto Edit. Upload a photo — it analyses the image, builds an edit plan, and returns a polished result without you writing a prompt.",
  },
  {
    q: "How many credits does it cost?",
    a: "SD and HD cost 45 credits. 2K is 50, 4K is 60, 8K is 60, and 8K Max is 65. Analysis and edit are bundled into one charge. Failed jobs do not charge credits.",
  },
  {
    q: "Which qualities are available?",
    a: "SD, HD, 2K, 4K, 8K (and 8K Max on higher plans). Your plan controls which tiers appear. Free and Lite start with SD and HD.",
  },
  {
    q: "Does it save to History?",
    a: "Yes. Every successful Maluto AI generation is saved to your History with the input image, output image, and selected quality.",
  },
  {
    q: "What happens if generation fails?",
    a: "You are not charged. You can retry with the same photo or try a different quality.",
  },
  {
    q: "Can I use it offline?",
    a: "No. Maluto AI runs on cloud GPUs so the analysis and edit can finish in under a minute.",
  },
] as const;

const FLOW_STEPS = [
  { icon: Eye, title: "Analyse", desc: "Vision studies the photo" },
  { icon: FileStack, title: "Plan", desc: "Issues & edit plan" },
  { icon: Cloud, title: "Generate", desc: "Cloud GPU processes" },
  { icon: Sparkles, title: "Output", desc: "Polished result" },
] as const;

function isAcceptableImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  );
}

function FlowConnectors() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-[22px] hidden h-8 w-full sm:block"
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M12 10 C 22 2, 28 18, 37 10" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.2 1.4" className="text-violet-400/70 dark:text-violet-300/50" />
      <path d="M37 10 C 47 2, 53 18, 62 10" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.2 1.4" className="text-violet-400/70 dark:text-violet-300/50" />
      <path d="M62 10 C 72 2, 78 18, 88 10" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.2 1.4" className="text-violet-400/70 dark:text-violet-300/50" />
    </svg>
  );
}

export function AutoEditPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const runEdit = useServerFn(runStandaloneAutoEdit);
  const secureDl = useServerFn(secureDownloadImage);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const costPanelRef = useRef<HTMLDivElement>(null);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const qualityOptions = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() =>
    defaultAutoEditQualityForPlan(plan),
  );
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);

  const goHome = useCallback(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const toggleCost = useCallback(() => {
    setShowCost((v) => !v);
  }, []);

  useEffect(() => {
    if (!showCost) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = costPanelRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowCost(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCost(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [showCost]);

  const onPick = useCallback((f: File | null) => {
    if (!f) return;
    if (!isAcceptableImageFile(f)) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    setOutput(null);
    setStep(0);
    setProgress(0);
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
    setStep(0);
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
    setProgress(5);
    setStep(0);
    setOutput(null);
    try {
      setStep(0);
      setProgress(15);
      const uploaded = await uploadToStorage(file, user.id);
      setStep(1);
      setProgress(35);
      setStep(2);
      setProgress(50);
      const result = await runEdit({
        data: {
          imageUrl: uploaded,
          imageQuality: quality,
        },
      });
      setStep(3);
      setProgress(85);
      const outUrl =
        (result as { outputUrl?: string })?.outputUrl ||
        (result as { url?: string })?.url ||
        null;
      if (!outUrl) throw new Error("No output returned");
      setOutput(outUrl);
      setStep(4);
      setProgress(100);
      toast.success(AUTO_EDIT_PRODUCT_NAME + " complete");
      void refreshProfile?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto Edit failed");
      setStep(0);
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
        const blobUrl =
          typeof res === "string" ? res : (res as { url?: string })?.url || output;
        await triggerBrowserDownload(blobUrl, "motio2edit-maluto-ai.jpg");
      } catch {
        await triggerBrowserDownload(output, "motio2edit-maluto-ai.jpg");
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
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/40">
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
            Motio2edit
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{AUTO_EDIT_PRODUCT_NAME}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to enhance one photo.</p>
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
    <div className="min-h-screen bg-gradient-to-b from-violet-50/90 via-background to-cyan-50/30 dark:from-violet-950/40 dark:via-background dark:to-background">
      <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={goHome} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/40 bg-white/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5" aria-label="Back to home">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Motio2edit</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{AUTO_EDIT_PRODUCT_NAME}</h1>
              <span className="relative inline-flex h-6 w-6 items-center justify-center" title="Maluto AI is live" aria-label="Live">
                <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/40" />
                <span className="absolute inset-0.5 animate-pulse rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-400 to-cyan-400 opacity-80" />
                <Gem className="relative h-3.5 w-3.5 text-white drop-shadow" />
              </span>
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-1 rounded-2xl border border-white/50 bg-white/40 px-3 py-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {PIPELINE.map((label, i) => {
            const done = step > i || (progress === 100 && i === PIPELINE.length - 1);
            const active = busy && step === i;
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition", done && "bg-violet-600 text-white", active && "animate-pulse bg-cyan-500 text-white", !done && !active && "bg-black/5 text-muted-foreground dark:bg-white/10")}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn("relative overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-5 shadow-lg backdrop-blur-xl transition dark:border-white/10 dark:bg-white/5", dragOver && "border-violet-400 ring-2 ring-violet-400/30")}
        >
          {!preview ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-3 py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-600 dark:text-violet-300">
                <Upload className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold">Drop or tap to upload</p>
              <p className="text-xs text-muted-foreground">JPG · PNG · WEBP</p>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-black/5">
                {output && preview ? (
                  <AutoEditBeforeAfter before={preview} after={output} />
                ) : (
                  <img src={preview} alt="Preview" className="mx-auto max-h-[400px] w-auto object-contain" />
                )}
                {!output && (
                  <button type="button" onClick={clear} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur" aria-label="Clear">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setQuality(opt.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur",
                      quality === opt.id
                        ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                        : "border-white/40 bg-white/30 text-muted-foreground dark:border-white/10 dark:bg-white/5",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}

                {!isAdmin && (
                  <div className="relative ml-auto" ref={costPanelRef}>
                    <button
                      type="button"
                      onClick={toggleCost}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/40 bg-white/40 text-violet-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-violet-300"
                      aria-label={showCost ? "Hide credit costs" : "Show credit costs"}
                      aria-expanded={showCost}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    {showCost && (
                      <div
                        role="dialog"
                        aria-label="Credit costs"
                        className="absolute right-0 top-full z-30 mt-2 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-violet-300/40 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-violet-500/30 dark:bg-violet-950/95"
                      >
                        <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">Credit costs</p>
                        <div className="space-y-0.5">
                          {CREDIT_TABLE.map((row) => (
                            <div
                              key={row.label}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-2 py-1 text-[11px]",
                                row.credits === creditCost
                                  ? "bg-violet-500/15 font-semibold text-violet-700 dark:text-violet-200"
                                  : "text-muted-foreground",
                              )}
                            >
                              <span>{row.label}</span>
                              <span>{row.credits}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1.5 border-t border-violet-200/50 px-1 pt-1.5 text-[10px] text-muted-foreground dark:border-violet-500/20">
                          Selected: <strong>{creditCost} credits</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {busy && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-xs text-muted-foreground">
                    {PIPELINE[Math.min(step, PIPELINE.length - 1)]}… {progress}%
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {!output ? (
                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 hover:from-violet-700 hover:via-fuchsia-600 hover:to-violet-700 text-white shadow-lg border-0"
                    size="lg"
                    disabled={busy || !file}
                    onClick={() => void run()}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhance
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={clear}>
                      New photo
                    </Button>
                    <Button className="flex-1" onClick={() => setViewerOpen(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button className="flex-1" disabled={dlBusy} onClick={() => void downloadResult()}>
                      {dlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInput} />
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-muted-foreground">How it works</h2>
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FlowConnectors />
            {FLOW_STEPS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-2 rounded-2xl border border-white/50 bg-white/40 p-3 text-center backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-xs font-bold">{title}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-muted-foreground">FAQ</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} className="overflow-hidden rounded-xl border border-white/50 bg-white/40 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
                  onClick={() => setOpenFaq((v) => (v === i ? null : i))}
                >
                  {item.q}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <p className="border-t border-white/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {viewerOpen && output && (
        <AutoEditResultViewer
          url={output}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={() => void downloadResult()}
          downloadBusy={dlBusy}
        />
      )}
    </div>
  );
}
