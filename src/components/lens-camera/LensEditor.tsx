/**
 * Motio2edit Lens — Snapchat-style camera UX.
 * Idle: dark canvas + glass upload / camera.
 * Ready: floating circular R2 lens previews (no names) + fixed shutter.
 * Brief iOS name chip on lens change only.
 * Header: MOTIO2EDIT only. Info (i) for name + credits.
 * Watermark ONLY on final download (never live/preview).
 * Camera (getUserMedia) + gallery upload share the same lenses.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Download,
  ImagePlus,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  isAiLens,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
  captureVideoFrame,
} from "@/lib/lens-camera/optical-engine";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

function playShutterClick() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    window.setTimeout(() => void ctx.close(), 200);
  } catch {
    /* ignore */
  }
}

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
  const [nameChip, setNameChip] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [shutterClosed, setShutterClosed] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const previewBusy = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const nameChipTimer = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const sampleCards = useMemo(() => getLensSampleCards(), []);
  const sampleByLensId = useMemo(() => {
    const m = new Map<string, string>();
    sampleCards.forEach((c) => m.set(c.lensId, c.imageUrl));
    return m;
  }, [sampleCards]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const goHome = useCallback(() => {
    stopCamera();
    void navigate({ to: "/", replace: true });
  }, [navigate, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setSourceUrl(null);
      setResultUrl(null);
      setPreviewUrl(null);
      setPhase("ready");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      toast.error(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied"
          : "Could not open camera",
      );
      setCameraOn(false);
    }
  }, [stopCamera, sourceUrl, resultUrl, previewUrl]);

  useEffect(() => {
    if (cameraOn || !sourceUrl || !lens || phase === "processing" || phase === "idle" || phase === "result") {
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
        const out = applyLensOpticalEnhanced(canvas, lens, "native", { watermark: false });
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
  }, [lens, sourceUrl, phase, cameraOn]);

  const flashNameChip = useCallback((name: string) => {
    if (nameChipTimer.current) window.clearTimeout(nameChipTimer.current);
    setNameChip(name);
    nameChipTimer.current = window.setTimeout(() => setNameChip(null), 1400);
  }, []);

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

  const clear = () => {
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPreviewUrl(null);
    setLensId(null);
    setPhase("idle");
    setNameChip(null);
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
    processingRef.current = true;
    playShutterClick();
    setShutterClosed(true);
    window.setTimeout(() => setShutterClosed(false), 220);
    setPhase("processing");
    try {
      const shouldWm = wantWm && (isPaid || active.tier === "normal");
      const out = applyLensOpticalEnhanced(canvas, active, "native", { watermark: shouldWm });
      const blob = await canvasToBlob(out, "image/jpeg", 0.94);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);

      if (isAiLens(active) && active.creditCost > 0) {
        const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
          const charged = await chargeLensGeneration({
            data: { lensId: active.id, generationId },
          });
          if (charged?.charged) {
            toast.success(`${active.name} · ${charged.charged} credits`);
          }
        } catch (chargeErr) {
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(srcUrl);
          throw chargeErr instanceof Error ? chargeErr : new Error("Could not charge credits");
        }
      }

      stopCamera();
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
      setHoldingOriginal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lens failed");
      setPhase(sourceUrl || cameraOn ? "ready" : "idle");
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
    if (!lens) {
      toast.message("Select a lens first");
      return;
    }

    if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const frame = captureVideoFrame(videoRef.current, false);
        await applyFromCanvas(frame, lens);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Capture failed");
      }
      return;
    }

    if (!sourceUrl) {
      inputRef.current?.click();
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
    const next = getCameraLensById(id);
    setLensId(id);
    if (next) flashNameChip(next.name);
    setResultUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setPhase((p) => (p === "result" || p === "processing" ? "ready" : p));
    setHoldingOriginal(false);
    previewBusy.current = false;
    const el = carouselRef.current?.querySelector(`[data-lens-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const cycleLens = (dir: 1 | -1) => {
    const idx = lensId
      ? CAMERA_LENS_ROSTER.findIndex((l) => l.id === lensId)
      : -1;
    const next =
      CAMERA_LENS_ROSTER[(idx + dir + CAMERA_LENS_ROSTER.length) % CAMERA_LENS_ROSTER.length];
    selectLens(next.id);
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

  const share = async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const file = new File([blob], "motio2edit-lens.jpg", { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Motio2edit Lens" });
      } else {
        await download();
      }
    } catch {
      /* user cancelled or failed */
    }
  };

  useEffect(() => {
    const plan =
      (user as { plan?: string; isPaid?: boolean; subscription?: { status?: string } } | null)
        ?.plan ||
      ((user as { isPaid?: boolean } | null)?.isPaid ? "paid" : null);
    setIsPaid(!!plan && plan !== "free");
    if (!plan || plan === "free") setWantWm(true);
  }, [user]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (nameChipTimer.current) window.clearTimeout(nameChipTimer.current);
    };
  }, [stopCamera]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
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

  const showResult = phase === "result" && resultUrl && sourceUrl;
  const stillSrc =
    showResult && !holdingOriginal
      ? resultUrl!
      : previewUrl && phase === "ready" && lens && !cameraOn
        ? previewUrl
        : sourceUrl;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goHome}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-xl"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="rounded-full border border-amber-500/40 bg-black/50 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-amber-300/95 backdrop-blur-md">
          Motio2edit
        </span>

        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-xl"
          aria-label="Lens info"
        >
          <Info className="h-4.5 w-4.5" />
        </button>
      </div>

      {infoOpen && (
        <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+3.2rem)] z-50 w-56 rounded-2xl border border-white/15 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-xl">
          <p className="text-sm font-semibold">{lens?.name ?? "No lens selected"}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {lens?.shortDescription ?? "Pick a lens below"}
          </p>
          <p className="mt-2 text-[11px] text-amber-300/90">
            {lens
              ? isAiLens(lens)
                ? `${lens.creditCost} credits`
                : "Free"
              : "—"}
          </p>
          <button
            type="button"
            className="mt-2 text-[10px] text-zinc-500 underline"
            onClick={() => setInfoOpen(false)}
          >
            Close
          </button>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-44 pt-14">
        {phase === "idle" && !cameraOn && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-3xl border border-white/15 bg-white/8 px-6 py-14 text-center backdrop-blur-xl"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
                <ImagePlus className="h-7 w-7" />
              </span>
              <p className="text-sm font-semibold text-white/90">Upload photo</p>
            </button>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur-xl"
            >
              <Camera className="h-4 w-4" />
              Open camera
            </button>
          </div>
        )}

        {cameraOn && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="mx-auto max-h-[min(58dvh,600px)] w-full object-cover"
            />
          </div>
        )}

        {!cameraOn && (phase === "ready" || phase === "processing" || phase === "result") && stillSrc && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            {showResult && holdingOriginal === false && resultUrl && sourceUrl ? (
              <CompareSlider before={sourceUrl} after={resultUrl} />
            ) : (
              <img
                src={stillSrc}
                alt=""
                className="mx-auto max-h-[min(58dvh,600px)] w-full object-contain"
              />
            )}
            {phase === "processing" && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
                  <p className="mt-2 text-sm font-medium">Applying the effect</p>
                </div>
              </div>
            )}
            {phase === "ready" && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {nameChip && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2">
            <span className="rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">
              {nameChip}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
        {showResult ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4">
            <div className="flex w-full items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setResultUrl((prev) => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return null;
                  });
                  setPreviewUrl(null);
                  setPhase("ready");
                  setHoldingOriginal(false);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold backdrop-blur-xl"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Another lens
              </button>
              <button
                type="button"
                onClick={() => void download()}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-xs font-semibold text-black"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={() => void share()}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold backdrop-blur-xl"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
            <button type="button" onClick={clear} className="text-[11px] text-zinc-500">
              New photo
            </button>
          </div>
        ) : (
          <>
            <div
              ref={carouselRef}
              className="mb-3 flex gap-2.5 overflow-x-auto px-4 scrollbar-none"
              style={{ scrollSnapType: "x mandatory" }}
              role="listbox"
              aria-label="Lenses"
            >
              {CAMERA_LENS_ROSTER.map((l) => {
                const active = l.id === lensId;
                const thumb = sampleByLensId.get(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    data-lens-id={l.id}
                    role="option"
                    aria-selected={active}
                    onClick={() => selectLens(l.id)}
                    className="relative shrink-0"
                    style={{ scrollSnapAlign: "center" }}
                    aria-label={l.name}
                  >
                    <span
                      className={cn(
                        "relative block h-14 w-14 overflow-hidden rounded-full transition-transform",
                        active ? "scale-110" : "opacity-90",
                      )}
                      style={{
                        boxShadow: active
                          ? `0 0 0 2.5px ${l.color}, 0 0 16px ${l.color}88`
                          : `0 0 0 1.5px rgba(255,255,255,0.25)`,
                      }}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <span
                          className="grid h-full w-full place-items-center text-[10px] font-bold text-white"
                          style={{ background: l.color }}
                        >
                          {l.code}
                        </span>
                      )}
                      {l.tier === "ai" && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-1 text-[7px] font-bold leading-3 text-amber-300">
                          AI
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="flex items-center justify-center gap-10"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null) return;
                const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(dx) > 40) cycleLens(dx < 0 ? 1 : -1);
              }}
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-xl"
                aria-label="Upload"
              >
                <ImagePlus className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => void applyLens()}
                disabled={phase === "processing" || (!lens && !cameraOn && !sourceUrl)}
                className={cn(
                  "relative grid h-[78px] w-[78px] place-items-center rounded-full transition-transform duration-150 active:scale-95 disabled:opacity-40",
                  shutterClosed && "scale-90",
                )}
                aria-label="Shutter"
                style={{
                  boxShadow:
                    "0 0 0 3px rgba(255,255,255,0.85), 0 0 24px rgba(251,191,36,0.35)",
                }}
              >
                <span
                  className={cn(
                    "h-[62px] w-[62px] rounded-full transition-all duration-200",
                    shutterClosed ? "scale-75 opacity-80" : "scale-100",
                  )}
                  style={{
                    background:
                      "linear-gradient(160deg, #fde68a 0%, #fbbf24 45%, #d97706 100%)",
                    boxShadow:
                      "inset 0 2px 4px rgba(255,255,255,0.55), inset 0 -2px 6px rgba(146,64,14,0.35)",
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => void startCamera()}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-xl"
                aria-label="Camera"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
