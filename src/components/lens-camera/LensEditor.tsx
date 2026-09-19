/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
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
} from "@/lib/lens-camera/optical-engine";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_natural_frame";

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

const SAMPLE_BY_ID = Object.fromEntries(
  getLensSampleCards().map((s) => [s.lensId, s.imageUrl]),
);

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
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [nameChip, setNameChip] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [liveFxOn, setLiveFxOn] = useState(false);
  const nameChipTimer = useRef<number | null>(null);

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
          setPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
          });
        }
        setFacingMode(face);
        setCameraOn(true);
        setPhase("ready");
        setResultUrl(null);
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
    if (cameraOn || !sourceUrl || !lens || phase === "processing" || phase === "idle" || phase === "result") {
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
        const out = applyLensOpticalEnhanced(canvas, lens, "native", { watermark: false });
        const blob = await canvasToBlob(out, "image/jpeg", 0.92);
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

  // Single full-screen preview: canvas sized to container × DPR, video drawn with cover-fit
  useEffect(() => {
    if (!cameraOn || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      setLiveFxOn(false);
      return;
    }
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });

    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;
    const heavy = lens ? HEAVY_LENS_IDS.has(lens.id) : false;
    const LIVE_MAX_W = heavy ? 560 : 960;
    let frame = 0;
    const tmp = document.createElement("canvas");

    const sizeDisplayCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return { cssW: 0, cssH: 0, dw: 0, dh: 0 };
      const cssW = Math.max(1, parent.clientWidth);
      const cssH = Math.max(1, parent.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const dw = Math.max(1, Math.round(cssW * dpr));
      const dh = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== dw || canvas.height !== dh) {
        canvas.width = dw;
        canvas.height = dh;
      }
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.style.objectFit = "fill";
      return { cssW, cssH, dw, dh };
    };

    const drawCover = (
      ctx: CanvasRenderingContext2D,
      source: CanvasImageSource,
      sw: number,
      sh: number,
      dw: number,
      dh: number,
    ) => {
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
      const scale = Math.max(dw / sw, dh / sh);
      const rw = sw * scale;
      const rh = sh * scale;
      const ox = (dw - rw) / 2;
      const oy = (dh - rh) / 2;
      ctx.drawImage(source, 0, 0, sw, sh, ox, oy, rw, rh);
    };

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

      const { dw, dh } = sizeDisplayCanvas();
      if (dw <= 0 || dh <= 0) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const scale = Math.min(1, LIVE_MAX_W / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
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
        const out = lens
          ? applyLensOpticalEnhanced(tmp, lens, "native", {
              watermark: false,
              maxEdge: LIVE_MAX_W,
            })
          : tmp;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, dw, dh);
        drawCover(ctx, out, out.width, out.height, dw, dh);
        setLiveFxOn(true);
      } catch {
        /* keep last */
      }
      liveRafRef.current = requestAnimationFrame(tick);
    };

    liveRafRef.current = requestAnimationFrame(tick);

    const onResize = () => sizeDisplayCanvas();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      ro = new ResizeObserver(onResize);
      ro.observe(canvas.parentElement);
    }

    return () => {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
    };
  }, [cameraOn, lens, phase, facingMode]);

  const flashNameChip = useCallback((name: string) => {
    if (nameChipTimer.current) window.clearTimeout(nameChipTimer.current);
    setNameChip(name);
    nameChipTimer.current = window.setTimeout(() => setNameChip(null), 1600);
  }, []);

  const selectLens = useCallback(
    (id: string, name: string) => {
      setLensId(id);
      flashNameChip(name);
      requestAnimationFrame(() => {
        const root = carouselRef.current;
        if (!root) return;
        const btn = root.querySelector(`[data-lens-id="${id}"]`) as HTMLElement | null;
        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
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
      if (Math.abs(dx) < 36) return;
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
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setSourceUrl(URL.createObjectURL(file));
    setPreviewUrl(null);
    setResultUrl(null);
    setPhase("ready");
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
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

  const stillSrc = resultUrl || previewUrl || sourceUrl;
  const showCamera = cameraOn && phase !== "result";
  const showStill = !showCamera && stillSrc && phase !== "idle";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link
          to="/studio/image/lenses"
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/90">MOTIO2EDIT · LENSES</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
          aria-label="Upload photo"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
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
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="pointer-events-none absolute opacity-0"
          style={{ width: 1, height: 1, left: -9999, top: -9999 }}
        />
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0 h-full w-full bg-black"
          style={{ objectFit: "fill", display: "block" }}
        />

        {showStill && (
          <img src={stillSrc!} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {phase === "idle" && !cameraOn && !stillSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950 px-6">
            <p className="text-center text-sm text-white/60">Allow camera or upload a photo</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void startCamera("user")}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
              >
                Open Camera
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/50 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {nameChip && phase !== "result" && (
          <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-20 flex justify-center">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">
              {nameChip}
            </span>
          </div>
        )}

        {showCamera && !nameChip && phase === "ready" && (
          <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-20 flex justify-center">
            <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">
              {lens?.name ?? "Lens"}
              {liveFxOn ? " · Live" : ""}
            </span>
          </div>
        )}

        {showCamera && (
          <div className="absolute right-3 top-[5.5rem] z-20 flex flex-col gap-2">
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
                <Zap className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {phase !== "result" && (
        <div className="absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-none bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
            <div
              ref={carouselRef}
              className="pointer-events-auto mb-2 flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {ORDERED_ROSTER.map((l) => {
                const selected = l.id === lensId;
                const thumb = SAMPLE_BY_ID[l.id];
                return (
                  <button
                    key={l.id}
                    type="button"
                    data-lens-id={l.id}
                    onClick={() => selectLens(l.id, l.name)}
                    className="flex w-[4.4rem] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <div
                      className={cn(
                        "h-[4.4rem] w-[4.4rem] overflow-hidden rounded-full bg-zinc-800",
                        selected ? "scale-110 ring-[3px] ring-white shadow-lg" : "ring-1 ring-white/25",
                      )}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] text-white/40">
                          {l.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="line-clamp-1 text-center text-[10px] font-medium text-white/80">
                      {l.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className="pointer-events-auto flex items-center justify-center gap-10 bg-black/90 px-6 pt-1"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10"
                aria-label="Upload"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void onShutter()}
                disabled={phase === "processing" || !lens}
                className={cn(
                  "grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full border-[3px] border-white bg-white/15",
                  phase === "processing" || !lens ? "opacity-40" : "active:scale-90",
                )}
                aria-label="Capture"
              >
                <span
                  className={cn(
                    "h-14 w-14 rounded-full bg-white",
                    phase === "processing" && "opacity-60",
                  )}
                />
              </button>
              <button
                type="button"
                onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10"
                aria-label="Flip"
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void triggerBrowserDownload(resultUrl, `motio-lens-${lensId ?? "shot"}.jpg`)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={() => void onShare()}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/30 text-sm font-semibold"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onRetake}
              className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-medium text-white/90"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setPhase("idle");
                setResultUrl(null);
                setPreviewUrl(null);
              }}
              className="text-center text-xs text-white/50"
            >
              Done
            </button>
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
