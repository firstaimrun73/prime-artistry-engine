/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Restored full implementation. Main carousel = getMainCameraCarousel() (10 lenses).
 * See commit history for optical engine + face-track integration.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  Droplet,
  ImagePlus,
  LayoutGrid,
  Lock,
  RotateCcw,
  Share2,
  SwitchCamera,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  getCameraLensById,
  getMainCameraCarousel,
  isAiLens,
  LENS_INFO,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
  captureVideoFrame,
  formatDateTimeOverlay,
} from "@/lib/lens-camera/optical-engine";
import { disposeFaceLandmarker } from "@/lib/lens-camera/face-track";
import {
  runLensAiPlusGeneration,
  chargeLensGeneration,
} from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_crown";
const HOME_ROUTE = "/" as const;
const MORE_LENSES_ROUTE = "/studio/image/lenses" as const;
const ORDERED_ROSTER = getMainCameraCarousel();
const LENS_COUNT = ORDERED_ROSTER.length;

function playShutterClick() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = 880;
    g.gain.value = 0.04;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* ignore */
  }
}

function ApertureLoader() {
  const blades = [0, 1, 2, 3, 4, 5];
  return (
    <div role="status" aria-label="Processing photo" className="relative h-24 w-24">
      <style>{`
        @keyframes m2e-aperture {
          0%, 100% { transform: translateX(36px); }
          50% { transform: translateX(3px); }
        }
        .m2e-blade { animation: m2e-aperture 1s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
      `}</style>
      <svg viewBox="-50 -50 100 100" className="h-full w-full">
        <defs>
          <clipPath id="m2e-iris-clip">
            <circle r="45" />
          </clipPath>
        </defs>
        <circle r="46" fill="rgba(0,0,0,0.35)" />
        <g clipPath="url(#m2e-iris-clip)">
          {blades.map((i) => (
            <g key={i} transform={`rotate(${i * 60})`}>
              <rect className="m2e-blade" x="0" y="-70" width="140" height="140" fill="#17171a" stroke="rgba(255,255,255,0.6)" strokeWidth="0.9" />
            </g>
          ))}
        </g>
        <circle r="46" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("load failed"));
    img.src = url;
  });
  return img;
}

const SAMPLE_BY_ID = Object.fromEntries(
  getLensSampleCards().map((s) => [s.lensId, s.imageUrl]),
);

