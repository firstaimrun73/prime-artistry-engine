/**
 * Maluto AI Studio — premium one-tap intelligent photo restoration.
 * 2MP auto-normalize · SD/HD · zero retries · progress + result summary.
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
  CheckCircle2,
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoEditBeforeAfter } from "@/components/auto-edit/AutoEditBeforeAfter";
import { MalutoPuzzleOverlay } from "@/components/auto-edit/MalutoPuzzleOverlay";
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
  getAutoEditQualityOption,
} from "@/lib/auto-edit/auto-edit.quality";
import { isAdminEmail } from "@/lib/admin-config";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import { normalizeImageTo2MP } from "@/lib/auto-edit/normalize-image";
import { cn } from "@/lib/utils";

const MAX_MB = 25;

function isAcceptableImageFile(file: File): boolean {
  const ok =
    /image\/(jpeg|jpg|png|webp)/i.test(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name);
  return ok && file.size <= MAX_MB * 1024 * 1024;
}

function avatarInitials(name?: string | null, email?: string | null): string {
  const s = (name || email || "U").trim();
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

type ResultMeta = {
  quality: AutoEditQuality;
  creditsCharged: number;
  completedAt: Date;
  durationMs: number;
  normLabel: string | null;
};

export function AutoEditPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const runEdit = useServerFn(runStandaloneAutoEdit);
  const secureDl = useServerFn(secureDownloadImage);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [normInfo, setNormInfo] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const runLock = useRef(false);
  const startedAt = useRef<number>(0);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const credits = Number((profile as { credits?: number } | null)?.credits ?? 0);
  const qualityOptions = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() =>
    defaultAutoEditQualityForPlan(plan),
  );
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);
  const qualityOpt = getAutoEditQualityOption(quality);

  const displayName =
    (user as { user_metadata?: { full_name?: string; name?: string } } | null)?.user_metadata
      ?.full_name ||
    (user as { user_metadata?: { name?: string } } | null)?.user_metadata?.name ||
    user?.email ||
    "User";

  const initials = avatarInitials(
    (user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name,
    user?.email,
  );

  useEffect(() => {
    setQuality(defaultAutoEditQualityForPlan(plan));
  }, [plan]);

  const clear = useCallback(() => {
    if (busy) return;
    setFile(null);
    setPreview(null);
    setOutput(null);
    setStageIdx(0);
    setNormInfo(null);
    setResultMeta(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [busy]);

  const onPick = useCallback(
    async (f: File | null) => {
      if (!f || busy) return;
      if (!isAcceptableImageFile(f)) {
        toast.error("Please choose a JPG, PNG, or WEBP under 25MB.");
        return;
      }
      try {
        const norm = await normalizeImageTo2MP(f);
        setFile(norm.file);
        setOutput(null);
        setResultMeta(null);
        setStageIdx(0);
        if (norm.resized) {
          setNormInfo(`Auto-optimized to ${norm.width}×${norm.height} (2MP max)`);
        } else {
          setNormInfo(`${norm.width}×${norm.height} · ready for Maluto AI`);
        }
        const url = URL.createObjectURL(norm.file);
        setPreview((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        toast.error("Could not process this image. Try another photo.");
      }
    },
    [busy],
  );

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    void onPick(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const run = async () => {
    if (runLock.current || busy) return;
    if (!user) {
      toast.error("Sign in required");
      return;
    }
    if (!file) {
      toast.error("Upload a photograph first");
      return;
    }
    if (!isAdmin && credits < creditCost) {
      toast.error(`Not enough credits. Need ${creditCost}, you have ${credits}.`);
      return;
    }
    runLock.current = true;
    setBusy(true);
    setOutput(null);
    setResultMeta(null);
    setStageIdx(0);
    startedAt.current = Date.now();
    try {
      setStageIdx(0);
      const uploaded = await uploadToStorage(file, user.id);
      setStageIdx(1);
      setStageIdx(2);
      const result = await runEdit({
        data: {
          imageUrl: uploaded,
          imageQuality: quality,
        },
      });
      setStageIdx(4);
      const outUrl =
        (result as { outputUrl?: string })?.outputUrl ||
        (result as { url?: string })?.url ||
        null;
      if (!outUrl) throw new Error("No output returned");
      setStageIdx(5);
      setOutput(outUrl);
      const charged =
        typeof (result as { creditsCharged?: number })?.creditsCharged === "number"
          ? (result as { creditsCharged: number }).creditsCharged
          : isAdmin
            ? 0
            : creditCost;
      setResultMeta({
        quality,
        creditsCharged: charged,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.current,
        normLabel: normInfo,
      });
      toast.success("Restoration complete");
      void refreshProfile?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enhancement failed");
      setStageIdx(0);
      void refreshProfile?.();
    } finally {
      setBusy(false);
      runLock.current = false;
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
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-background px-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF5A1F]">
          Motio2edit
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {AUTO_EDIT_PRODUCT_NAME}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to enhance one photo.</p>
        <Link
          to="/auth"
          search={{ redirect: "/studio/image/auto-edit" }}
          className="mt-6 inline-flex rounded-full bg-[#FF5A1F] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border/80 bg-card/40 px-3 py-2.5 backdrop-blur-sm sm:gap-3">
        <button
          type="button"
          onClick={() => void navigate({ to: "/", replace: true })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio<span className="text-[#FF5A1F]">2</span>edit
          </p>
          <h1 className="flex items-center gap-1.5 truncate text-base font-bold tracking-tight">
            {AUTO_EDIT_PRODUCT_NAME}
            <span className="inline-flex items-center gap-1 rounded-full border border-[#FF5A1F]/35 bg-[#FF5A1F]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#FF5A1F]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF5A1F] opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF5A1F]" />
              </span>
              Live
            </span>
          </h1>
        </div>

        <div className="hidden shrink-0 flex-col items-end sm:flex">
          <span className="text-[10px] font-medium text-muted-foreground">
            {isAdmin ? "Admin" : "Balance"}
          </span>
          <span className="text-xs font-bold tabular-nums text-foreground">
            {isAdmin ? "Unlimited" : `${credits} credits`}
          </span>
        </div>

        <div className="shrink-0 rounded-full border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF5A1F]">
          {creditCost} credits
        </div>

        {/* Initials only — never Google profile photo in Studio */}
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
            isAdmin
              ? "border-[#FF5A1F]/50 bg-[#FF5A1F]/15 text-[#FF5A1F]"
              : "border-border bg-muted text-foreground",
          )}
          title={isAdmin ? "Admin" : displayName}
          aria-label={isAdmin ? "Admin account" : displayName}
        >
          {isAdmin ? (
            <Sparkles className="h-4 w-4" aria-hidden />
          ) : (
            initials
          )}
        </div>
      </header>

      {/* Mobile credit strip */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-1.5 text-[11px] sm:hidden">
        <span className="text-muted-foreground">
          {isAdmin ? (
            <>
              Admin · <strong className="text-foreground">Unlimited</strong>
            </>
          ) : (
            <>
              Balance: <strong className="text-foreground">{credits}</strong>
            </>
          )}
        </span>
        <span className="text-muted-foreground">
          Cost: <strong className="text-[#FF5A1F]">{creditCost} credits</strong>
        </span>
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-3 sm:overflow-hidden sm:py-4">
        {!output && (
          <div className="w-full max-w-md shrink-0 text-center">
            <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
              Let&apos;s solve your picture in one click.
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Upload a photograph. Maluto AI will understand, analyze, and restore it
              intelligently.
            </p>
          </div>
        )}

        {/* Upload / preview / result panel */}
        <div
          className={cn(
            "relative my-3 flex w-full max-w-md min-h-[200px] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-card/90 shadow-sm dark:bg-card/60",
            dragOver ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30" : "border-border",
            output && "flex-none",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!output && !busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!output && !busy) onDrop(e);
          }}
        >
          {!preview ? (
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#FF5A1F]/12 text-[#FF5A1F] shadow-inner">
                <Upload className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-bold">Upload Your Photograph</p>
                <p className="mt-1 max-w-[16rem] text-xs leading-snug text-muted-foreground">
                  Choose a photograph and let Maluto AI understand and restore it.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-1 h-10 rounded-full bg-[#FF5A1F] px-6 text-sm font-bold text-white hover:bg-[#e04e1a]"
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                Choose Photo
              </Button>
              <p className="text-[11px] text-muted-foreground">
                JPG · PNG · WEBP · max {MAX_MB}MB · auto 2MP normalize
              </p>
            </div>
          ) : output && preview ? (
            <div className="w-full p-2 sm:p-3">
              <AutoEditBeforeAfter before={preview} after={output} />
            </div>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
              <img
                src={preview}
                alt="Upload preview"
                className="max-h-full max-w-full rounded-lg object-contain"
                draggable={false}
              />
              {busy && (
                <MalutoPuzzleOverlay active={busy} stageIndex={stageIdx} previewUrl={preview} />
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-2 left-2 rounded-full border border-border bg-background/95 px-2.5 py-1 text-[11px] font-semibold shadow"
                >
                  Replace Photo
                </button>
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={onInput}
          />
        </div>

        {normInfo && !output && !busy && (
          <p className="mb-1 text-center text-[10px] text-muted-foreground">{normInfo}</p>
        )}

        {/* Quality selector — always visible when photo ready and not complete */}
        {preview && !output && !busy && (
          <div className="mb-2 grid w-full max-w-md grid-cols-2 gap-2">
            {qualityOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  quality === opt.id
                    ? "border-[#FF5A1F] bg-[#FF5A1F]/10 shadow-sm"
                    : "border-border bg-card hover:border-[#FF5A1F]/40",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-sm font-extrabold",
                      quality === opt.id ? "text-[#FF5A1F]" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                    {opt.credits} cr
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{opt.hint}</p>
              </button>
            ))}
          </div>
        )}

        {/* Result summary */}
        {output && resultMeta && (
          <div className="mb-2 w-full max-w-md rounded-xl border border-[#FF5A1F]/25 bg-[#FF5A1F]/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#FF5A1F]" />
              Your photograph has been restored
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <div>
                Quality:{" "}
                <strong className="text-foreground">
                  {(qualityOpt?.label ?? resultMeta.quality).toUpperCase()}
                </strong>
              </div>
              <div>
                Credits:{" "}
                <strong className="text-foreground">
                  {isAdmin && resultMeta.creditsCharged === 0
                    ? "Admin · free"
                    : resultMeta.creditsCharged}
                </strong>
              </div>
              <div>
                Time:{" "}
                <strong className="text-foreground">
                  {resultMeta.completedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
              <div>
                Duration:{" "}
                <strong className="text-foreground">
                  {Math.max(1, Math.round(resultMeta.durationMs / 1000))}s
                </strong>
              </div>
              {resultMeta.normLabel && (
                <div className="col-span-2 truncate">
                  Processing: <strong className="text-foreground">{resultMeta.normLabel}</strong>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className="w-full max-w-md shrink-0 space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {!output ? (
            <Button
              className="h-12 w-full rounded-full bg-[#FF5A1F] text-base font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#e04e1a] disabled:opacity-50"
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
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Enhance · {creditCost} credits
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={clear}>
                New photo
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-[#FF5A1F] text-white hover:bg-[#e04e1a]"
                disabled={dlBusy}
                onClick={() => void downloadResult()}
              >
                {dlBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                Download
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
