/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 *
 * Source image persists across lens changes. Output-only watermark. Common lenses = free (local optical only). AI+ = plan entitlement after capture/upload only.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  Droplet,
  ImagePlus,
  Info,
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
  CAMERA_LENS_ROSTER,
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
  estimateBrightness,
  formatDateTimeOverlay,
} from "@/lib/lens-camera/optical-engine";
import {
  runLensAiPlusGeneration,
} from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_crown";
const HOME_ROUTE = "/" as const;
const MORE_LENSES_ROUTE = "/studio/image/lenses" as const;

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

function lensSlug(id: string): string {
  return id.replace(/^lens_/, "").replace(/_/g, "").toLowerCase();
}

function buildSampleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const owner: Record<string, string> = {};
  for (const s of getLensSampleCards()) {
    if (!s || !s.lensId || !s.imageUrl || map[s.lensId]) continue;
    const prev = owner[s.imageUrl];
    if (prev) {
      const norm = s.imageUrl.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (norm.includes(lensSlug(s.lensId)) && !norm.includes(lensSlug(prev))) {
        delete map[prev];
        map[s.lensId] = s.imageUrl;
        owner[s.imageUrl] = s.lensId;
      }
      continue;
    }
    map[s.lensId] = s.imageUrl;
    owner[s.imageUrl] = s.lensId;
  }
  return map;
}

const SAMPLE_BY_ID = buildSampleMap();
const ORDERED_ROSTER = getMainCameraCarousel();

const HEAVY_LENS_IDS = new Set([
  "lens_perspective_stretch",
  "lens_fisheye_orbit",
  "lens_ultrawide_horizon",
  "lens_widevista",
  "lens_swirl_depth",
  "lens_architect_align",
]);

const LIGHTWEIGHT_LENS_IDS = new Set([
  "lens_hd_4k",
  "lens_windows_colour",
  "lens_date_time",
  "lens_snake_view",
  "lens_retro_80s",
  "lens_colour_negative",
  "lens_vintage_halation",
  "lens_crayon",
  "lens_fairytale",
]);

