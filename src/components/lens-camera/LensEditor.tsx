/**
 * Motio2edit Lens — software optical enhancement (image upload).
 * Snapchat-style lens carousel + shutter apply.
 * Glassy UI · gold accent · light & dark mode.
 * Free · on-device canvas processing (no live-camera dependency).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  getDefaultCameraLens,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Phase = "idle" | "ready" | "processing" | "result";

/** Circle chip colors per lens (name + bg + text) — Motio2edit originals. */
const LENS_CHIP: Record<string, { bg: string; text: string }> = {
  lens_widevista: { bg: "#1e3a5f", text: "#e8f1ff" },
  lens_ultrawide_horizon: { bg: "#0f4c5c", text: "#d8f3f0" },
  lens_fisheye_orbit: { bg: "#3b1f6e", text: "#f0e7ff" },
  lens_natural_frame: { bg: "#2d3436", text: "#f5f6fa" },
  lens_portrait_bloom: { bg: "#6d214f", text: "#ffe8f3" },
  lens_cinematic_compress: { bg: "#1b1464", text: "#e8e6ff" },
  lens_farreach: { bg: "#0c2461", text: "#dfe6ff" },
  lens_microreveal: { bg: "#006266", text: "#e0fffc" },
  lens_miniature_shift: { bg: "#b71540", text: "#ffe8ee" },
  lens_architect_align: { bg: "#1e272e", text: "#ecf0f1" },
  lens_dreamsoft: { bg: "#4a69bd", text: "#eef3ff" },
  lens_glowmist: { bg: "#574b90", text: "#f3efff" },
  lens_starflare: { bg: "#c44569", text: "#fff0f5" },
  lens_prism_echo: { bg: "#574b90", text: "#f5f0ff" },
  lens_swirl_depth: { bg: "#303952", text: "#eef0f8" },
  lens_vintage_halation: { bg: "#84817a", text: "#faf8f2" },
  lens_infraglow: { bg: "#2c2c54", text: "#f0eef8" },
  lens_longglass_detail: { bg: "#b33939", text: "#fff0f0" },
  lens_perspective_stretch: { bg: "#218c74", text: "#e8fff8" },
  lens_selective_focus: { bg: "#cd6133", text: "#fff5ee" },
};

function chipStyle(id: string) {
  return LENS_CHIP[id] ?? { bg: "#b8860b", text: "#fff8e7" };
}

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

  const [lensId, setLensId] = useState(() => initialLensId || getDefaultCameraLens().id);
  const lens = useMemo(() => getCameraLensById(lensId) ?? getDefaultCameraLens(), [lensId]);

  useEffect(() => {
    if (initialLensId && getCameraLensById(initialLensId)) setLensId(initialLensId);
  }, [initialLensId]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const goHome = useCallback(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setSourceUrl(URL.createObjectURL(file));
    setPhase("ready");
  };

  const clear = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPhase("idle");
  };

  const applyLens = async (target?: CameraLensDef) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    if (!sourceUrl || processingRef.current) return;
    const active = target ?? lens;
    processingRef.current = true;
    setPhase("processing");
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0);
      const out = applyLensOpticalEnhanced(canvas, active, "native");
      const blob = await canvasToBlob(out, "image/jpeg", 0.94);
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPhase("result");
      toast.success(`${active.name} applied · free`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
      setPhase("ready");
    } finally {
      processingRef.current = false;
    }
  };

  const selectLens = (id: string) => {
    setLensId(id);
    // Snap to center in carousel
    const el = carouselRef.current?.querySelector(`[data-lens-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const download = async () => {
    if (!resultUrl) return;
    try {
      await triggerBrowserDownload(
        resultUrl,
        `motio2edit-${lens.name.replace(/\s+/g, "-").toLowerCase()}.jpg`,
      );
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
          <p className="mt-2 text-sm text-muted-foreground">Sign in to enhance photos with Motio2edit lenses.</p>
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

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Top bar — glassy */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goHome}
          className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/40"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium tracking-[0.16em] text-amber-700/80 dark:text-amber-400/70">
            MOTIO2EDIT
          </span>
          <span className="text-sm font-bold tracking-tight">Lens</span>
          <span className="text-[10px] text-muted-foreground">
            {lens.name} · enhance · free
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-44 pt-16">
        {phase === "idle" && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-dashed border-amber-600/40 bg-white/60 px-6 py-16 text-center shadow-sm backdrop-blur-xl dark:border-amber-400/30 dark:bg-white/5"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <ImagePlus className="h-7 w-7" />
            </span>
            <p className="text-sm font-semibold">Upload a photo</p>
            <p className="text-xs text-muted-foreground">Apply a Motio2edit lens · on-device · free</p>
          </button>
        )}

        {(phase === "ready" || phase === "processing" || phase === "result") && sourceUrl && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/5 bg-black/5 shadow-lg dark:border-white/10">
            <img
              src={phase === "result" && resultUrl ? resultUrl : sourceUrl}
              alt={lens.name}
              className="mx-auto max-h-[min(62dvh,640px)] w-auto object-contain"
            />
            {phase !== "result" && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {phase === "processing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm font-medium text-white">Applying {lens.name}…</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom: Snapchat-style lens carousel + shutter */}
      <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-zinc-100 via-zinc-100/95 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 dark:from-zinc-950 dark:via-zinc-950/95">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none"
          style={{ scrollSnapType: "x mandatory" }}
          role="listbox"
          aria-label="Lenses"
        >
          {CAMERA_LENS_ROSTER.map((l) => {
            const active = l.id === lensId;
            const colors = chipStyle(l.id);
            return (
              <button
                key={l.id}
                type="button"
                data-lens-id={l.id}
                role="option"
                aria-selected={active}
                onClick={() => selectLens(l.id)}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
                style={{ scrollSnapAlign: "center" }}
              >
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-full border-2 text-[10px] font-bold uppercase tracking-wide transition",
                    active
                      ? "scale-110 border-amber-500 shadow-[0_0_16px_rgba(217,119,6,0.45)]"
                      : "border-transparent opacity-80",
                  )}
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {l.name.slice(0, 2).toUpperCase()}
                </span>
                <span
                  className={cn(
                    "max-w-[72px] truncate text-center text-[10px] font-medium",
                    active ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
                  )}
                >
                  {l.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/80 text-zinc-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white"
            aria-label="Choose photo"
          >
            <ImagePlus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void applyLens()}
            disabled={phase === "processing" || !sourceUrl}
            className="relative grid h-[72px] w-[72px] place-items-center rounded-full border-[3px] border-amber-500 bg-amber-500/20 shadow-[0_0_24px_rgba(217,119,6,0.25)] transition active:scale-90 disabled:opacity-40"
            aria-label="Apply lens"
          >
            <span className="h-[58px] w-[58px] rounded-full bg-gradient-to-br from-amber-400 to-amber-700" />
          </button>

          {phase === "result" && resultUrl ? (
            <button
              type="button"
              onClick={() => void download()}
              className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/80 text-zinc-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-11 w-11" />
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Swipe lenses · tap gold shutter to apply · free on-device
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
