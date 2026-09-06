/**
 * Maluto AI — Auto Edit product page.
 * Glassy, minimal copy. Backend: runStandaloneAutoEdit (vision + FLUX Kontext).
 *
 * UI:
 * - No global Header; back + Motio2edit + Maluto AI + live gem
 * - i-button shows credit cost table (auto-hides)
 * - Full-width Enhance; hide X after generation
 * - Map-style How-it-works flow with gentle dotted connectors
 * - FAQs (no recent history block)
 * - History already persisted server-side (input + output + quality)
 * - Back always goes to homepage `/`
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
  { icon: Eye, title: "Analyse", desc: "Vision model studies the photo" },
  { icon: FileStack, title: "Filing", desc: "Issues & edit plan are structured" },
  { icon: Cloud, title: "Data server", desc: "Secure cloud GPU processes the edit" },
  { icon: Sparkles, title: "Output", desc: "Polished image is returned" },
] as const;

function isAcceptableImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
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
  const costTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const qualityOptions = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() =>
    defaultAutoEditQualityForPlan(plan),
  );
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);

  const revealCost = useCallback(() => {
    setShowCost(true);
    if (costTimer.current) clearTimeout(costTimer.current);
    costTimer.current = setTimeout(() => setShowCost(false), 5000);
  }, []);

  useEffect(() => {
    if (file) revealCost();
    return () => {
      if (costTimer.current) clearTimeout(costTimer.current);
    };
  }, [quality, file, revealCost]);

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
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {AUTO_EDIT_PRODUCT_NAME}
          </h1>
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
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/40 bg-white/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
              Motio2edit
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{AUTO_EDIT_PRODUCT_NAME}</h1>
              <span
                className="relative inline-flex h-6 w-6 items-center justify-center"
                title="Maluto AI is live"
                aria-label="Live"
              >
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
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition",
                    done && "bg-violet-600 text-white",
                    active && "animate-pulse bg-cyan-500 text-white",
                    !done && !active && "bg-black/5 text-muted-foreground dark:bg-white/10",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative overflow-hidden rounded-3xl border border-white/60 bg-white/45 p-5 shadow-lg backdrop-blur-xl transition dark:border-white/10 dark:bg-white/5",
            dragOver && "border-violet-400 ring-2 ring-violet-400/30",
          )}
        >
          {!preview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 py-14 text-center"
            >
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
                  <img
                    src={preview}
                    alt="Preview"
                    className="mx-auto max-h-[400px] w-auto object-contain"
                  />
                )}
                {!output && (
                  <button
                    type="button"
                    onClick={clear}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur"
                    aria-label="Clear"
                  >
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
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={revealCost}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/40 bg-white/40 text-violet-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-violet-300"
                      aria-label="Show credit costs"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    {showCost && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-2xl border border-violet-300/40 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-violet-500/30 dark:bg-violet-950/95">
                        <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                          Credit costs
                        </p>
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
                <Button
                  type="button"
                  onClick={() => void run()}
                  disabled={busy || !file}
                  className="h-12 w-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-semibold text-white shadow-md"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Enhance
                    </>
                  )}
                </Button>

                {output && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-full border-white/50 bg-white/40 backdrop-blur dark:bg-white/5"
                      onClick={() => setViewerOpen(true)}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" /> View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-full border-white/50 bg-white/40 backdrop-blur dark:bg-white/5"
                      disabled={dlBusy}
                      onClick={() => void downloadResult()}
                    >
                      {dlBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInput} />
        </div>

        {output && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Ready
          </p>
        )}

        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-bold tracking-tight">How it works</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FLOW_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="relative rounded-2xl border border-white/50 bg-white/40 p-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                >
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-[12px] font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{s.desc}</p>
                  {i < FLOW_STEPS.length - 1 && (
                    <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-violet-400/50 sm:inline">
                      ···
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 space-y-2">
          <h2 className="text-sm font-bold tracking-tight">FAQs</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium">{item.q}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
                    />
                  </button>
                  {open && (
                    <p className="border-t border-white/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {output && (
        <AutoEditResultViewer
          src={output}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={() => void downloadResult()}
          downloadBusy={dlBusy}
        />
      )}
    </div>
  );
}
