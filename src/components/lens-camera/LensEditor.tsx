/**
 * Motio2edit Lens — image upload only.
 * Default selected effect = NONE (original stays unchanged until user picks a lens).
 * Preview on select · full apply on shutter · back → homepage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Download, ImagePlus, Loader2, X } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Phase = "idle" | "ready" | "processing" | "result";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

type Props = { initialLensId?: string | null };

export function LensEditor({ initialLensId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Default = NONE. Only set if deep-link provides a valid lens id.
  const [lensId, setLensId] = useState<string | null>(() =>
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : null,
  );
  const lens: CameraLensDef | null = useMemo(
    () => (lensId ? getCameraLensById(lensId) ?? null : null),
    [lensId],
  );

  useEffect(() => {
    if (initialLensId && getCameraLensById(initialLensId)) setLensId(initialLensId);
  }, [initialLensId]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [holdingOriginal, setHoldingOriginal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const previewBusy = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const goHome = useCallback(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  // Preview only when a lens is explicitly selected.
  useEffect(() => {
    if (!sourceUrl || !lens || phase === "processing" || phase === "idle") {
      if (!lens && previewUrl) {
        if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (previewBusy.current) return;
      previewBusy.current = true;
      try {
        const img = await loadImage(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(img.naturalWidth, 960);
        canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = applyLensOpticalEnhanced(canvas, lens, "native");
        const blob = await canvasToBlob(out, "image/jpeg", 0.82);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        /* ignore */
      } finally {
        previewBusy.current = false;
      }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, sourceUrl, phase]);

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setResultUrl(null);
    setPreviewUrl(null);
    // Keep original unchanged — do not auto-select a lens.
    setSourceUrl(URL.createObjectURL(file));
    setPhase("ready");
  };

  const clear = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPreviewUrl(null);
    setLensId(null);
    setPhase("idle");
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
    processingRef.current = true;
    setPhase("processing");
    try {
      const out = applyLensOpticalEnhanced(canvas, active, "native");
      const blob = await canvasToBlob(out, "image/jpeg", 0.94);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);
      setSourceUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return srcUrl;
      });
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPreviewUrl(null);
      setPhase("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
      setPhase(sourceUrl ? "ready" : "idle");
    } finally {
      processingRef.current = false;
    }
  };

  const applyLens = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    if (processingRef.current) return;
    if (!sourceUrl) {
      inputRef.current?.click();
      return;
    }
    if (!lens) {
      toast.message("Select a lens first");
      return;
    }
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      await applyFromCanvas(canvas, lens);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
    }
  };

  const selectLens = (id: string) => {
    setLensId((prev) => (prev === id ? null : id));
    const el = carouselRef.current?.querySelector(`[data-lens-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const download = async () => {
    if (!resultUrl) return;
    try {
      const name = (lens?.name ?? "lens").replace(/\s+/g, "-").toLowerCase();
      await triggerBrowserDownload(resultUrl, `motio2edit-${name}.jpg`);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Lens</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to apply lenses on your photos.</p>
          <Link
            to="/auth"
            search={{ redirect: "/studio/image/lens-editor" }}
            className="mt-6 inline-flex rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  const showResult = phase === "result" && resultUrl;
  const stillSrc =
    showResult && !holdingOriginal
      ? resultUrl!
      : previewUrl && phase === "ready" && lens
        ? previewUrl
        : sourceUrl;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goHome}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-white/55 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="rounded-full border border-white/30 bg-white/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-800/90 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-amber-300/90">
            MOTIO2EDIT
          </span>
          <span className="mt-1 text-sm font-bold tracking-tight drop-shadow-sm">
            {lens?.name ?? "Lens"}
          </span>
          <span className="max-w-[220px] truncate text-center text-[11px] text-zinc-600/90 dark:text-zinc-300/80">
            {lens?.shortDescription ?? "Select a lens · original stays clean"}
          </span>
        </div>
        <div className="w-10" aria-hidden />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-48 pt-16">
        {phase === "idle" && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-white/50 bg-white/45 px-6 py-16 text-center shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/20 text-amber-700 dark:text-amber-300">
              <ImagePlus className="h-7 w-7" />
            </span>
            <p className="text-sm font-semibold">Upload a photo</p>
            <p className="text-xs text-muted-foreground">Original stays unchanged until you pick a lens</p>
          </button>
        )}

        {(phase === "ready" || phase === "processing" || phase === "result") && stillSrc && (
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/40 bg-black/5 shadow-xl backdrop-blur-sm dark:border-white/10"
            onPointerDown={() => phase === "result" && setHoldingOriginal(true)}
            onPointerUp={() => setHoldingOriginal(false)}
            onPointerLeave={() => setHoldingOriginal(false)}
            onPointerCancel={() => setHoldingOriginal(false)}
          >
            <img
              src={stillSrc}
              alt={holdingOriginal ? "Original" : lens?.name ?? "Photo"}
              className="mx-auto max-h-[min(62dvh,640px)] w-auto object-contain"
            />
            {phase === "result" && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[10px] text-white backdrop-blur-md">
                {holdingOriginal ? "Original" : "Hold to see original"}
              </p>
            )}
            {phase === "ready" && !lens && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] text-white/90 backdrop-blur-md">
                Original · tap a lens to preview
              </p>
            )}
            {phase === "ready" && lens && previewUrl && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] text-white/90 backdrop-blur-md">
                Preview · shutter to commit
              </p>
            )}
            {phase !== "result" && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {phase === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm font-medium text-white">{lens?.name ?? "Processing"}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-zinc-100 via-zinc-100/90 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 dark:from-zinc-950 dark:via-zinc-950/90">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none"
          style={{ scrollSnapType: "x mandatory" }}
          role="listbox"
          aria-label="Lenses"
        >
          {CAMERA_LENS_ROSTER.map((l) => {
            const active = l.id === lensId;
            return (
              <button
                key={l.id}
                type="button"
                data-lens-id={l.id}
                role="option"
                aria-selected={active}
                onClick={() => selectLens(l.id)}
                className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
                style={{ scrollSnapAlign: "center" }}
              >
                <span
                  className={cn(
                    "grid h-[52px] w-[52px] place-items-center rounded-full text-[12px] font-bold text-white shadow-md transition",
                    active
                      ? "scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950"
                      : "opacity-90",
                  )}
                  style={{
                    background: `linear-gradient(145deg, ${l.color}ee, ${l.color})`,
                    boxShadow: active
                      ? `0 0 16px ${l.color}88`
                      : `0 4px 12px ${l.color}44`,
                  }}
                >
                  {l.code}
                </span>
                <span
                  className={cn(
                    "max-w-[76px] truncate rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold backdrop-blur-md",
                    active
                      ? "border border-white/40 bg-white/55 text-amber-900 dark:border-white/15 dark:bg-white/10 dark:text-amber-200"
                      : "text-muted-foreground",
                  )}
                >
                  {l.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/50 bg-white/60 text-zinc-700 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white"
            aria-label="Upload photo"
          >
            <ImagePlus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void applyLens()}
            disabled={phase === "processing" || !lens}
            className="relative grid h-[76px] w-[76px] place-items-center rounded-full transition active:scale-90 disabled:opacity-40"
            aria-label="Apply lens"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,220,120,0.55), rgba(245,158,11,0.35))",
              boxShadow:
                "0 0 0 3px rgba(251,191,36,0.95), 0 0 28px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.65)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              className="h-[58px] w-[58px] rounded-full"
              style={{
                background:
                  "linear-gradient(160deg, #fde68a 0%, #fbbf24 40%, #d97706 100%)",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,0.55), inset 0 -2px 6px rgba(146,64,14,0.35)",
              }}
            />
          </button>

          {phase === "result" && resultUrl ? (
            <button
              type="button"
              onClick={() => void download()}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/50 bg-white/60 text-zinc-700 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-11 w-11" aria-hidden />
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Upload · pick lens · shutter · free · back = home
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
