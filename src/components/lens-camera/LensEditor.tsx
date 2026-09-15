/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Live optical preview. Watermark only on final free-tier output.
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

/** Free lenses first, then AI */
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
    if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
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
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.transform = face === "user" ? "scaleX(-1)" : "none";
          await videoRef.current.play();
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

  // Upload still preview
  useEffect(() => {
    if (
      cameraOn ||
      !sourceUrl ||
      !lens ||
      phase === "processing" ||
      phase === "idle" ||
      phase === "result"
    ) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (previewBusy.current) return;
      previewBusy.current = true;
      try {
        const img = await loadImage(sourceUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(img.naturalWidth, 1280);
        canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = applyLensOpticalEnhanced(canvas, lens, "native", { watermark: false });
        const blob = await canvasToBlob(out, "image/jpeg", 0.88);
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

  // Live optical preview — higher quality, still safe on heavy warps
  useEffect(() => {
    if (!cameraOn || !lens || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
      return;
    }
    const video = videoRef.current;
    const canvas = liveCanvasRef.current;
    if (!video || !canvas) return;

    const heavy = HEAVY_LENS_IDS.has(lens.id);
    // Higher preview quality (was 280/400 — too soft)
    const LIVE_MAX_W = heavy ? 480 : 720;
    let frame = 0;
    const tmp = document.createElement("canvas");

    const tick = () => {
      if (!video.videoWidth) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }
      frame++;
      // Heavy warps only: skip every 3rd frame
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
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, w, h);
      if (facingMode === "user") {
        tctx.translate(w, 0);
        tctx.scale(-1, 1);
      }
      tctx.drawImage(video, 0, 0, w, h);
      try {
        const out = applyLensOpticalEnhanced(tmp, lens, "native", { watermark: false });
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(out, 0, 0);
        canvas.style.display = "block";
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
      if (liveCanvasRef.current) liveCanvasRef.current.style.display = "none";
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
      c.getContext("2d")!.drawImage(img, 0, 0);
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
      const file = new File([blob], `motio-lens-${lensId ?? "shot"}.jpg`, {
        type: "image/jpeg",
      });
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
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

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
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/90">
            MOTIO2EDIT · LENSES
          </p>
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

      {/* Camera stage — stops above bottom controls */}
      <div className="relative min-h-0 flex-1 pb-[11.5rem]">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            !showCamera && "invisible",
          )}
        />
        <canvas
          ref={liveCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ display: "none" }}
        />

        {showStill && (
          <img
            src={stillSrc!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {phase === "idle" && !cameraOn && !stillSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950 px-6">
            <p className="text-center text-sm text-white/60">
              Allow camera or upload a photo
            </p>
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
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold"
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
          <div className="pointer-events-none absolute left-1/2 top-[22%] z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">
              {nameChip}
            </span>
          </div>
        )}

        {showCamera && (
          <button
            type="button"
            onClick={() =>
              void startCamera(facingMode === "user" ? "environment" : "user")
            }
            className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md"
            aria-label="Flip camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bottom chrome — carousel swipe isolated from shutter */}
      {phase !== "result" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          {/* Swipe only lives in this strip */}
          <div className="pointer-events-none bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
            <div
              ref={carouselRef}
              className="pointer-events-auto mb-2 flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {ORDERED_ROSTER.map((l) => {
                const selected = lensId === l.id;
                const isAi = l.tier === "ai";
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
                        "relative h-[3.5rem] w-[3.5rem] overflow-hidden rounded-full transition-all",
                        selected
                          ? "scale-110 ring-[3px] ring-white shadow-lg"
                          : "ring-1 ring-white/25",
                      )}
                      style={selected ? { boxShadow: `0 0 0 2px ${l.color}` } : undefined}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div
                          className="grid h-full w-full place-items-center bg-zinc-800 text-[11px] font-bold"
                          style={{ color: l.color }}
                        >
                          {l.code}
                        </div>
                      )}
                      {isAi && (
                        <span className="absolute bottom-0 left-0 right-0 bg-orange-500/90 py-0.5 text-center text-[8px] font-bold text-white">
                          AI
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "line-clamp-1 max-w-full text-center text-[10px] font-medium",
                        selected ? "text-white" : "text-white/55",
                      )}
                    >
                      {l.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shutter row — no horizontal scroll, separate touch target */}
          <div className="pointer-events-auto flex items-center justify-center gap-10 bg-black/90 px-6 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="Gallery"
            >
              <ImagePlus className="h-5 w-5 text-white/90" />
            </button>

            <button
              type="button"
              disabled={phase === "processing" || !lens}
              onClick={() => void onShutter()}
              className={cn(
                "relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full transition-transform",
                phase === "processing" || !lens ? "opacity-40" : "active:scale-90",
              )}
              aria-label="Capture"
            >
              <span className="absolute inset-0 rounded-full border-[3px] border-white" />
              <span
                className={cn(
                  "h-[3.55rem] w-[3.55rem] rounded-full bg-white",
                  phase === "processing" && "opacity-60",
                )}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                void startCamera(facingMode === "user" ? "environment" : "user")
              }
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="Flip"
            >
              <SwitchCamera className="h-5 w-5 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
          {lens && (
            <p className="text-center text-xs font-medium text-white/70">
              {lens.name}
              {lens.tier === "ai" ? " · AI" : " · Free"}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black"
              onClick={() =>
                void triggerBrowserDownload(
                  resultUrl,
                  `motio-lens-${lensId ?? "shot"}.jpg`,
                )
              }
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            {canShare && (
              <button
                type="button"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold text-white"
                onClick={() => void onShare()}
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )}
            <button
              type="button"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-semibold text-white"
              onClick={onRetake}
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </button>
          </div>
          <button
            type="button"
            className="h-11 text-sm font-medium text-white/60"
            onClick={() => {
              setPhase("idle");
              setResultUrl(null);
              setSourceUrl(null);
              setPreviewUrl(null);
              setLensId(DEFAULT_FREE_LENS);
              void startCamera("user");
            }}
          >
            New shot
          </button>
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
