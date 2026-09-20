/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 *
 * Includes SUMO AI+ face-cutout, pure-white front fill light, source image persistence.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type ChangeEvent } from "react";
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
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  isAiLens,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
  captureVideoFrame,
  estimateBrightness,
} from "@/lib/lens-camera/optical-engine";
import { ensureSumoBoard } from "@/lib/lens-camera/opt-fx2";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_natural_frame";
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

const ORDERED_ROSTER = [
  ...CAMERA_LENS_ROSTER.filter((l) => l.tier === "normal"),
  ...CAMERA_LENS_ROSTER.filter((l) => l.tier === "ai"),
];

const HEAVY_LENS_IDS = new Set([
  "lens_perspective_stretch",
  "lens_fisheye_orbit",
  "lens_ultrawide_horizon",
  "lens_widevista",
  "lens_swirl_depth",
  "lens_architect_align",
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
  const previewBusy = useRef(false);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const resultVariantsRef = useRef<{ wm?: string; clean?: string }>({});
  const resultSourceRef = useRef<HTMLCanvasElement | null>(null);

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
  const [fillLightOpacity, setFillLightOpacity] = useState(0);
  const [faceGuideMsg, setFaceGuideMsg] = useState<string | null>(null);
  const faceMsgCooldown = useRef(0);
  const fillLightTarget = useRef(0);
  const fillLightRaf = useRef<number | null>(null);
  const lastBrightSample = useRef(0);
  const nameChipTimer = useRef<number | null>(null);

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
        const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(mode === "environment" && Boolean(capabilities?.torch));
      } catch {
        setTorchSupported(false);
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

  // Geometry-aware live preview
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
    const LIVE_MAX_W = heavy ? 560 : 960;
    let frame = 0;
    const tmp = document.createElement("canvas");
    const tick = () => {
      if (!video.videoWidth || !video.videoHeight) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      frame++;
      if (heavy && frame % 3 === 0) {
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
          ? applyLensOpticalEnhanced(tmp, lens, "native", { watermark: false, maxEdge: LIVE_MAX_W })
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
  }, [cameraOn, lens, phase, facingMode]);

  // Pure white front-camera fill light with circular face window
  useEffect(() => {
    const active =
      cameraOn && facingMode === "user" && phase !== "processing" && phase !== "result";
    if (!active) {
      fillLightTarget.current = 0;
      setFillLightOpacity(0);
      if (fillLightRaf.current != null) {
        cancelAnimationFrame(fillLightRaf.current);
        fillLightRaf.current = null;
      }
      return;
    }
    let cancelled = false;
    let lastCheck = 0;
    const tick = (now: number) => {
      if (cancelled) return;
      if (now - lastCheck > 250) {
        lastCheck = now;
        const video = videoRef.current;
        if (video && video.videoWidth > 0) {
          try {
            const bright = estimateBrightness(video);
            lastBrightSample.current = bright;
            const faceLens =
              lensId === "lens_infraglow" ||
              lensId === "lens_sumo" ||
              lensId === "lens_portrait_bloom";
            if (faceLens || bright < 0.28) {
              fillLightTarget.current = 1;
            } else if (bright > 0.4) {
              fillLightTarget.current = 0;
            }
          } catch {
            /* ignore */
          }
        }
      }
      setFillLightOpacity((prev) => {
        const target = fillLightTarget.current;
        const next = prev + (target - prev) * 0.12;
        if (Math.abs(next - target) < 0.008) return target;
        return next;
      });
      fillLightRaf.current = requestAnimationFrame(tick);
    };
    fillLightRaf.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (fillLightRaf.current != null) {
        cancelAnimationFrame(fillLightRaf.current);
        fillLightRaf.current = null;
      }
    };
  }, [cameraOn, facingMode, phase, lensId]);

  useEffect(() => {
    if (lensId !== "lens_sumo" || phase === "result" || phase === "processing") {
      setFaceGuideMsg(null);
      return;
    }
    setFaceGuideMsg("Place your face inside the frame");
    void ensureSumoBoard();
  }, [lensId, phase]);

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

  /** Lens changes processing only — never clear uploaded sourceImage */
  const selectLens = useCallback(
    (id: string) => {
      const next = getCameraLensById(id);
      if (!next) return;
      setLensId(id);
      showLensName(next);
      setPreviewUrl(null);
      clearResultVariants();
      if (id === "lens_sumo") void ensureSumoBoard();
      if (sourceUrl) {
        setPhase("ready");
      } else {
        setPhase(cameraOn ? "ready" : "idle");
      }
    },
    [cameraOn, clearResultVariants, showLensName, sourceUrl],
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
    playShutterClick();
    setPhase("processing");
    try {
      const shouldWm = wantWm && (!isPaid || active.tier === "normal");
      const out = applyLensOpticalEnhanced(canvas, active, "native", {
        watermark: shouldWm,
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
    }
  };

  const onShutter = async () => {
    if (!lens) {
      toast.error("Pick a lens first");
      return;
    }
    if (lens.id === "lens_sumo") {
      await ensureSumoBoard();
    }
    const runCapture = async (frame: HTMLCanvasElement, fromUpload: boolean) => {
      if (lens.id === "lens_sumo") {
        const { detectPrimaryFace } = await import("@/lib/lens-camera/opt-core");
        const face = detectPrimaryFace(frame);
        const now = Date.now();
        if (!face || face.confidence < 0.1) {
          if (now - faceMsgCooldown.current > 2500) {
            faceMsgCooldown.current = now;
            toast.message("Couldn't focus on your face — move closer or improve lighting.");
          }
          setFaceGuideMsg("Move your face inside the frame");
          return;
        }
        setFaceGuideMsg(null);
      }
      await applyFromCanvas(frame, lens, fromUpload);
    };
    if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
      const frame = captureVideoFrame(videoRef.current, facingMode === "user");
      await runCapture(frame, false);
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
      await runCapture(c, true);
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
        <div className="h-10 w-10" aria-hidden />
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden pb-[11.5rem] touch-pan-y"
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
        <canvas ref={liveCanvasRef} className="absolute inset-0 block h-full w-full bg-black" />

        {fillLightOpacity > 0.01 && showCamera && (
          <div
            className="pointer-events-none absolute inset-0 z-[5] bg-white"
            style={{
              opacity: fillLightOpacity,
              transition: "opacity 120ms linear",
              WebkitMaskImage:
                "radial-gradient(circle at 50% 38%, transparent min(34vw, 28vh), black min(34vw, 28vh))",
              maskImage:
                "radial-gradient(circle at 50% 38%, transparent min(34vw, 28vh), black min(34vw, 28vh))",
            }}
            aria-hidden
          />
        )}

        {showStill && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black" style={{ bottom: "11.5rem" }}>
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
            <ApertureLoader />
          </div>
        )}

        {nameChip && phase !== "result" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">{nameChip}</span>
          </div>
        )}
        {faceGuideMsg && phase === "ready" && lensId === "lens_sumo" && (
          <div className="pointer-events-none absolute left-1/2 top-[28%] z-20 -translate-x-1/2">
            <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">{faceGuideMsg}</span>
          </div>
        )}
        {lensId === "lens_sumo" && showCamera && phase === "ready" && (
          <div
            className="pointer-events-none absolute left-1/2 z-20 rounded-full border-2 border-white/70"
            style={{ top: "38%", width: "min(68vw, 56vh)", height: "min(68vw, 56vh)", transform: "translate(-50%, -50%)" }}
            aria-hidden
          />
        )}
        {showCamera && !nameChip && phase === "ready" && lensId !== "lens_sumo" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2">
            <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">← Swipe to change lens →</span>
          </div>
        )}

        {showCamera && (
          <div className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 flex flex-col gap-2">
            <button type="button" onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")} className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md" aria-label="Flip camera">
              <SwitchCamera className="h-5 w-5" />
            </button>
            {torchSupported && (
              <button type="button" onClick={() => void toggleTorch()} className={cn("grid h-11 w-11 place-items-center rounded-full backdrop-blur-md", torchOn ? "bg-amber-400 text-black" : "bg-black/45 text-white")} aria-label="Toggle light">
                <Zap className={cn("h-5 w-5", torchOn && "fill-current")} />
              </button>
            )}
          </div>
        )}
      </div>

      {phase !== "result" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col">
          <div className="pointer-events-none bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
            <div ref={carouselRef} className="pointer-events-auto mb-2 flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
              {ORDERED_ROSTER.map((l) => {
                const selected = lensId === l.id;
                const isAi = l.tier === "ai";
                const thumb = SAMPLE_BY_ID[l.id];
                return (
                  <button key={l.id} type="button" data-lens-id={l.id} onClick={() => selectLens(l.id)} className="flex w-[4.4rem] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95">
                    <div
                      className={cn("relative h-[3.5rem] w-[3.5rem] shrink-0 overflow-hidden rounded-full transition-all", selected ? "scale-110" : "ring-1 ring-white/25")}
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

          <div className="pointer-events-auto flex items-center justify-center gap-10 bg-black px-6 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => inputRef.current?.click()} className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="Gallery">
              <ImagePlus className="h-5 w-5 text-white/90" />
            </button>
            <button type="button" disabled={phase === "processing" || !lens} onClick={() => void onShutter()} className={cn("relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full transition-transform", phase === "processing" || !lens ? "opacity-40" : "active:scale-90")} aria-label="Capture">
              <span className="absolute inset-0 rounded-full border-[3px] border-white" />
              <span className={cn("h-[3.55rem] w-[3.55rem] rounded-full bg-white", phase === "processing" && "opacity-60")} />
            </button>
            <Link to={MORE_LENSES_ROUTE} className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="More lenses" title="More lenses">
              <LayoutGrid className="h-5 w-5 text-white/90" />
            </Link>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          {lens && (
            <p className="text-center text-xs font-medium text-white/70">
              {lens.name}{lens.tier === "ai" ? " · AI" : " · Free"}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black" onClick={() => void triggerBrowserDownload(resultUrl, `motio-lens-${lensId ?? "shot"}.jpg`)}>
              <Download className="h-4 w-4" /> Download
            </button>
            {canShare && (
              <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold text-white" onClick={() => void onShare()}>
                <Share2 className="h-4 w-4" /> Share
              </button>
            )}
            <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-semibold text-white" onClick={onRetake}>
              <RotateCcw className="h-4 w-4" /> {resultFromUpload ? "Edit again" : "Retake"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={wmBusy}
              onClick={() => void toggleWatermark()}
              aria-pressed={isPaid ? resultWm : true}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60",
                !isPaid ? "bg-white/10 text-white/70" : resultWm ? "bg-white/15 text-white" : "bg-white text-black",
              )}
            >
              {isPaid ? <Droplet className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {wmBusy ? "Updating…" : `Watermark: ${resultWm ? "On" : "Off"}`}
            </button>
            <button type="button" className="h-11 px-3 text-sm font-medium text-white/60" onClick={onNewShot}>
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
