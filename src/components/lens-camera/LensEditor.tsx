/**
 * Motio2edit Lens — live camera OR upload · Snapchat carousel · hold-to-compare.
 * Strong on-device optics · glassy · gold · light/dark · free.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Download,
  ImagePlus,
  Loader2,
  SwitchCamera,
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
  captureVideoFrame,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Phase = "live" | "ready" | "processing" | "result";

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

  const [phase, setPhase] = useState<Phase>("live");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [holdingOriginal, setHoldingOriginal] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("live");
    } catch {
      setCamError("Camera unavailable — upload a photo instead");
      setPhase("live");
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if (user && phase === "live" && !sourceUrl) {
      void startCamera();
    }
    return () => stopCamera();
  }, [user, facing]); // eslint-disable-line react-hooks/exhaustive-deps

  const goHome = useCallback(() => {
    stopCamera();
    void navigate({ to: "/", replace: true });
  }, [navigate, stopCamera]);

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setSourceUrl(URL.createObjectURL(file));
    setPhase("ready");
  };

  const clearToLive = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPhase("live");
    void startCamera();
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
    processingRef.current = true;
    setPhase("processing");
    try {
      const out = applyLensOpticalEnhanced(canvas, active, "native");
      const blob = await canvasToBlob(out, "image/jpeg", 0.94);
      // keep source as the pre-apply frame for hold-compare
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
      setPhase("result");
      toast.success(`${active.name} applied · free · hold image to see original`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
      setPhase(sourceUrl ? "ready" : "live");
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
    const active = lens;

    // Capture from live camera first
    if (phase === "live" && videoRef.current && streamRef.current) {
      const v = videoRef.current;
      if (!v.videoWidth) {
        toast.error("Camera not ready");
        return;
      }
      const frame = captureVideoFrame(v, facing === "user");
      stopCamera();
      await applyFromCanvas(frame, active);
      return;
    }

    if (!sourceUrl) {
      toast.error("Open camera or upload a photo first");
      return;
    }
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      await applyFromCanvas(canvas, active);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
    }
  };

  const selectLens = (id: string) => {
    setLensId(id);
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
          <p className="mt-2 text-sm text-muted-foreground">Sign in to use live camera lenses.</p>
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
  const displaySrc =
    showResult && !holdingOriginal ? resultUrl! : sourceUrl || resultUrl;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
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
            {lens.name} · free
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/40"
          aria-label="Flip camera"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-48 pt-16">
        {/* Live camera */}
        {phase === "live" && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-lg">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "mx-auto max-h-[min(62dvh,640px)] w-full object-cover",
                facing === "user" && "scale-x-[-1]",
              )}
            />
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/90 p-6 text-center">
                <Camera className="h-8 w-8 text-amber-400" />
                <p className="text-sm text-white/90">{camError}</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
                >
                  Upload photo
                </button>
              </div>
            )}
          </div>
        )}

        {(phase === "ready" || phase === "processing" || phase === "result") && displaySrc && (
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/5 bg-black/5 shadow-lg dark:border-white/10"
            onPointerDown={() => phase === "result" && setHoldingOriginal(true)}
            onPointerUp={() => setHoldingOriginal(false)}
            onPointerLeave={() => setHoldingOriginal(false)}
            onPointerCancel={() => setHoldingOriginal(false)}
          >
            <img
              src={displaySrc}
              alt={holdingOriginal ? "Original" : lens.name}
              className="mx-auto max-h-[min(62dvh,640px)] w-auto object-contain"
            />
            {phase === "result" && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] text-white backdrop-blur">
                {holdingOriginal ? "Original" : "Hold to see original"}
              </p>
            )}
            {phase !== "result" && (
              <button
                type="button"
                onClick={clearToLive}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur"
                aria-label="Back to camera"
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

        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/80 text-zinc-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white"
            aria-label="Upload photo"
          >
            <ImagePlus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void applyLens()}
            disabled={phase === "processing"}
            className="relative grid h-[72px] w-[72px] place-items-center rounded-full border-[3px] border-amber-500 bg-amber-500/20 shadow-[0_0_24px_rgba(217,119,6,0.25)] transition active:scale-90 disabled:opacity-40"
            aria-label="Capture and apply lens"
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
            <button
              type="button"
              onClick={clearToLive}
              className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/80 text-zinc-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white"
              aria-label="Live camera"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Live view · swipe lens · gold shutter · hold result for original
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
