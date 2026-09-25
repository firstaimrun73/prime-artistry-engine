/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Swipe left/right on camera or shutter area to change lens.
 * Single full-bleed preview (no split). Torch when supported.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
  Info,
  LayoutGrid,
  Loader2,
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
import { disposeFaceLandmarker, warmFaceLandmarker } from "@/lib/lens-camera/face-track";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
  captureVideoFrame,
  formatDateTimeOverlay,
} from "@/lib/lens-camera/optical-engine";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_crown";

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

function hapticLensChange() {
  try {
    if ("vibrate" in navigator) navigator.vibrate(8);
  } catch {
    /* unsupported */
  }
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

const ORDERED_ROSTER = getMainCameraCarousel();

const HEAVY_LENS_IDS = new Set([
  "lens_perspective_stretch",
  "lens_fisheye_orbit",
  "lens_ultrawide_horizon",
  "lens_widevista",
  "lens_swirl_depth",
  "lens_architect_align",
]);

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const previewBusy = useRef(false);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const resolvedInitial =
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : DEFAULT_FREE_LENS;

  const [phase, setPhase] = useState<"idle" | "ready" | "processing" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [lensId, setLensId] = useState<string | null>(resolvedInitial);
  const lens = useMemo(
    () => (lensId ? getCameraLensById(lensId) ?? null : null),
    [lensId],
  );
  const activeIndex = useMemo(() => {
    const i = ORDERED_ROSTER.findIndex((l) => l.id === lensId);
    return i < 0 ? 0 : i;
  }, [lensId]);
  const carouselSlots = useMemo(() => {
    const slots: { lens: CameraLensDef | null; key: string }[] = [];
    for (let off = -2; off <= 2; off++) {
      const i = activeIndex + off;
      if (i < 0 || i >= ORDERED_ROSTER.length) {
        slots.push({ lens: null, key: `empty-${off}` });
      } else {
        slots.push({ lens: ORDERED_ROSTER[i], key: ORDERED_ROSTER[i].id });
      }
    }
    return slots;
  }, [activeIndex]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [nameChip, setNameChip] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [liveFxOn, setLiveFxOn] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [apertureOn, setApertureOn] = useState(false);
  const [farZoom, setFarZoom] = useState(1);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time" | "both">("both");
  const [dateTimeStyle, setDateTimeStyle] = useState<"digital" | "clean" | "mono" | "classic">("clean");
  const [colourNegative, setColourNegative] = useState(false);
  const [dateTimeDisplay, setDateTimeDisplay] = useState("");
  const nameChipTimer = useRef<number | null>(null);
  const dateTimeTextRef = useRef("");

  useEffect(() => {
    const plan =
      (user as { plan?: string } | null)?.plan ||
      (user as { subscription?: { status?: string } } | null)?.subscription?.status;
    setIsPaid(!!plan && plan !== "free");
    if (!plan || plan === "free") setWantWm(true);
  }, [user]);

  useEffect(() => {
    if (lensId !== "lens_date_time") return;
    const tick = () => {
      const t = formatDateTimeOverlay(dateTimeMode);
      dateTimeTextRef.current = t;
      setDateTimeDisplay(t);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lensId, dateTimeMode]);

  const processOpts = useCallback(
    (wm: boolean, maxEdge?: number) => ({
      watermark: wm,
      maxEdge: maxEdge ?? 2560,
      zoom: lensId === "lens_farreach" ? farZoom : undefined,
      colourNegative: lensId === "lens_windows_colour" ? colourNegative : undefined,
      dateTimeMode: lensId === "lens_date_time" ? dateTimeMode : undefined,
      dateTimeStyle: lensId === "lens_date_time" ? dateTimeStyle : undefined,
      dateTimeText:
        lensId === "lens_date_time"
          ? dateTimeTextRef.current || formatDateTimeOverlay(dateTimeMode)
          : undefined,
    }),
    [lensId, farZoom, colourNegative, dateTimeMode, dateTimeStyle],
  );

  const stopCamera = useCallback(() => {
    if (liveRafRef.current != null) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    }
    if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    disposeFaceLandmarker();
    setCameraOn(false);
    setLiveFxOn(false);
    setTorchOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(
    async (face: "user" | "environment" = facingMode) => {
      stopCamera();
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: face },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
        streamRef.current = stream;
        setTorchOn(false);
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
          setTorchSupported(face === "environment" && !!caps?.torch);
        } catch {
          setTorchSupported(false);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFacingMode(face);
        setCameraOn(true);
        setPhase("ready");
        setResultUrl(null);
        warmFaceLandmarker();
      } catch (e) {
        toast.error("Camera unavailable — try Upload");
        console.error(e);
        setPhase("idle");
      }
    },
    [facingMode, stopCamera],
  );

  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    void startCamera("user");
  }, [startCamera]);

  useEffect(() => {
    if (cameraOn || !sourceUrl || !lens || phase === "processing" || phase === "result") {
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (previewBusy.current) return;
      previewBusy.current = true;
      try {
        const img = await loadImage(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(img.naturalWidth, 2048);
        canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
        const ictx = canvas.getContext("2d")!;
        ictx.imageSmoothingEnabled = true;
        ictx.imageSmoothingQuality = "high";
        ictx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = applyLensOpticalEnhanced(canvas, lens, "native", processOpts(false));
        const blob = await canvasToBlob(out, "image/jpeg", 0.92);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev && prev !== sourceUrl && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
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
  }, [lens, sourceUrl, phase, cameraOn, processOpts]);

  useEffect(() => {
    if (!cameraOn || !lens || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
      setLiveFxOn(false);
      return;
    }
    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;
    const heavy = HEAVY_LENS_IDS.has(lens.id);
    const LIVE_MAX_W = heavy ? 560 : 960;
    let frame = 0;
    const tmp = document.createElement("canvas");
    const tick = () => {
      if (!video.videoWidth) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      frame++;
      if (heavy && frame % 3 === 0) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const scale = Math.min(1, LIVE_MAX_W / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (tmp.width !== w || tmp.height !== h) {
        tmp.width = w;
        tmp.height = h;
      }
      const tctx = tmp.getContext("2d")!;
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = "high";
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, w, h);
      if (facingMode === "user") {
        tctx.translate(w, 0);
        tctx.scale(-1, 1);
      }
      tctx.drawImage(video, 0, 0, w, h);
      try {
        const out = applyLensOpticalEnhanced(tmp, lens, "native", processOpts(false, LIVE_MAX_W));
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(out, 0, 0);
        canvas.style.display = "block";
        canvas.style.position = "relative";
        canvas.style.left = "auto";
        canvas.style.top = "auto";
        canvas.style.transform = "none";
        canvas.style.maxWidth = "100%";
        canvas.style.maxHeight = "100%";
        canvas.style.width = "auto";
        canvas.style.height = "auto";
        canvas.style.minWidth = "0";
        canvas.style.minHeight = "0";
        setLiveFxOn(true);
      } catch {
        /* keep last */
      }
      liveRafRef.current = requestAnimationFrame(tick);
    };
    liveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
    };
  }, [cameraOn, lens, phase, facingMode, processOpts]);

  const flashNameChip = useCallback((name: string) => {
    if (nameChipTimer.current) window.clearTimeout(nameChipTimer.current);
    setNameChip(name);
    nameChipTimer.current = window.setTimeout(() => setNameChip(null), 1600);
  }, []);

  const selectLens = useCallback(
    (id: string, name: string) => {
      setLensId((prev) => {
        if (prev !== id) hapticLensChange();
        return id;
      });
      if (
        id === "lens_crown" ||
        id === "lens_thunder_eyes" ||
        id === "lens_hair_shades" ||
        id === "lens_butterfly"
      ) {
        warmFaceLandmarker();
      }
      flashNameChip(name);
    },
    [flashNameChip],
  );

  const stepLens = useCallback(
    (dir: -1 | 1) => {
      const idx = ORDERED_ROSTER.findIndex((l) => l.id === lensId);
      const cur = idx < 0 ? 0 : idx;
      const next = Math.max(0, Math.min(ORDERED_ROSTER.length - 1, cur + dir));
      if (next === cur) return;
      const l = ORDERED_ROSTER[next];
      selectLens(l.id, l.name);
    },
    [lensId, selectLens],
  );

  const onSwipeStart = useCallback((clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  }, []);

  const onSwipeEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (swipeStartX.current == null || swipeStartY.current == null) return;
      const dx = clientX - swipeStartX.current;
      const dy = clientY - swipeStartY.current;
      swipeStartX.current = null;
      swipeStartY.current = null;
      if (Math.abs(dx) < 40) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.35) return;
      if (dx < 0) stepLens(1);
      else stepLens(-1);
    },
    [stepLens],
  );

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        // @ts-expect-error torch is non-standard but supported on many mobile browsers
        advanced: [{ torch: next }],
      } as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      try {
        await track.applyConstraints({
          // @ts-expect-error torch constraint
          torch: !torchOn,
        } as MediaTrackConstraints);
        setTorchOn((v) => !v);
      } catch {
        toast.message("Flash not available on this camera");
        setTorchSupported(false);
      }
    }
  }, [torchOn]);

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (previewUrl?.startsWith("blob:") && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    const url = URL.createObjectURL(file);
    previewBusy.current = false;
    setSourceUrl(url);
    setPreviewUrl(url);
    setResultUrl(null);
    setPhase("ready");
    setCameraOn(false);
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
    playShutterClick();
    setPhase("processing");
    try {
      const shouldWm = wantWm && (!isPaid || active.tier === "normal");
      const out = applyLensOpticalEnhanced(canvas, active, "native", {
        ...processOpts(shouldWm),
        maxEdge: 2560,
      });
      const blob = await canvasToBlob(out, "image/jpeg", 0.96);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);

      if (isAiLens(active) && active.creditCost > 0) {
        const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
          const charged = await chargeLensGeneration({
            data: { lensId: active.id, generationId },
          });
          if (charged?.charged) toast.success(`${active.name} · ${charged.charged} credits`);
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
      setResultUrl(url);
      setPhase("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lens apply failed");
      setPhase("ready");
    }
  };

  const onShutter = async () => {
    if (!lens) {
      toast.error("Pick a lens first");
      return;
    }
    if (phase === "processing" || apertureOn) return;
    setApertureOn(true);
    await new Promise((r) => setTimeout(r, 420));
    setApertureOn(false);
    if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
      const frame = captureVideoFrame(videoRef.current, facingMode === "user");
      await applyFromCanvas(frame, lens);
      return;
    }
    if (sourceUrl) {
      const img = await loadImage(sourceUrl);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0);
      await applyFromCanvas(c, lens);
    }
  };

  const onRetake = () => {
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setPhase("ready");
    void startCamera(facingMode);
  };

  const onShare = async () => {
    if (!resultUrl) return;
    try {
      const blob = await fetch(resultUrl).then((r) => r.blob());
      const file = new File([blob], `motio-lens-${lensId ?? "shot"}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: lens?.name ?? "Motio2edit Lens",
          text: `Shot with Motio2edit Lenses${lens ? ` · ${lens.name}` : ""}`,
        });
        return;
      }
      toast.message("Share not supported — use Download");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      toast.message("Share cancelled or unavailable");
    }
  };

  const toggleWatermark = async () => {
    if (!isPaid || !sourceUrl || !lens || phase !== "result") return;
    const next = !wantWm;
    setWantWm(next);
    try {
      const img = await loadImage(sourceUrl);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0);
      const final = applyLensOpticalEnhanced(c, lens, "native", {
        ...processOpts(next),
        maxEdge: 2560,
      });
      const blob = await canvasToBlob(final, "image/jpeg", 0.96);
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      toast.message("Could not update watermark");
      setWantWm(!next);
    }
  };

  const stillSrc = resultUrl || previewUrl || sourceUrl;
  const showCamera = cameraOn && phase !== "result";
  const showStill = !showCamera && stillSrc && phase !== "idle";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      <style>{`
        .m2e-ai-glow {
          box-shadow: inset 0 0 0 3px rgba(255, 120, 40, 0.85), 0 0 24px 4px rgba(255, 80, 20, 0.45);
          animation: m2e-ai-glow-pulse 1.6s ease-in-out infinite;
        }
        @keyframes m2e-ai-glow-pulse {
          0%, 100% { box-shadow: inset 0 0 0 3px rgba(255, 140, 50, 0.9), 0 0 18px 2px rgba(255, 90, 30, 0.4); }
          50% { box-shadow: inset 0 0 0 3px rgba(255, 60, 20, 1), 0 0 32px 6px rgba(255, 50, 10, 0.55); }
        }
      `}</style>
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-none absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] -translate-x-1/2">
          <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
            <p className="whitespace-nowrap text-[11px] font-semibold tracking-[0.14em] text-white/90">
              MOTIO2EDIT · LENSES
            </p>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
              aria-label="Close Lens Studio"
            >
              <X className="h-5 w-5" />
            </Link>
            <Link
              to="/studio/image/lenses"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
              aria-label="More Lenses"
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {lens && (
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
                aria-label="Lens info"
              >
                <Info className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        className={cn(
          "absolute inset-0 z-0 overflow-hidden bg-black touch-pan-y",
          isAiLens(lens) && phase !== "result" && "m2e-ai-glow",
        )}
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeStart(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeEnd(t.clientX, t.clientY);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              "pointer-events-none max-h-full max-w-full object-contain object-center",
              showCamera && !liveFxOn ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: "auto",
              height: "auto",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
          <canvas
            ref={liveCanvasRef}
            className={cn(
              "pointer-events-none max-h-full max-w-full",
              showCamera && liveFxOn ? "opacity-100" : "opacity-0",
            )}
            style={{
              display: "none",
              width: "auto",
              height: "auto",
            }}
          />
          {showStill && stillSrc && (
            <img
              src={stillSrc}
              alt="Preview"
              className="pointer-events-none max-h-full max-w-full object-contain object-center"
              style={{ width: "auto", height: "auto" }}
            />
          )}
        </div>
        {phase !== "result" && (
          <div
            className="pointer-events-auto absolute right-3 z-20 flex -translate-y-1/2 flex-col items-center gap-3"
            style={{ top: "50%" }}
          >
            <button
              type="button"
              onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md"
              aria-label="Flip camera"
            >
              <SwitchCamera className="h-5 w-5" />
            </button>
            {torchSupported && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full backdrop-blur-md",
                  torchOn ? "bg-amber-400 text-black" : "bg-black/45 text-white",
                )}
                aria-label="Torch"
              >
                <Zap className={cn("h-5 w-5", torchOn && "fill-current")} />
              </button>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md"
              aria-label="Upload photo"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </div>
        )}
        {phase === "processing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="mt-3 text-sm font-medium">Applying lens…</p>
          </div>
        )}
        {apertureOn && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30">
            <div className="relative h-48 w-48">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-bottom bg-black"
                  style={{
                    width: "28%",
                    height: "52%",
                    marginLeft: "-14%",
                    marginTop: "-52%",
                    clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
                    transform: `translate(-50%, -100%) rotate(${i * 60}deg) scaleY(0.12)`,
                    animation: `m2e-blade-${i} 0.4s ease-in forwards`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes m2e-blade-0{0%{transform:translate(-50%,-100%) rotate(0deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(0deg) scaleY(1)}}@keyframes m2e-blade-1{0%{transform:translate(-50%,-100%) rotate(60deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(60deg) scaleY(1)}}@keyframes m2e-blade-2{0%{transform:translate(-50%,-100%) rotate(120deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(120deg) scaleY(1)}}@keyframes m2e-blade-3{0%{transform:translate(-50%,-100%) rotate(180deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(180deg) scaleY(1)}}@keyframes m2e-blade-4{0%{transform:translate(-50%,-100%) rotate(240deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(240deg) scaleY(1)}}@keyframes m2e-blade-5{0%{transform:translate(-50%,-100%) rotate(300deg) scaleY(0.12)}100%{transform:translate(-50%,-100%) rotate(300deg) scaleY(1)}}`}</style>
          </div>
        )}
        {nameChip && (
          <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 backdrop-blur-md">
            <p className="text-sm font-semibold tracking-wide">{nameChip}</p>
          </div>
        )}
        {phase !== "result" && (lensId === "lens_date_time" || lensId === "lens_windows_colour") && (
          <div className="pointer-events-auto absolute left-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 flex max-w-[11rem] flex-col gap-2">
            {lensId === "lens_date_time" && (
              <div className="rounded-xl bg-black/60 px-2 py-2 backdrop-blur-md">
                <div className="mb-1 flex gap-1">
                  {(["date", "time", "both"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDateTimeMode(m)}
                      className={cn(
                        "flex-1 rounded-md px-1 py-1 text-[9px] font-semibold capitalize",
                        dateTimeMode === m ? "bg-amber-400 text-black" : "bg-white/10 text-white/80",
                      )}
                    >
                      {m === "both" ? "Both" : m}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["digital", "clean", "mono", "classic"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDateTimeStyle(st)}
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-medium capitalize",
                        dateTimeStyle === st ? "bg-white text-black" : "bg-white/10 text-white/70",
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {lensId === "lens_windows_colour" && (
              <button
                type="button"
                onClick={() => setColourNegative((v) => !v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[10px] font-semibold backdrop-blur-md",
                  colourNegative ? "bg-amber-400 text-black" : "bg-black/45 text-white",
                )}
              >
                Colour Negative
              </button>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-16">
          {lensId === "lens_farreach" && phase !== "result" && (
            <div className="mx-auto mb-2 w-[11rem] rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
              <p className="mb-1 text-center text-[10px] font-semibold text-white/80">
                Zoom {Number(farZoom).toFixed(1)}×
              </p>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={farZoom}
                onChange={(e) => setFarZoom(Number(e.target.value))}
                className="w-full accent-amber-400"
                aria-label="FarReach zoom"
              />
            </div>
          )}
          {lens && phase !== "result" && (
            <p className="mb-2 text-center text-sm font-semibold tracking-wide text-white/95">
              {lens.name}
              {isAiLens(lens) ? (
                <span className="ml-1.5 rounded bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold">AI+</span>
              ) : null}
            </p>
          )}
          <div
            ref={carouselRef}
            className="mx-auto mb-3 flex w-full max-w-[22rem] items-end justify-center gap-3 px-2"
          >
            {carouselSlots.map((slot, slotIdx) => {
              const isCenter = slotIdx === 2;
              const l = slot.lens;
              if (!l) {
                return <div key={slot.key} className="h-[3.25rem] w-[3.25rem] shrink-0" aria-hidden />;
              }
              const sample = SAMPLE_BY_ID[l.id];
              return (
                <button
                  key={slot.key}
                  type="button"
                  data-lens-id={l.id}
                  onClick={() => selectLens(l.id, l.name)}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-full border-2 transition-transform duration-200",
                    isCenter
                      ? "h-[4.5rem] w-[4.5rem] scale-110 border-white opacity-100 shadow-[0_0_0_2px_rgba(255,255,255,0.4)]"
                      : "h-[3.25rem] w-[3.25rem] border-white/25 opacity-50",
                  )}
                  aria-label={l.name}
                  aria-pressed={isCenter}
                >
                  {sample ? (
                    <img src={sample} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center text-[10px] font-bold"
                      style={{ backgroundColor: l.color + "33", color: l.color }}
                    >
                      {l.code}
                    </div>
                  )}
                  {l.tier === "ai" && (
                    <span className="absolute bottom-0 left-0 right-0 bg-orange-500/90 text-center text-[8px] font-bold text-white">
                      AI+
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-6 pb-3">
            <div className="h-12 w-12" aria-hidden />

            {phase === "result" ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onRetake}
                  className="rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (resultUrl) void triggerBrowserDownload(resultUrl, `motio-lens-${Date.now()}.jpg`);
                  }}
                  className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
                >
                  Download
                </button>
                {canShare && (
                  <button
                    type="button"
                    onClick={() => void onShare()}
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/15"
                    aria-label="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                {isPaid && (
                  <button
                    type="button"
                    onClick={() => void toggleWatermark()}
                    className={cn(
                      "rounded-full px-3 py-2.5 text-xs font-semibold",
                      wantWm ? "bg-amber-400/90 text-black" : "bg-white/15 text-white/90",
                    )}
                    aria-label="Toggle watermark"
                  >
                    {wantWm ? "WM On" : "WM Off"}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void onShutter()}
                disabled={phase === "processing" || !lens || apertureOn}
                className={cn(
                  "grid place-items-center rounded-full border-4 bg-white/20 active:scale-95",
                  isAiLens(lens) ? "border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.55)]" : "border-white",
                )}
                style={{ height: 72, width: 72 }}
                aria-label="Shutter"
              >
                <div className={cn("h-14 w-14 rounded-full", isAiLens(lens) ? "bg-orange-300" : "bg-white")} />
              </button>
            )}

            <div className="h-12 w-12" aria-hidden />
          </div>
        </div>
      </div>

      {infoOpen && lens && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-900/95 p-5 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">{lens.name}</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
                aria-label="Close info"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              {LENS_INFO[lens.id] ?? lens.shortDescription}
            </p>
            <p className="mt-3 text-xs text-white/50">
              {lens.tier === "ai"
                ? "AI+ · Result appears after capture. Paid plan required."
                : "Common · Free optical lens."}
            </p>
          </div>
        </div>
      )}

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

export default LensEditor;
