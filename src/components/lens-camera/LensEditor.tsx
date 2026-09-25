/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Video is always the hero; processed canvas is an optional overlay.
 * Five-slot floating lens selector above shutter. One swipe = one lens.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ImagePlus,
  Info,
  LayoutGrid,
  Loader2,
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
import { runLensAiPlusGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_crown";

/** Fixed stage-relative spacing between bubble centers (px). Never % of bubble width. */
const SLOT_SPACING_PX = 72;

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

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewBusy = useRef(false);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const liveFxOkRef = useRef(false);

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

  /** Five slots: activeIndex-2..+2 with modulo wrap. Never empty. */
  const carouselSlots = useMemo(() => {
    const n = ORDERED_ROSTER.length;
    const slots: { lens: CameraLensDef; key: string; offset: number }[] = [];
    for (let off = -2; off <= 2; off++) {
      const i = ((activeIndex + off) % n + n) % n;
      const l = ORDERED_ROSTER[i];
      slots.push({ lens: l, key: `${l.id}@${off}`, offset: off });
    }
    return slots;
  }, [activeIndex]);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  /** Only true when canvas has a valid non-black frame drawn. */
  const [liveFxReady, setLiveFxReady] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [apertureOn, setApertureOn] = useState(false);
  const [farZoom, setFarZoom] = useState(1);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time" | "both">("both");
  const [dateTimeStyle, setDateTimeStyle] = useState<"digital" | "clean" | "mono" | "classic">("clean");
  const [colourNegative, setColourNegative] = useState(false);
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
    if (liveCanvasRef.current) {
      liveCanvasRef.current.style.display = "none";
      liveCanvasRef.current.style.opacity = "0";
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    disposeFaceLandmarker();
    setCameraOn(false);
    setLiveFxReady(false);
    liveFxOkRef.current = false;
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
        setLiveFxReady(false);
        liveFxOkRef.current = false;
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

  // Uploaded still: optical preview (does not overwrite sourceUrl)
  useEffect(() => {
    if (cameraOn || !sourceUrl || !lens || phase === "processing" || phase === "result") {
      return;
    }
    if (isAiLens(lens)) {
      setPreviewUrl(sourceUrl);
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
        if (!cancelled) setPreviewUrl(sourceUrl);
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

  // Live optical overlay — VIDEO ALWAYS STAYS VISIBLE as fallback
  useEffect(() => {
    if (!cameraOn || !lens || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) {
        liveCanvasRef.current.style.display = "none";
        liveCanvasRef.current.style.opacity = "0";
      }
      setLiveFxReady(false);
      liveFxOkRef.current = false;
      return;
    }
    if (isAiLens(lens)) {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) {
        liveCanvasRef.current.style.display = "none";
        liveCanvasRef.current.style.opacity = "0";
      }
      setLiveFxReady(false);
      liveFxOkRef.current = false;
      return;
    }

    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;

    const LIVE_MAX_W = 720;
    let frame = 0;
    const tmp = document.createElement("canvas");

    const tick = () => {
      if (!video.videoWidth) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      frame++;
      if (frame % 2 === 0) {
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
        const sample = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
        const hasContent = sample[0] + sample[1] + sample[2] > 8 || sample[3] > 0;
        if (hasContent) {
          canvas.style.display = "block";
          canvas.style.opacity = "1";
          if (!liveFxOkRef.current) {
            liveFxOkRef.current = true;
            setLiveFxReady(true);
          }
        }
      } catch {
        canvas.style.opacity = liveFxOkRef.current ? "1" : "0";
      }
      liveRafRef.current = requestAnimationFrame(tick);
    };
    liveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) {
        liveCanvasRef.current.style.display = "none";
        liveCanvasRef.current.style.opacity = "0";
      }
      liveFxOkRef.current = false;
      setLiveFxReady(false);
    };
  }, [cameraOn, lens, phase, facingMode, processOpts]);

  const selectLens = useCallback((id: string, name: string) => {
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
  }, []);

  const stepLens = useCallback(
    (dir: -1 | 1) => {
      const n = ORDERED_ROSTER.length;
      if (n === 0) return;
      const idx = ORDERED_ROSTER.findIndex((l) => l.id === lensId);
      const cur = idx < 0 ? 0 : idx;
      const next = ((cur + dir) % n + n) % n;
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
    const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      if (isAiLens(active)) {
        if (!isPaid) {
          throw new Error("AI+ lenses require a paid plan. Upgrade to unlock.");
        }
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const aiResult = await runLensAiPlusGeneration({
          data: { lensId: active.id, generationId, imageDataUrl },
        });
        const outputUrl = aiResult?.outputUrl;
        if (!outputUrl || typeof outputUrl !== "string") {
          throw new Error("AI enhancement returned no image.");
        }
        const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.95);
        const srcUrl = URL.createObjectURL(srcBlob);
        stopCamera();
        setSourceUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return srcUrl;
        });
        setResultUrl(outputUrl);
        setPhase("result");
        if (aiResult.remaining != null) {
          toast.success(`${active.name} · ${aiResult.remaining} AI+ left today`);
        } else {
          toast.success(`${active.name} ready`);
        }
        return;
      }

      const shouldWm = wantWm && (!isPaid || active.tier === "normal");
      const out = applyLensOpticalEnhanced(canvas, active, "native", {
        ...processOpts(shouldWm),
        maxEdge: 2560,
      });
      const blob = await canvasToBlob(out, "image/jpeg", 0.96);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);

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
    await new Promise((r) => setTimeout(r, 320));
    setApertureOn(false);
    if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
      const frame = captureVideoFrame(videoRef.current, facingMode === "user");
      if (frame) await applyFromCanvas(frame, lens);
      else toast.error("Could not capture frame");
      return;
    }
    if (sourceUrl) {
      try {
        const img = await loadImage(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        await applyFromCanvas(canvas, lens);
      } catch {
        toast.error("Could not process image");
      }
      return;
    }
    toast.error("Start camera or upload a photo");
  };

  const onRetake = () => {
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setPhase("ready");
    void startCamera(facingMode);
  };

  const toggleWatermark = async () => {
    if (!resultUrl || !lens || !sourceUrl || isAiLens(lens)) return;
    const nextWm = !wantWm;
    setWantWm(nextWm);
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const shouldWm = nextWm && (!isPaid || lens.tier === "normal");
      const out = applyLensOpticalEnhanced(canvas, lens, "native", {
        ...processOpts(shouldWm),
        maxEdge: 2560,
      });
      const blob = await canvasToBlob(out, "image/jpeg", 0.96);
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      toast.error("Could not update watermark");
    }
  };

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const onShare = async () => {
    if (!resultUrl || !canShare) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const file = new File([blob], `motio-lens-${Date.now()}.jpg`, { type: "image/jpeg" });
      await navigator.share({ files: [file], title: "Motio2Edit Lens" });
    } catch {
      /* cancelled */
    }
  };

  const showCamera = cameraOn && phase !== "result" && phase !== "processing";
  const stillSrc = phase === "result" ? resultUrl : previewUrl || sourceUrl;
  const showStill = !showCamera && !!stillSrc;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* ── HEADER ── */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-40 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start justify-between px-3">
          <Link
            to="/"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/45 backdrop-blur-md"
            aria-label="Close Lens Studio"
          >
            <X className="h-5 w-5" />
          </Link>

          <div className="pointer-events-none absolute left-1/2 top-[max(0.6rem,env(safe-area-inset-top))] -translate-x-1/2">
            <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
              <p className="whitespace-nowrap text-[11px] font-semibold tracking-[0.14em] text-white/90">
                MOTIO2EDIT · LENSES
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Link
              to="/studio/image/lenses"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-md"
              aria-label="More Lenses"
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
            {lens && (
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur-md"
                aria-label="Lens info"
              >
                <Info className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── CAMERA STAGE ── */}
      <div
        className="absolute inset-0 z-0 overflow-hidden bg-black"
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
              "pointer-events-none max-h-full max-w-full object-contain object-center transition-opacity duration-200",
              showCamera ? "opacity-100" : "opacity-0",
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
              "pointer-events-none absolute max-h-full max-w-full object-contain object-center transition-opacity duration-200",
              showCamera && liveFxReady ? "opacity-100" : "opacity-0",
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
            className="pointer-events-auto absolute right-3 z-30 flex flex-col items-center gap-2.5"
            style={{ top: "max(5.5rem, calc(env(safe-area-inset-top) + 4.5rem))" }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md"
              aria-label="Upload photo"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
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
          </div>
        )}

        {phase === "processing" && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/65">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="mt-3 text-sm font-medium">
              {isAiLens(lens) ? "AI+ enhancing…" : "Applying lens…"}
            </p>
          </div>
        )}

        {apertureOn && (
          <div className="pointer-events-none absolute inset-0 z-40 bg-black/25" />
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
                  "rounded-xl px-3 py-2 text-xs font-semibold backdrop-blur-md",
                  colourNegative ? "bg-purple-500 text-white" : "bg-black/60 text-white/90",
                )}
              >
                {colourNegative ? "Negative On" : "Negative Off"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM: unified lens selector + shutter ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black via-black/75 to-transparent" />
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-2">
          {lensId === "lens_farreach" && phase !== "result" && (
            <div className="pointer-events-auto mb-2 w-[11rem] rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
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

          <div className="relative z-20 mb-1 flex h-6 items-center justify-center">
            {lens && phase !== "result" && (
              <p
                key={lens.id}
                className="text-center text-[13px] font-semibold tracking-wide text-white/95"
              >
                {lens.name}
                {isAiLens(lens) ? (
                  <span className="ml-1.5 rounded bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold">
                    AI+
                  </span>
                ) : null}
              </p>
            )}
          </div>

          {phase !== "result" && (
            <div
              className="relative z-20 w-full"
              style={{ height: "4.6rem", marginBottom: "-1.1rem" }}
            >
              {carouselSlots.map((slot) => {
                const l = slot.lens;
                const off = slot.offset;
                const absOff = Math.abs(off);
                const isCenter = off === 0;
                const sample = SAMPLE_BY_ID[l.id];

                const sizePx = isCenter ? 64 : absOff === 1 ? 48 : 38;
                const opacity = isCenter ? 1 : absOff === 1 ? 0.8 : 0.5;
                const xPx = off * SLOT_SPACING_PX;
                const yPx = isCenter ? 0 : absOff === 1 ? 10 : 16;
                const z = isCenter ? 30 : absOff === 1 ? 20 : 10;

                return (
                  <button
                    key={slot.key}
                    type="button"
                    data-lens-id={l.id}
                    onClick={() => selectLens(l.id, l.name)}
                    className={cn(
                      "absolute overflow-hidden rounded-full transition-all duration-[220ms] ease-[cubic-bezier(0.34,1.3,0.64,1)] will-change-transform",
                      isCenter
                        ? "border-[2.5px] border-white shadow-[0_0_0_3px_rgba(255,255,255,0.22),0_0_14px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.4)]"
                        : "border border-white/30",
                    )}
                    style={{
                      width: sizePx,
                      height: sizePx,
                      left: "50%",
                      top: 0,
                      opacity,
                      transform: `translate(calc(-50% + ${xPx}px), ${yPx}px)`,
                      zIndex: z,
                      pointerEvents: "auto",
                      background: "rgba(18,18,22,0.55)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                    aria-label={l.name}
                    aria-pressed={isCenter}
                  >
                    {sample ? (
                      <img
                        src={sample}
                        alt=""
                        className={cn(
                          "h-full w-full object-cover",
                          !isCenter && "brightness-75",
                        )}
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="grid h-full w-full place-items-center text-[9px] font-bold"
                        style={{ backgroundColor: l.color + "44", color: l.color }}
                      >
                        {l.code}
                      </div>
                    )}
                    {l.tier === "ai" && (
                      <span className="absolute bottom-0 left-0 right-0 bg-orange-500/90 text-center text-[7px] font-bold leading-tight text-white">
                        AI+
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative z-40 flex items-center justify-center pb-1 pt-1">
            {phase === "result" ? (
              <div className="flex flex-wrap items-center justify-center gap-2 px-2">
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
                    if (resultUrl)
                      void triggerBrowserDownload(resultUrl, `motio-lens-${Date.now()}.jpg`);
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
                {isPaid && lens && !isAiLens(lens) && (
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
                  "relative grid place-items-center rounded-full border-[3.5px] bg-white/15 active:scale-[0.96] transition-transform",
                  isAiLens(lens)
                    ? "border-orange-400 shadow-[0_0_24px_rgba(251,146,60,0.5)]"
                    : "border-white shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
                )}
                style={{ height: 76, width: 76, zIndex: 50 }}
                aria-label="Shutter"
              >
                <div
                  className={cn(
                    "h-[3.35rem] w-[3.35rem] rounded-full shadow-inner",
                    isAiLens(lens) ? "bg-orange-300" : "bg-white",
                  )}
                />
              </button>
            )}
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
                ? "AI+ · Result after capture. Paid plan required."
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
