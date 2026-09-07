/**
 * Motio2edit Lens — Pass 10
 * Live camera · live preview on swipe (cheap client optics) · full apply on shutter
 * Badge carousel (code+color) · free · no apply toast · no duplicate upload by shutter
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Download,
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Cheap CSS approx for live-camera preview while swiping (not full apply). */
function liveCssForLens(id: string): string {
  switch (id) {
    case "lens_widevista":
    case "lens_perspective_stretch":
      return "contrast(1.08) saturate(1.1)";
    case "lens_ultrawide_horizon":
      return "contrast(1.12) saturate(1.15) brightness(1.03)";
    case "lens_fisheye_orbit":
      return "contrast(1.1) saturate(1.2)";
    case "lens_portrait_bloom":
      return "brightness(1.06) contrast(1.05) saturate(1.1) blur(0.3px)";
    case "lens_cinematic_compress":
      return "contrast(1.2) saturate(0.88) brightness(0.95)";
    case "lens_vintage_halation":
      return "sepia(0.35) contrast(1.08) brightness(1.04)";
    case "lens_infraglow":
      return "hue-rotate(90deg) saturate(1.3)";
    case "lens_dreamsoft":
      return "brightness(1.12) blur(0.6px)";
    case "lens_glowmist":
      return "brightness(1.1) contrast(0.95) saturate(1.05)";
    case "lens_starflare":
      return "brightness(1.15) contrast(1.1)";
    case "lens_natural_frame":
    case "lens_longglass_detail":
      return "contrast(1.12) saturate(1.05)";
    default:
      return "contrast(1.06) saturate(1.04)";
  }
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [holdingOriginal, setHoldingOriginal] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const previewBusy = useRef(false);
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
      setCamError("Camera unavailable — use gallery from the camera icon when needed");
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

  /** Live optical preview when a still source is available and lens changes. */
  useEffect(() => {
    if (!sourceUrl || phase === "processing" || phase === "live") return;
    let cancelled = false;
    const run = async () => {
      if (previewBusy.current) return;
      previewBusy.current = true;
      try {
        const img = await loadImage(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(img.naturalWidth, 960);
        canvas.height = Math.round(
          (canvas.width / img.naturalWidth) * img.naturalHeight,
        );
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
        /* ignore preview errors */
      } finally {
        previewBusy.current = false;
      }
    };
    const t = window.setTimeout(() => void run(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lens, sourceUrl, phase]);

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setResultUrl(null);
    setPreviewUrl(null);
    setSourceUrl(URL.createObjectURL(file));
    setPhase("ready");
  };

  const clearToLive = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPreviewUrl(null);
    setPhase("live");
    void startCamera();
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
      // No toast — Pass 10
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
      toast.error("Open camera first");
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
  const stillSrc =
    showResult && !holdingOriginal
      ? resultUrl!
      : previewUrl && phase === "ready"
        ? previewUrl
        : sourceUrl;

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
          <span className="max-w-[200px] truncate text-center text-[10px] text-muted-foreground">
            {lens.shortDescription}
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
              style={{ filter: liveCssForLens(lensId) }}
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
                  Choose photo
                </button>
              </div>
            )}
          </div>
        )}

        {(phase === "ready" || phase === "processing" || phase === "result") && stillSrc && (
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/5 bg-black/5 shadow-lg dark:border-white/10"
            onPointerDown={() => phase === "result" && setHoldingOriginal(true)}
            onPointerUp={() => setHoldingOriginal(false)}
            onPointerLeave={() => setHoldingOriginal(false)}
            onPointerCancel={() => setHoldingOriginal(false)}
          >
            <img
              src={stillSrc}
              alt={holdingOriginal ? "Original" : lens.name}
              className="mx-auto max-h-[min(62dvh,640px)] w-auto object-contain"
            />
            {phase === "result" && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] text-white backdrop-blur">
                {holdingOriginal ? "Original" : "Hold to see original"}
              </p>
            )}
            {phase === "ready" && previewUrl && (
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[10px] text-white/90 backdrop-blur">
                Live preview · shutter for full
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
                <p className="text-sm font-medium text-white">{lens.name}</p>
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
                    "lens-badge grid h-[52px] w-[52px] place-items-center rounded-full text-[13px] font-semibold text-white transition",
                    active
                      ? "scale-110 ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950"
                      : "opacity-85",
                  )}
                  style={{ background: l.color }}
                >
                  {l.code}
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

        {/* Shutter only — no duplicate upload icon (Pass 10 §6.1) */}
        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={clearToLive}
            className="grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white/80 text-zinc-700 backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-white"
            aria-label="Live camera"
          >
            <Camera className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void applyLens()}
            disabled={phase === "processing"}
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
            <div className="h-11 w-11" aria-hidden />
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Swipe for live preview · shutter for full · free
        </p>
      </div>

      {/* Hidden file input only for camera-denied fallback */}
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
