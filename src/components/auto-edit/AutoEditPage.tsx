/**
 * Maluto AI Studio — premium one-tap intelligent photo restoration.
 * Glass UI · rotating taglines · Siri-inspired orb · Upload-then-Enhance.
 * 2MP normalize is internal only (not shown in customer chrome).
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
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarSrc } from "@/lib/avatar-presets";
import { pickMalutoTagline } from "@/lib/auto-edit/maluto-taglines";
import { Button } from "@/components/ui/button";
import { AutoEditBeforeAfter } from "@/components/auto-edit/AutoEditBeforeAfter";
import { MalutoPuzzleOverlay } from "@/components/auto-edit/MalutoPuzzleOverlay";
import { useAuth } from "@/lib/auth";
import { runStandaloneAutoEdit } from "@/lib/auto-edit/auto-edit.functions";
import {
  AUTO_EDIT_PRODUCT_NAME,
  AUTO_EDIT_PRODUCT_VERSION,
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
  const [tagline, setTagline] = useState(() => pickMalutoTagline());
  const [reduceMotion, setReduceMotion] = useState(false);
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

  const avatarSrc = resolveAvatarSrc(
    (profile as { avatar_url?: string | null } | null)?.avatar_url,
    (profile as { avatar_signed_url?: string | null } | null)?.avatar_signed_url,
    { nameOrEmail: displayName, userId: user?.id },
  );

  useEffect(() => {
    setQuality(defaultAutoEditQualityForPlan(plan));
  }, [plan]);

  useEffect(() => {
    try {
      setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (preview || busy || output) return;
    const t = window.setInterval(() => setTagline(pickMalutoTagline()), 4200);
    return () => window.clearInterval(t);
  }, [preview, busy, output]);

  const clear = useCallback(() => {
    if (busy) return;
    setFile(null);
    setPreview(null);
    setOutput(null);
    setStageIdx(0);
    setNormInfo(null);
    setResultMeta(null);
    setTagline(pickMalutoTagline());
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
          setNormInfo(`Optimized · ${norm.width}×${norm.height}`);
        } else {
          setNormInfo(`${norm.width}×${norm.height} · ready`);
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
      <div className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,90,31,0.14),_transparent_50%)]"
          aria-hidden
        />
        <h1 className="bg-gradient-to-r from-violet-500 via-[#FF5A1F] to-cyan-500 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
          {AUTO_EDIT_PRODUCT_NAME}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to restore one photograph.</p>
        <Link
          to="/auth"
          search={{ redirect: "/studio/image/auto-edit" }}
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-violet-600 via-[#FF5A1F] to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,90,31,0.10),_transparent_50%)]"
        aria-hidden
      />

      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-border/40 bg-background/75 px-3 py-2.5 backdrop-blur-xl sm:gap-3">
        <button
          type="button"
          onClick={() => void navigate({ to: "/", replace: true })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/50 bg-card/70 shadow-sm backdrop-blur"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
            <span className="bg-gradient-to-r from-violet-500 via-[#FF5A1F] to-cyan-500 bg-clip-text text-transparent">
              {AUTO_EDIT_PRODUCT_NAME}
            </span>
            <span className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-normal tracking-wide text-muted-foreground">
              v{AUTO_EDIT_PRODUCT_VERSION}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60",
                    !reduceMotion && "animate-ping",
                  )}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </h1>
        </div>
        <Link to="/profile" className="shrink-0" aria-label="Profile">
          <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
            <AvatarImage src={avatarSrc} alt="" />
            <AvatarFallback className="text-[11px] font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-3 sm:overflow-hidden sm:py-4">
        {!output && (
          <div className="w-full max-w-md shrink-0 text-center">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Intelligent photo restoration
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Upload a photograph. Maluto AI analyses and restores it with care.
            </p>
          </div>
        )}

        <div
          className={cn(
            "relative my-3 flex w-full max-w-md min-h-[220px] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-card/60 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/40",
            dragOver && "border-[#FF5A1F]/60 ring-2 ring-[#FF5A1F]/25",
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
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-5 py-8 text-center">
              {/* Siri-inspired orb */}
              <div className="relative grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-400/30 to-cyan-400/40 blur-2xl",
                    !reduceMotion && "animate-pulse",
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-400/50 via-[#FF5A1F]/40 to-violet-500/50 opacity-80 blur-md",
                    !reduceMotion && "animate-[spin_14s_linear_infinite]",
                  )}
                  aria-hidden
                />
                <div className="relative grid h-20 w-20 place-items-center rounded-full border border-white/25 bg-gradient-to-br from-white/30 via-white/10 to-transparent shadow-[0_0_40px_rgba(255,90,31,0.28)] backdrop-blur-md dark:from-white/15 sm:h-24 sm:w-24">
                  <Sparkles className="h-8 w-8 text-[#FF5A1F] drop-shadow sm:h-9 sm:w-9" />
                </div>
              </div>
              <div className="min-h-[2.75rem] max-w-[18rem] px-1">
                <p
                  key={tagline}
                  className={cn(
                    "text-sm font-medium leading-snug text-foreground/90 sm:text-[15px]",
                    !reduceMotion && "animate-in fade-in duration-700",
                  )}
                >
                  {tagline}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                JPG · PNG · WEBP · Maximum {MAX_MB} MB
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
                className="max-h-full max-w-full rounded-2xl object-contain"
                draggable={false}
              />
              {busy && (
                <MalutoPuzzleOverlay active={busy} stageIndex={stageIdx} previewUrl={preview} />
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-2 left-2 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow backdrop-blur"
                >
                  Replace Photo
                </button>
              )}
              {!busy && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-background/90 text-foreground shadow backdrop-blur"
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

        {preview && !output && !busy && (
          <div className="mb-2 grid w-full max-w-md grid-cols-2 gap-2">
            {qualityOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                className={cn(
                  "rounded-2xl border px-3 py-2.5 text-left transition backdrop-blur",
                  quality === opt.id
                    ? "border-[#FF5A1F]/70 bg-[#FF5A1F]/10 shadow-sm"
                    : "border-border/60 bg-card/50 hover:border-[#FF5A1F]/40",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      quality === opt.id ? "text-[#FF5A1F]" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {opt.credits} cr
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{opt.hint}</p>
              </button>
            ))}
          </div>
        )}

        {output && resultMeta && (
          <div className="mb-2 w-full max-w-md rounded-2xl border border-[#FF5A1F]/25 bg-[#FF5A1F]/5 px-3 py-2.5 backdrop-blur">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
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
            </dl>
          </div>
        )}

        {/* Actions — Upload when empty, Enhance when ready */}
        <div className="w-full max-w-md shrink-0 space-y-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {!output ? (
            !file ? (
              <Button
                className="h-12 w-full rounded-full border border-white/20 bg-gradient-to-r from-violet-600 via-[#FF5A1F] to-cyan-500 text-base font-semibold text-white shadow-lg shadow-[#FF5A1F]/25 transition hover:opacity-95"
                size="lg"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Your Photo
              </Button>
            ) : (
              <Button
                className="h-12 w-full rounded-full bg-gradient-to-r from-[#FF5A1F] to-orange-500 text-base font-semibold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 disabled:opacity-50"
                size="lg"
                disabled={busy}
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
            )
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={clear}>
                New photo
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-gradient-to-r from-[#FF5A1F] to-orange-500 text-white hover:opacity-95"
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
