/**
 * Motio2edit Lenses — camera + upload optical lens product.
 * Live optical preview on camera (rAF, 480px cap). Watermark only on final output.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Download, ImagePlus, Loader2, SwitchCamera,
} from "lucide-react";
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
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

function playShutterClick() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = 880;
    g.gain.value = 0.04;
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.06);
  } catch { /* ignore */ }
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

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewBusy = useRef(false);

  const [phase, setPhase] = useState<"idle" | "ready" | "processing" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [lensId, setLensId] = useState<string | null>(
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : null,
  );
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

  const startCamera = useCallback(async (face: "user" | "environment" = facingMode) => {
    stopCamera();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face }, audio: false });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
      toast.error("Camera unavailable");
      console.error(e);
    }
  }, [facingMode, stopCamera]);

  // Upload still preview
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
      } catch { /* ignore */ }
      finally { previewBusy.current = false; }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [lens, sourceUrl, phase, cameraOn]);

  // Live optical preview on camera
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
    const LIVE_MAX_W = 480;
    const tick = () => {
      if (!video.videoWidth) {
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
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d")!;
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
      } catch { /* keep last */ }
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
    nameChipTimer.current = window.setTimeout(() => setNameChip(null), 1400);
  }, []);

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
          const charged = await chargeLensGeneration({ data: { lensId: active.id, generationId } });
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

  const stillSrc = resultUrl || previewUrl || sourceUrl;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="z-20 flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Link to="/studio/image/lenses" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">Motio2edit · LENSES</p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-3">
        {phase === "idle" && !cameraOn && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-muted-foreground">Camera or upload, then pick a lens</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => void startCamera()} className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                <Camera className="h-4 w-4" /> Camera
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold">
                <ImagePlus className="h-4 w-4" /> Upload
              </button>
            </div>
          </div>
        )}

        {cameraOn && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black">
            <video ref={videoRef} playsInline muted autoPlay className="mx-auto max-h-[min(58dvh,600px)] w-full object-cover" />
            <canvas ref={liveCanvasRef} className="pointer-events-none absolute inset-0 mx-auto h-full max-h-[min(58dvh,600px)] w-full object-cover" style={{ display: "none" }} />
            <button type="button" onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")} className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md" aria-label="Switch camera">
              <SwitchCamera className="h-3.5 w-3.5" />
              {facingMode === "user" ? "Rear" : "Front"}
            </button>
          </div>
        )}

        {!cameraOn && (phase === "ready" || phase === "processing" || phase === "result") && stillSrc && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            <img src={stillSrc} alt="" className="mx-auto max-h-[min(58dvh,600px)] w-full object-contain" />
            {phase === "processing" && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            )}
          </div>
        )}

        {nameChip && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2">
            <span className="rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-xl">{nameChip}</span>
          </div>
        )}
      </div>

      {(cameraOn || phase === "ready" || phase === "processing") && (
        <div className="shrink-0 border-t bg-background/95 p-2 backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CAMERA_LENS_ROSTER.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => { setLensId(l.id); flashNameChip(l.name); }}
                className={cn(
                  "flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 text-[10px]",
                  lensId === l.id ? "bg-primary/15 ring-1 ring-primary" : "opacity-80",
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-xs font-bold">{l.name.slice(0, 2)}</div>
                <span className="line-clamp-2 text-center leading-tight">{l.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={phase === "processing" || !lens}
            onClick={() => void onShutter()}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold",
              phase === "processing" || !lens ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <Camera className="h-4 w-4" />
            {phase === "processing" ? "Applying…" : "Capture"}
          </button>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="flex shrink-0 gap-2 border-t p-3">
          <button
            type="button"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
            onClick={() => void triggerBrowserDownload(resultUrl, `motio-lens-${lensId ?? "shot"}.jpg`)}
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <button
            type="button"
            className="h-11 rounded-2xl border px-4 text-sm font-semibold"
            onClick={() => {
              setPhase("idle");
              setResultUrl(null);
              setSourceUrl(null);
              setPreviewUrl(null);
              setLensId(null);
            }}
          >
            New
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </div>
  );
}

export default LensEditor;
