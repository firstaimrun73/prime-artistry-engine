/**
 * Maluto AI Studio — one-tap intelligent photo restoration.
 * Viewport-locked: upload + short copy + Enhance.
 * 2MP auto-normalize · HD only · zero retries · credit balance in header.
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
import { ArrowLeft, Download, Loader2, Upload, X } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const runLock = useRef(false);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const credits = Number((profile as { credits?: number } | null)?.credits ?? 0);
  const qualityOptions = useMemo(() => autoEditQualitiesForPlan(plan), [plan]);
  const [quality, setQuality] = useState<AutoEditQuality>(() =>
    defaultAutoEditQualityForPlan(plan),
  );
  const isAdmin = isAdminEmail(user?.email);
  const creditCost = autoEditCreditCost(quality);

  const avatarUrl =
    (user as { user_metadata?: { avatar_url?: string; picture?: string } } | null)
      ?.user_metadata?.avatar_url ||
    (user as { user_metadata?: { picture?: string } } | null)?.user_metadata?.picture ||
    (profile as { avatar_url?: string | null } | null)?.avatar_url ||
    null;
  const displayName =
    (user as { user_metadata?: { full_name?: string; name?: string } } | null)?.user_metadata
      ?.full_name ||
    (user as { user_metadata?: { name?: string } } | null)?.user_metadata?.name ||
    user?.email ||
    "User";

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
        setStageIdx(0);
        if (norm.resized) {
          setNormInfo(`Optimized to ${norm.width}×${norm.height} for best quality`);
        } else {
          setNormInfo(null);
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
    setStageIdx(0);
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
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 sm:gap-3">
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
          <h1 className="truncate text-base font-bold tracking-tight">
            {AUTO_EDIT_PRODUCT_NAME}
          </h1>
        </div>
        <div className="hidden shrink-0 flex-col items-end sm:flex">
          <span className="text-[10px] font-medium text-muted-foreground">Your Balance</span>
          <span className="text-xs font-bold tabular-nums text-foreground">
            {isAdmin ? "∞" : credits} Credits
          </span>
        </div>
        <div className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          Cost: {creditCost}
        </div>
        <div
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-[11px] font-bold text-foreground"
          title={displayName}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            avatarInitials(
              (user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name,
              user.email,
            )
          )}
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5 text-[11px] sm:hidden">
        <span className="text-muted-foreground">
          Balance: <strong className="text-foreground">{isAdmin ? "∞" : credits}</strong>
        </span>
        <span className="text-muted-foreground">
          Enhancement: <strong className="text-foreground">{creditCost} credits</strong>
        </span>
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-between px-4 py-3 sm:py-5">
        <div className="w-full max-w-md shrink-0 text-center">
          <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Let&apos;s solve your picture in one click.
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Upload your photograph. Maluto AI will understand, analyze and restore it
            intelligently.
          </p>
        </div>

        <div
          className={cn(
            "relative my-3 flex w-full max-w-md min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/80",
            dragOver && "ring-2 ring-[#FF5A1F]/40",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {!preview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F]">
                <Upload className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold">Drop or tap to upload</p>
              <p className="text-xs text-muted-foreground">JPG · PNG · WEBP · max 25MB</p>
            </button>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
              {output && preview ? (
                <AutoEditBeforeAfter before={preview} after={output} />
              ) : (
                <img
                  src={preview}
                  alt="Upload preview"
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              )}
              {busy && (
                <MalutoPuzzleOverlay active={busy} stageIndex={stageIdx} previewUrl={preview} />
              )}
              {!busy && !output && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow"
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

        {normInfo && !output && (
          <p className="mb-1 text-center text-[10px] text-muted-foreground">{normInfo}</p>
        )}

        <div className="w-full max-w-md shrink-0 space-y-2.5 pb-[env(safe-area-inset-bottom)]">
          {preview && !output && qualityOptions.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuality(opt.id)}
                  disabled={busy}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                    quality === opt.id
                      ? "border-[#FF5A1F] bg-[#FF5A1F]/15 text-[#FF5A1F]"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {!output ? (
            <Button
              className="h-12 w-full rounded-full bg-[#FF5A1F] text-base font-bold text-white shadow-lg hover:bg-[#e04e1a] disabled:opacity-50"
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
                "Enhance"
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