const FACE_HEAVY_LENS_IDS = new Set([
  "lens_crown",
  "lens_thunder_eyes",
  "lens_hair_shades",
  "lens_butterfly",
]);

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
        @media (prefers-reduced-motion: reduce) {
          .m2e-blade { animation-duration: 2.4s; }
        }
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

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const resultVariantsRef = useRef<{ wm?: string; clean?: string }>({});
  const resultSourceRef = useRef<HTMLCanvasElement | null>(null);
  const shutterLockRef = useRef(false);
  const dateTimeTextRef = useRef("");
  const nameChipTimer = useRef<number | null>(null);

  const resolvedInitial =
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : DEFAULT_FREE_LENS;

  const [phase, setPhase] = useState<"idle" | "ready" | "processing" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [lensId, setLensId] = useState<string | null>(resolvedInitial);
  const lens = useMemo(() => (lensId ? getCameraLensById(lensId) ?? null : null), [lensId]);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [nameChip, setNameChip] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [resultWm, setResultWm] = useState(true);
  const [wmBusy, setWmBusy] = useState(false);
  const [resultFromUpload, setResultFromUpload] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [liveFxOn, setLiveFxOn] = useState(false);
  const [farZoom, setFarZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [hwZoomSupported, setHwZoomSupported] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time" | "both">("both");
  const [dateTimeStyle, setDateTimeStyle] = useState<"digital" | "clean" | "mono" | "classic">("clean");
  const [colourNegative, setColourNegative] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const [dateTimeDisplay, setDateTimeDisplay] = useState("");

  useEffect(() => {
    const plan =
      (user as { plan?: string } | null)?.plan ||
      (user as { subscription?: { status?: string } } | null)?.subscription?.status;
    setIsPaid(!!plan && plan !== "free");
    if (!plan || plan === "free") setWantWm(true);
  }, [user]);

  const clearResultVariants = useCallback(() => {
    const v = resultVariantsRef.current;
    if (v.wm?.startsWith("blob:")) URL.revokeObjectURL(v.wm);
    if (v.clean?.startsWith("blob:")) URL.revokeObjectURL(v.clean);
    resultVariantsRef.current = {};
    resultSourceRef.current = null;
    setResultUrl(null);
  }, []);

  useEffect(
    () => () => {
      const v = resultVariantsRef.current;
      if (v.wm?.startsWith("blob:")) URL.revokeObjectURL(v.wm);
      if (v.clean?.startsWith("blob:")) URL.revokeObjectURL(v.clean);
    },
    [],
  );

  const stopCamera = useCallback(() => {
    if (liveRafRef.current != null) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setLiveFxOn(false);
    setTorchOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async (face?: "user" | "environment") => {
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
          zoom?: { min?: number; max?: number; step?: number };
        };
        setTorchSupported(mode === "environment" && Boolean(capabilities?.torch));
        const z = capabilities?.zoom;
        if (z && typeof z.max === "number" && z.max > 1) {
          const zMin = typeof z.min === "number" ? z.min : 1;
          const zMax = z.max;
          setZoomMin(zMin);
          setZoomMax(zMax);
          setHwZoomSupported(true);
          setFarZoom((prev) => Math.min(zMax, Math.max(zMin, prev > 1 ? prev : Math.min(zMax, Math.max(zMin, 2)))));
        } else {
          setZoomMin(1);
          setZoomMax(8);
          setHwZoomSupported(false);
          setFarZoom((prev) => Math.min(8, Math.max(1, prev)));
        }
      } catch {
        setTorchSupported(false);
        setHwZoomSupported(false);
        setZoomMin(1);
        setZoomMax(8);
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
  }, [facingMode]);

  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    void startCamera("user");
  }, [startCamera]);

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

  useEffect(() => {
    if (!cameraOn || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      setLiveFxOn(false);
      return;
    }
    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;
    const heavy = lens ? HEAVY_LENS_IDS.has(lens.id) : false;
    const faceHeavy = lens ? FACE_HEAVY_LENS_IDS.has(lens.id) : false;
    const light = lens ? LIGHTWEIGHT_LENS_IDS.has(lens.id) : false;
    const LIVE_MAX_W = heavy ? 480 : faceHeavy ? 560 : light ? 720 : 880;
    let frame = 0;
    const tmp = document.createElement("canvas");
    const tick = () => {
      if (!video.videoWidth || !video.videoHeight) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      frame++;
      if ((heavy || faceHeavy) && frame % (faceHeavy ? 3 : 2) !== 0) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const viewW = Math.max(1, Math.round(rect.width));
      const viewH = Math.max(1, Math.round(rect.height));
      const scale = Math.min(1, LIVE_MAX_W / video.videoWidth);
      const srcW = Math.round(video.videoWidth * scale);
      const srcH = Math.round(video.videoHeight * scale);
      if (tmp.width !== srcW || tmp.height !== srcH) {
        tmp.width = srcW;
        tmp.height = srcH;
      }
      if (canvas.width !== viewW || canvas.height !== viewH) {
        canvas.width = viewW;
        canvas.height = viewH;
      }
      const tctx = tmp.getContext("2d")!;
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = "high";
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, srcW, srcH);
      if (facingMode === "user") {
        tctx.translate(srcW, 0);
        tctx.scale(-1, 1);
      }
      tctx.drawImage(video, 0, 0, srcW, srcH);
      try {
        const out = lens
          ? applyLensOpticalEnhanced(tmp, lens, "native", {
              watermark: false,
              maxEdge: LIVE_MAX_W,
              zoom: lens.id === "lens_farreach" ? farZoom : undefined,
              colourNegative: lens.id === "lens_windows_colour" ? colourNegative : undefined,
              dateTimeMode: lens.id === "lens_date_time" ? dateTimeMode : undefined,
              dateTimeStyle: lens.id === "lens_date_time" ? dateTimeStyle : undefined,
              dateTimeText: lens.id === "lens_date_time" ? dateTimeTextRef.current : undefined,
            })
          : tmp;
        const outAspect = out.width / out.height;
        const viewAspect = viewW / viewH;
        let sx = 0, sy = 0, sw = out.width, sh = out.height;
        if (outAspect > viewAspect) {
          sw = Math.round(out.height * viewAspect);
          sx = Math.round((out.width - sw) / 2);
        } else {
          sh = Math.round(out.width / viewAspect);
          sy = Math.round((out.height - sh) / 2);
        }
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, viewW, viewH);
        ctx.drawImage(out, sx, sy, sw, sh, 0, 0, viewW, viewH);
        setLiveFxOn(true);
      } catch {
        /* keep last frame */
      }
      liveRafRef.current = requestAnimationFrame(tick);
    };
    liveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
    };
  }, [cameraOn, lens, phase, facingMode, farZoom, colourNegative, dateTimeMode, dateTimeStyle]);

  const showLensName = useCallback((value: CameraLensDef | null) => {
    if (!value) return;
    setNameChip(value.name);
    if (nameChipTimer.current != null) window.clearTimeout(nameChipTimer.current);
    nameChipTimer.current = window.setTimeout(() => {
      setNameChip(null);
      nameChipTimer.current = null;
    }, 1400);
  }, []);

  useEffect(
    () => () => {
      if (nameChipTimer.current != null) window.clearTimeout(nameChipTimer.current);
    },
    [],
  );

  const selectLens = useCallback(
    (id: string) => {
      const next = getCameraLensById(id);
      if (!next) return;
      if (id === lensId) return;
      setLensId(id);
      showLensName(next);
      setPreviewUrl(null);
      clearResultVariants();
      setShowInfo(false);
      try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(10);
        }
      } catch {
        /* ignore */
      }
      // FarReach: rear/environment camera ONLY — never front
      if (id === "lens_farreach") {
        if (facingMode !== "environment") {
          void startCamera("environment").catch(() => {
            toast.error("FarReach needs the rear camera");
          });
        }
      }
      if (sourceUrl) {
        setPhase("ready");
      } else {
        setPhase(cameraOn ? "ready" : "idle");
      }
    },
    [cameraOn, clearResultVariants, showLensName, sourceUrl, lensId, facingMode, startCamera],
  );

  const moveLens = useCallback(
    (direction: 1 | -1) => {
      if (!lensId) return;
      const currentIndex = ORDERED_ROSTER.findIndex((item) => item.id === lensId);
      if (currentIndex < 0) return;
      const nextIndex = (currentIndex + direction + ORDERED_ROSTER.length) % ORDERED_ROSTER.length;
      const next = ORDERED_ROSTER[nextIndex];
      if (!next) return;
      selectLens(next.id);
    },
    [lensId, selectLens],
  );

  const onSwipeStart = useCallback((clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  }, []);

  const onSwipeEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (phase === "result" || phase === "processing") return;
      if (swipeStartX.current == null || swipeStartY.current == null) return;
      const dx = clientX - swipeStartX.current;
      const dy = clientY - swipeStartY.current;
      swipeStartX.current = null;
      swipeStartY.current = null;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
      moveLens(dx < 0 ? 1 : -1);
    },
    [moveLens, phase],
  );

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        // @ts-expect-error torch is non-standard
        advanced: [{ torch: next }],
      } as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      try {
        await track.applyConstraints({
          // @ts-expect-error torch
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
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    clearResultVariants();
    setSourceUrl(URL.createObjectURL(file));
    setPreviewUrl(null);
    setResultFromUpload(true);
    setPhase("ready");
  };

  const applyFromCanvas = async (
    canvas: HTMLCanvasElement,
    active: CameraLensDef,
    fromUpload: boolean,
  ) => {
    if (shutterLockRef.current) return;
    shutterLockRef.current = true;
    playShutterClick();
    setPhase("processing");
    setAiStage(null);
    try {
      const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      if (isAiLens(active)) {
        if (!isPaid) {
          throw new Error("AI+ lenses require a paid plan. Upgrade to unlock.");
        }
        setAiStage(
          active.id === "lens_farreach"
            ? "Analysing → Zooming → Enhancing"
            : active.id === "lens_hd_4k"
              ? "Analysing → Enhancing → Finishing"
              : "Analysing → Enhancing",
        );
        try {
          await consumeAiPlusAttempt({
            data: { lensId: active.id, generationId },
          });
        } catch (aiErr) {
          throw aiErr instanceof Error ? aiErr : new Error("AI+ not available");
        }
      }

      const shouldWm = wantWm && (!isPaid || active.tier === "normal");
      const processOpts = {
        watermark: shouldWm,
        maxEdge: 2560,
        zoom: active.id === "lens_farreach" ? farZoom : undefined,
        dateTimeMode,
        dateTimeStyle,
        dateTimeText:
          active.id === "lens_date_time"
            ? dateTimeTextRef.current || formatDateTimeOverlay(dateTimeMode)
            : undefined,
        colourNegative: active.id === "lens_windows_colour" ? colourNegative : undefined,
      };
      const out = applyLensOpticalEnhanced(canvas, active, "native", processOpts);
      const blob = await canvasToBlob(out, "image/jpeg", 0.96);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);

      if (active.creditCost > 0 && !isAiLens(active)) {
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
      clearResultVariants();
      resultVariantsRef.current = shouldWm ? { wm: url } : { clean: url };
      resultSourceRef.current = canvas;
      setResultWm(shouldWm);
      setResultFromUpload(fromUpload);
      setResultUrl(url);
      setPhase("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lens apply failed");
      setPhase("ready");
    } finally {
      shutterLockRef.current = false;
      setAiStage(null);
    }
  };

  const onShutter = async () => {
    if (!lens) {
      toast.error("Pick a lens first");
      return;
    }
    if (shutterLockRef.current || phase === "processing") return;
    if (isAiLens(lens) && !isPaid) {
      toast.error("AI+ lenses require a paid plan. Upgrade to unlock.");
      return;
    }
    if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
      const frame = captureVideoFrame(videoRef.current, facingMode === "user");
      await applyFromCanvas(frame, lens, false);
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
      await applyFromCanvas(c, lens, true);
    }
  };

  const onRetake = () => {
    const wasUpload = resultFromUpload;
    clearResultVariants();
    if (wasUpload && sourceUrl) {
      setPreviewUrl(null);
      setPhase("ready");
      return;
    }
    setPhase("ready");
    void startCamera(facingMode);
  };

  const onNewShot = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    clearResultVariants();
    setPhase("idle");
    setSourceUrl(null);
    setPreviewUrl(null);
    setResultFromUpload(false);
    setLensId(DEFAULT_FREE_LENS);
    void startCamera("user");
  };

  const toggleWatermark = async () => {
    if (!isPaid) {
      toast.message("Removing the watermark is a paid feature");
      return;
    }
    const src = resultSourceRef.current;
    if (!src || !lens || wmBusy) return;
    const next = !resultWm;
    const key = next ? "wm" : "clean";
    try {
      if (!resultVariantsRef.current[key]) {
        setWmBusy(true);
        await new Promise((r) => window.setTimeout(r, 30));
        const out = applyLensOpticalEnhanced(src, lens, "native", {
          watermark: next,
          maxEdge: 2560,
        });
        const blob = await canvasToBlob(out, "image/jpeg", 0.96);
        resultVariantsRef.current[key] = URL.createObjectURL(blob);
      }
      setResultWm(next);
      setResultUrl(resultVariantsRef.current[key] ?? null);
    } catch {
      toast.error("Could not update the watermark");
    } finally {
      setWmBusy(false);
    }
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

  const stillSrc = resultUrl || previewUrl || sourceUrl;
  const showStill =
    !!stillSrc &&
    phase !== "idle" &&
    (phase === "result" || resultFromUpload || !cameraOn);
  const showCamera = cameraOn && phase !== "result" && !showStill;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link to={HOME_ROUTE} className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md" aria-label="Close">
          <X className="h-5 w-5" />
        </Link>
        <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/90">MOTIO2EDIT · LENSES</p>
        </div>
        {phase === "result" ? (
          <button
            type="button"
            disabled={wmBusy}
            onClick={() => void toggleWatermark()}
            aria-pressed={isPaid ? resultWm : true}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-60",
              !isPaid || resultWm
                ? "bg-amber-400 text-black"
                : "border border-amber-400 bg-transparent text-amber-400",
            )}
          >
            {isPaid ? <Droplet className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {wmBusy ? "…" : "WM"}
          </button>
        ) : (
          <div className="h-10 w-10" aria-hidden />
        )}
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden touch-pan-y"
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeStart(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeEnd(t.clientX, t.clientY);
        }}
      >
        <video ref={videoRef} playsInline muted autoPlay className="pointer-events-none absolute opacity-0" style={{ width: 1, height: 1, left: -9999, top: -9999 }} />
        <canvas ref={liveCanvasRef} className={cn("absolute inset-0 block h-full w-full bg-black", phase === "result" && "invisible pointer-events-none")} />

        {showStill && (
          <div
            className={cn(
              "absolute inset-0 z-10 flex items-center justify-center bg-black",
              phase === "result" ? "pb-[9rem]" : "pb-[11.5rem]",
            )}
          >
            <img src={stillSrc!} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
          </div>
        )}

        {phase === "idle" && !cameraOn && !stillSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950 px-6">
            <p className="text-center text-sm text-white/60">Allow camera or upload a photo</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => void startCamera("user")} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
                Open Camera
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold">
                Upload
              </button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/35">
            <div className="flex flex-col items-center gap-3">
              <ApertureLoader />
              {aiStage && (
                <p className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
                  {aiStage}
                </p>
              )}
            </div>
          </div>
        )}

        {nameChip && phase !== "result" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">{nameChip}</span>
          </div>
        )}
        {showCamera && !nameChip && phase === "ready" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2">
            <span className="whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">← Swipe to change lens →</span>
          </div>
        )}
        {showCamera && phase === "ready" && lensId === "lens_date_time" && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <span className="rounded-lg bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              {dateTimeDisplay || "Date / Time"}
            </span>
          </div>
        )}

        {showCamera && (
          <div className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 flex flex-col items-end gap-2">
            <button type="button" onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")} className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md" aria-label="Flip camera">
              <SwitchCamera className="h-5 w-5" />
            </button>
            {torchSupported && (
              <button type="button" onClick={() => void toggleTorch()} className={cn("grid h-11 w-11 place-items-center rounded-full backdrop-blur-md", torchOn ? "bg-amber-400 text-black" : "bg-black/45 text-white")} aria-label="Toggle light">
                <Zap className={cn("h-5 w-5", torchOn && "fill-current")} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className={cn("grid h-11 w-11 place-items-center rounded-full backdrop-blur-md", showInfo ? "bg-white text-black" : "bg-black/45 text-white")}
              aria-label="Lens info"
            >
              <Info className="h-5 w-5" />
            </button>
            {lens && isAiLens(lens) && (
              <span className="rounded-full bg-orange-500/90 px-2 py-1 text-[9px] font-bold text-white">
                AI Enhance on Capture
              </span>
            )}
            {showInfo && lens && (
              <div className="max-w-[11rem] rounded-xl bg-black/70 px-3 py-2 text-[11px] leading-snug text-white/90 backdrop-blur-md">
                <p className="font-semibold">{lens.name}</p>
                <p className="mt-1 text-white/75">{LENS_INFO[lens.id] ?? lens.shortDescription}</p>
              </div>
            )}
            {lensId === "lens_farreach" && (
              <div className="w-[9.5rem] rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
                <p className="mb-1 text-center text-[10px] font-semibold text-white/80">
                  Zoom {Number(farZoom).toFixed(1)}×{hwZoomSupported ? "" : " (digital)"}
                </p>
                <input
                  type="range"
                  min={zoomMin}
                  max={zoomMax}
                  step={hwZoomSupported ? 0.1 : 0.5}
                  value={farZoom}
                  onChange={(e) => {
                    const z = Number(e.target.value);
                    setFarZoom(z);
                    if (hwZoomSupported && streamRef.current) {
                      const track = streamRef.current.getVideoTracks()[0];
                      try {
                        void track?.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] });
                      } catch {
                        /* digital crop fallback via processOpts.zoom */
                      }
                    }
                  }}
                  className="w-full accent-amber-400"
                  aria-label="FarReach zoom"
                />
              </div>
            )}
            {lensId === "lens_date_time" && (
              <div className="w-[10rem] rounded-xl bg-black/60 px-2 py-2 backdrop-blur-md">
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

      {phase !== "result" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col bg-gradient-to-t from-black/55 via-black/35 to-transparent pt-16">
          <div className="pointer-events-none">
            <div ref={carouselRef} className="pointer-events-auto mb-2 flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
              {ORDERED_ROSTER.map((l) => {
                const selected = lensId === l.id;
                const isAi = l.tier === "ai";
                const thumb = SAMPLE_BY_ID[l.id];
                return (
                  <button key={l.id} type="button" data-lens-id={l.id} onClick={() => selectLens(l.id)} className="flex w-[4.4rem] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95">
                    <div
                      className={cn("relative h-[3.5rem] w-[3.5rem] shrink-0 overflow-hidden rounded-full transition-transform duration-150", selected ? "scale-110" : "scale-100 ring-1 ring-white/25")}
                      style={selected ? { boxShadow: `0 0 0 3px #ffffff, 0 0 0 5px ${l.color}` } : undefined}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-zinc-800 text-[11px] font-bold" style={{ color: l.color }}>{l.code}</div>
                      )}
                      {isAi && (
                        <span className="absolute bottom-0 left-0 right-0 bg-orange-500/90 py-0.5 text-center text-[8px] font-bold text-white">AI</span>
                      )}
                    </div>
                    <span className={cn("line-clamp-1 max-w-full text-center text-[10px] font-medium", selected ? "text-white" : "text-white/55")}>{l.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-auto flex items-center justify-center gap-10 px-6 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => inputRef.current?.click()} className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md" aria-label="Gallery">
              <ImagePlus className="h-5 w-5 text-white/90" />
            </button>
            <button type="button" disabled={phase === "processing" || !lens} onClick={() => void onShutter()} className={cn("relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full transition-transform", phase === "processing" || !lens ? "opacity-40" : "active:scale-90")} aria-label="Capture">
              <span className="absolute inset-0 rounded-full border-[3px] border-white" />
              <span className={cn("h-[3.55rem] w-[3.55rem] rounded-full bg-white", phase === "processing" && "opacity-60")} />
            </button>
            <Link to={MORE_LENSES_ROUTE} className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md" aria-label="More lenses" title="More lenses">
              <LayoutGrid className="h-5 w-5 text-white/90" />
            </Link>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex h-[9rem] flex-col justify-end gap-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6">
          {lens && (
            <p className="text-center text-[11px] font-medium text-white/70">
              {lens.name}{isAiLens(lens) ? " · AI+" : " · Free"}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black" onClick={() => void triggerBrowserDownload(resultUrl, `motio-lens-${lensId ?? "shot"}.jpg`)}>
              <Download className="h-4 w-4" /> Download
            </button>
            {canShare && (
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white" onClick={() => void onShare()}>
                <Share2 className="h-4 w-4" /> Share
              </button>
            )}
            <button type="button" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-semibold text-white" onClick={onRetake}>
              <RotateCcw className="h-4 w-4" /> {resultFromUpload ? "Edit again" : "Retake"}
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button type="button" className="h-9 px-3 text-sm font-medium text-white/60" onClick={onNewShot}>
              New shot
            </button>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </div>
  );
}

export default LensEditor;