export function LensEditor({ initialLensId }: { initialLensId?: string | null }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const resultVariantsRef = useRef<{ wm?: string; clean?: string }>({});
  const resultSourceRef = useRef<HTMLCanvasElement | null>(null);
  const shutterLockRef = useRef(false);

  const resolvedInitial =
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : DEFAULT_FREE_LENS;

  const [phase, setPhase] = useState<"idle" | "ready" | "processing" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [lensId, setLensId] = useState<string>(resolvedInitial);
  const lens = useMemo(() => getCameraLensById(lensId) ?? ORDERED_ROSTER[0] ?? null, [lensId]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [resultWm, setResultWm] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [farZoom, setFarZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [hwZoomSupported, setHwZoomSupported] = useState(false);
  const [nameChip, setNameChip] = useState<string | null>(null);

  const activeIndex = useMemo(() => {
    const i = ORDERED_ROSTER.findIndex((l) => l.id === lensId);
    return i < 0 ? 0 : i;
  }, [lensId]);

  const carouselSlots = useMemo(() => {
    const slots: { lens: CameraLensDef; offset: number; key: string }[] = [];
    for (let off = -2; off <= 2; off++) {
      const i = (activeIndex + off + LENS_COUNT) % LENS_COUNT;
      const l = ORDERED_ROSTER[i];
      if (l) slots.push({ lens: l, offset: off, key: `${l.id}@${off}` });
    }
    return slots;
  }, [activeIndex]);

  useEffect(() => {
    const plan =
      (user as { plan?: string } | null)?.plan ||
      (user as { subscription?: { status?: string } } | null)?.subscription?.status;
    setIsPaid(!!plan && plan !== "free");
    if (!plan || plan === "free") setWantWm(true);
  }, [user]);

  const stopCamera = useCallback(() => {
    if (liveRafRef.current != null) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setTorchOn(false);
    disposeFaceLandmarker();
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(
    async (face?: "user" | "environment") => {
      const mode = face ?? facingMode;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setTorchOn(false);
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        try {
          const track = stream.getVideoTracks()[0];
          const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & {
            torch?: boolean;
            zoom?: { min?: number; max?: number };
          };
          setTorchSupported(mode === "environment" && Boolean(capabilities?.torch));
          const z = capabilities?.zoom;
          if (z && typeof z.max === "number" && z.max > 1) {
            const zMin = typeof z.min === "number" ? z.min : 1;
            setZoomMin(zMin);
            setZoomMax(z.max);
            setHwZoomSupported(true);
            setFarZoom((prev) => Math.min(z.max, Math.max(zMin, prev > 1 ? prev : Math.min(z.max, 2))));
          } else {
            setZoomMin(1);
            setZoomMax(8);
            setHwZoomSupported(false);
          }
        } catch {
          setTorchSupported(false);
          setHwZoomSupported(false);
        }
        setFacingMode(mode);
        setCameraOn(true);
        setPhase("ready");
        setResultUrl(null);
      } catch (error) {
        console.error("[Lenses] camera start failed", error);
        toast.error("Camera unavailable — try Upload");
        setPhase("idle");
      }
    },
    [facingMode],
  );

  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    void startCamera("user");
  }, [startCamera]);

  // 4K HD AI+ is rear-camera only
  useEffect(() => {
    if (lens?.id === "lens_hd_4k" && facingMode === "user" && cameraOn) {
      void startCamera("environment");
    }
  }, [lens?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectLens = useCallback(
    (id: string) => {
      if (id === lensId) return;
      try {
        if ("vibrate" in navigator) navigator.vibrate(8);
      } catch {
        /* */
      }
      setLensId(id);
      setNameChip(getCameraLensById(id)?.name ?? null);
      window.setTimeout(() => setNameChip(null), 1200);
    },
    [lensId],
  );

  const stepLens = useCallback(
    (direction: number) => {
      const nextIndex = (activeIndex + direction + LENS_COUNT) % LENS_COUNT;
      const next = ORDERED_ROSTER[nextIndex];
      if (next) selectLens(next.id);
    },
    [activeIndex, selectLens],
  );

  const onTouchStart = (clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  };
  const onTouchEnd = (clientX: number, clientY: number) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const dx = clientX - swipeStartX.current;
    const dy = clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    stepLens(dx < 0 ? 1 : -1);
  };

  // Live optical preview loop
  useEffect(() => {
    if (!cameraOn || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      return;
    }
    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;
    let last = 0;
    const tick = (t: number) => {
      liveRafRef.current = requestAnimationFrame(tick);
      if (t - last < 80) return;
      last = t;
      if (video.readyState < 2) return;
      try {
        const frame = captureVideoFrame(video, facingMode === "user");
        const out = applyLensOpticalEnhanced(frame, lens, {
          liveMode: true,
          zoom: lens?.id === "lens_hd_4k" || lens?.id === "lens_farreach" ? farZoom : undefined,
        });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (canvas.width !== out.width || canvas.height !== out.height) {
          canvas.width = out.width;
          canvas.height = out.height;
        }
        ctx.drawImage(out, 0, 0);
      } catch {
        /* preview soft-fail */
      }
    };
    liveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (liveRafRef.current != null) cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    };
  }, [cameraOn, phase, lens, facingMode, farZoom]);

  const drawWatermark = (source: HTMLCanvasElement, watermark: boolean): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = source.width;
    c.height = source.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    if (watermark) {
      const text = "L E N S E S / Motio2edit";
      const fontSize = Math.max(12, Math.round(Math.min(c.width, c.height) * 0.028));
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      const pad = Math.round(fontSize * 0.8);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText(text, c.width - pad + 1, c.height - pad + 1);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillText(text, c.width - pad, c.height - pad);
    }
    return c;
  };

  const onCapture = async (fromUpload = false) => {
    if (shutterLockRef.current || phase === "processing") return;
    shutterLockRef.current = true;
    playShutterClick();
    setPhase("processing");
    try {
      let source: HTMLCanvasElement;
      if (fromUpload && sourceUrl) {
        const img = await loadImage(sourceUrl);
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        source = c;
      } else if (videoRef.current) {
        source = captureVideoFrame(videoRef.current, facingMode === "user");
      } else {
        throw new Error("No source");
      }

      const active = lens;
      if (!active) throw new Error("No lens");

      let canvas: HTMLCanvasElement;
      if (isAiLens(active)) {
        if (!isPaid) {
          toast.error("AI+ lenses require a paid plan");
          setPhase("ready");
          return;
        }
        const blob = await canvasToBlob(source);
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((res, rej) => {
          reader.onload = () => res(String(reader.result));
          reader.onerror = () => rej(new Error("read failed"));
          reader.readAsDataURL(blob);
        });
        const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const result = await runLensAiPlusGeneration({
          data: { lensId: active.id, imageDataUrl: dataUrl, generationId },
        });
        if (!result?.outputUrl) throw new Error("AI enhancement failed");
        if (result.charged) toast.success(`${active.name} · ${result.charged} credits`);
        const outImg = await loadImage(result.outputUrl);
        const c = document.createElement("canvas");
        c.width = outImg.naturalWidth;
        c.height = outImg.naturalHeight;
        c.getContext("2d")!.drawImage(outImg, 0, 0);
        canvas = c;
      } else {
        canvas = applyLensOpticalEnhanced(source, active, {
          liveMode: false,
          zoom: active.id === "lens_hd_4k" || active.id === "lens_farreach" ? farZoom : undefined,
        });
      }

      const shouldWm = !isPaid || wantWm;
      const out = drawWatermark(canvas, shouldWm);
      const url = URL.createObjectURL(await canvasToBlob(out));
      resultSourceRef.current = canvas;
      resultVariantsRef.current = shouldWm ? { wm: url } : { clean: url };
      setResultWm(shouldWm);
      setResultUrl(url);
      stopCamera();
      setPhase("result");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Capture failed");
      setPhase(cameraOn ? "ready" : "idle");
    } finally {
      shutterLockRef.current = false;
    }
  };

  const onPick = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    stopCamera();
    setPhase("ready");
    void onCapture(true);
  };

  const onNewShot = () => {
    setResultUrl(null);
    resultSourceRef.current = null;
    void startCamera(facingMode);
  };

  const showCamera = phase === "ready" || phase === "idle";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to={HOME_ROUTE}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-md"
          aria-label="Home"
        >
          <X className="h-5 w-5" />
        </Link>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-white/90">MOTIO2EDIT · LENSES</p>
        <Link
          to={MORE_LENSES_ROUTE}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-md"
          aria-label="More lenses"
        >
          <LayoutGrid className="h-5 w-5" />
        </Link>
      </div>

      {/* Stage */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => onTouchStart(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            (!cameraOn || phase === "result") && "opacity-0",
          )}
        />
        <canvas
          ref={liveCanvasRef}
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            (!cameraOn || phase === "result") && "opacity-0",
          )}
        />
        {resultUrl && phase === "result" && (
          <img src={resultUrl} alt="Result" className="max-h-full max-w-full object-contain" />
        )}
        {phase === "processing" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/50">
            <ApertureLoader />
          </div>
        )}
        {nameChip && phase !== "result" && (
          <div className="pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">
              {nameChip}
            </span>
          </div>
        )}

        {/* Right controls */}
        {showCamera && (
          <div className="pointer-events-auto absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (lens?.id === "lens_hd_4k" && facingMode === "environment") {
                  toast.message("This lens doesn't support front camera");
                  return;
                }
                void startCamera(facingMode === "user" ? "environment" : "user");
              }}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md"
              aria-label="Flip camera"
            >
              <SwitchCamera className="h-5 w-5" />
            </button>
            {torchSupported && (
              <button
                type="button"
                onClick={async () => {
                  const track = streamRef.current?.getVideoTracks()[0];
                  try {
                    await track?.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
                    setTorchOn((v) => !v);
                  } catch {
                    toast.message("Torch unavailable");
                  }
                }}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md",
                  torchOn && "text-amber-300",
                )}
                aria-label="Torch"
              >
                <Zap className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Zoom for 4K HD AI+ / FarReach */}
        {showCamera && (lens?.id === "lens_hd_4k" || lens?.id === "lens_farreach") && (
          <div className="pointer-events-auto absolute bottom-36 left-1/2 z-20 w-56 -translate-x-1/2">
            <p className="mb-1 text-center text-[10px] font-semibold text-white/80">
              Zoom {farZoom.toFixed(1)}×{hwZoomSupported ? "" : " (digital)"}
            </p>
            <input
              type="range"
              min={zoomMin}
              max={zoomMax}
              step={0.1}
              value={farZoom}
              onChange={async (e) => {
                const v = Number(e.target.value);
                setFarZoom(v);
                if (hwZoomSupported) {
                  const track = streamRef.current?.getVideoTracks()[0];
                  try {
                    await track?.applyConstraints({ advanced: [{ zoom: v } as MediaTrackConstraintSet] });
                  } catch {
                    /* digital fallback via optical path */
                  }
                }
              }}
              className="w-full"
              aria-label="Zoom"
            />
          </div>
        )}
      </div>

      {/* Bottom controls + 5-slot carousel */}
      {phase !== "result" && (
        <div className="relative z-30 bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="relative mx-auto mb-3 flex h-16 w-full max-w-md items-center justify-center">
            {carouselSlots.map(({ lens: l, offset, key }) => {
              const active = offset === 0;
              const thumb = SAMPLE_BY_ID[l.id];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectLens(l.id)}
                  className={cn(
                    "absolute grid place-items-center overflow-hidden rounded-full border transition-all duration-200",
                    active
                      ? "z-10 h-14 w-14 border-white scale-110"
                      : "h-11 w-11 border-white/30 opacity-70",
                  )}
                  style={{ transform: `translateX(${offset * 68}px)${active ? " scale(1.1)" : ""}` }}
                  aria-label={l.name}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: l.color }}>
                      {l.code}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-8 px-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="Upload"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void onCapture(false)}
              className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/20"
              aria-label="Shutter"
            >
              <span className="h-12 w-12 rounded-full bg-white" />
            </button>
            <Link
              to={MORE_LENSES_ROUTE}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="More lenses"
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="relative z-30 flex flex-col gap-2 bg-black px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black"
              onClick={() => triggerBrowserDownload(resultUrl, `motio2edit-lens-${lensId}.jpg`)}
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium"
              onClick={async () => {
                try {
                  const blob = await fetch(resultUrl).then((r) => r.blob());
                  if (navigator.share) {
                    await navigator.share({ files: [new File([blob], "lens.jpg", { type: blob.type })] });
                  } else {
                    toast.message("Share not supported — use Download");
                  }
                } catch {
                  /* user cancel */
                }
              }}
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium"
              onClick={onNewShot}
            >
              <RotateCcw className="h-4 w-4" /> New shot
            </button>
          </div>
          <p className="text-center text-[10px] text-white/50">Watermark: {resultWm ? "On" : "Off"}</p>
        </div>
      )}

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

export default LensEditor;
