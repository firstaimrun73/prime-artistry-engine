/**
 * Maluto AI — Auto Edit product page.
 * Glassy, minimal copy. Backend: runStandaloneAutoEdit (vision + FLUX Kontext).
 *
 * UI fixes (Sep 2026):
 * - No Motio2edit Header bar on this page
 * - Clean back + Maluto AI title only
 * - i-button floating credit cost (auto-hides)
 * - Full-width Enhance button
 * - Hide clear (X) after generation
 * - How Maluto AI Works visual flow
 * - FAQs section (no recent history)
 */
import { Link } from "@tanstack/react-router";
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

const PIPELINE = [
  "Upload",
  "Analyse",
  "Plan",
  "Generate",
  "Finish",
] as const;

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

function isAcceptableImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  );
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
  const [step, setStep] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const costTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const qualityOptions = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() =>
    defaultAutoEditQualityForPlan(plan),
  );
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);

  // Floating cost: show briefly when quality changes or user taps i
  const revealCost = useCallback(() => {
    setShowCost(true);
    if (costTimer.current) clearTimeout(costTimer.current);
    costTimer.current = setTimeout(() => setShowCost(false), 3500);
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
      // Plan step is implicit in the server pipeline; surface it briefly
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg backdrop-blur">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {AUTO_EDIT_PRODUCT_NAME}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to enhance one photo.
          </p>
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
      {/* No global Header on Maluto AI page */}
      <main className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {/* Clean page header: back + title only */}
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-white/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            aria-label="Home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight">
            {AUTO_EDIT_PRODUCT_NAME}
          </h1>
        </div>

        {/* Live pipeline strip */}
        <div className="mb-5 flex items-center justify-between gap-1 rounded-2xl border border-white/50 bg-white/40 px-3 py-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {PIPELINE.map((label, i) => {
            const done =
              step > i || (progress === 100 && i === PIPELINE.length - 1);
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
                <span className="text-[9px] font-medium text-muted-foreground">
                  {label}
                </span>
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
                {/* Hide clear (X) after generation — only show while no output */}
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

              {/* Quality pills + i-button credit cost */}
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

                {/* i button — never shows total balance, only job cost */}
                {!isAdmin && (
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      onClick={revealCost}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/40 bg-white/40 text-violet-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-violet-300"
                      aria-label="Show credit cost"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    {showCost && (
                      <div className="absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-full border border-violet-300/50 bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg animate-in fade-in zoom-in-95 duration-200">
                        {creditCost} credits
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

              {/* Full-width Enhance button */}
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
                  <div className="flex gap-2">
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
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onInput}
          />
        </div>

        {output && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Ready
          </p>
        )}

        {/* ── How Maluto AI Works ── */}
        <section className="mt-10">
          <h2 className="text-center text-sm font-bold tracking-tight text-foreground">
            How Maluto AI Works
          </h2>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            One photo in → intelligent analysis → polished result
          </p>

          <div className="relative mt-6 flex flex-col items-stretch gap-0 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
            {[
              {
                icon: Eye,
                title: "Analyse",
                desc: "Vision model studies the photo",
              },
              {
                icon: FileStack,
                title: "Filing",
                desc: "Issues & edit plan are structured",
              },
              {
                icon: Cloud,
                title: "Data server",
                desc: "Secure cloud GPU processes the edit",
              },
              {
                icon: Sparkles,
                title: "Output",
                desc: "Polished image is returned",
              },
            ].map((s, idx) => (
              <div
                key={s.title}
                className="relative flex flex-1 flex-col items-center"
              >
                {/* Curved dotted connector (desktop) */}
                {idx < 3 && (
                  <div
                    className="pointer-events-none absolute left-[calc(50%+28px)] top-7 hidden h-0.5 w-[calc(100%-56px)] sm:block"
                    aria-hidden
                  >
                    <svg
                      className="h-3 w-full overflow-visible"
                      viewBox="0 0 100 12"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 6 Q 50 -4 100 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="text-violet-400/70 dark:text-violet-500/50"
                      />
                    </svg>
                  </div>
                )}
                {/* Vertical dotted connector (mobile) */}
                {idx < 3 && (
                  <div
                    className="absolute left-1/2 top-[56px] h-6 w-px -translate-x-1/2 border-l border-dashed border-violet-400/60 sm:hidden"
                    aria-hidden
                  />
                )}

                <div className="z-10 grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-500/15 to-cyan-400/15 text-violet-600 shadow-sm backdrop-blur dark:border-violet-500/30 dark:text-violet-300">
                  <s.icon className="h-6 w-6" />
                </div>
                <p className="mt-2 text-xs font-bold text-foreground">{s.title}</p>
                <p className="mt-0.5 max-w-[110px] text-center text-[10px] leading-snug text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section className="mt-10 mb-8">
          <h2 className="mb-3 text-center text-sm font-bold tracking-tight">
            Maluto AI FAQs
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-white/50 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-xs font-semibold text-foreground">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-violet-500 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <p className="border-t border-white/30 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground dark:border-white/10">
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
