/**
 * Motio2edit Lenses — camera + upload optical lens product.
 * Idle: Camera / Upload only (no lens tray spam).
 * Ready: lens tray + shutter after camera or photo input.
 * Header: Motio2edit · LENSES.
 * Watermark ONLY on final output (never live/preview).
 * Same lens definition for live capture and uploaded image.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, SwitchCamera, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CAMERA_LENSES,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import {
  captureVideoFrame,
  applyLensOpticalEnhanced,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { useAuth } from "@/lib/auth";
import { isFreePlan } from "@/lib/plan";

const LIVE_MAX_W = 480;

export function LensEditor() {
  const { profile } = useAuth();
  const isFree = isFreePlan(profile?.plan);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveRafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"idle" | "ready" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [activeId, setActiveId] = useState(CAMERA_LENSES[0]?.id ?? "");
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = CAMERA_LENSES.find((l) => l.id === activeId) ?? CAMERA_LENSES[0];

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

  const startCamera = useCallback(async (face: "user" | "environment" = facing) => {
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
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: face },
            audio: false,
          });
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
      setFacing(face);
      setCameraOn(true);
      setPhase("ready");
      setSourceCanvas(null);
      setResultUrl(null);
    } catch (e) {
      toast.error("Camera permission denied or unavailable");
      console.error(e);
    }
  }, [facing, stopCamera]);

  // Live optical preview on camera feed
  useEffect(() => {
    if (!cameraOn || !active || phase !== "ready") {
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
      if (facing === "user") {
        tctx.translate(w, 0);
        tctx.scale(-1, 1);
      }
      tctx.drawImage(video, 0, 0, w, h);
      try {
        const out = applyLensOpticalEnhanced(tmp, active, "native", { watermark: false });
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
  }, [cameraOn, active, phase, facing]);

  const onPick = useCallback(async (file: File | null) => {
    if (!file) return;
    stopCamera();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    setSourceCanvas(c);
    setPhase("ready");
    setResultUrl(null);
  }, [stopCamera]);

  const onShutter = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    try {
      let canvas: HTMLCanvasElement;
      if (cameraOn && videoRef.current && videoRef.current.videoWidth > 0) {
        canvas = captureVideoFrame(videoRef.current, facing === "user");
      } else if (sourceCanvas) {
        canvas = sourceCanvas;
      } else {
        toast.error("No image or camera frame");
        return;
      }
      const shouldWm = isFree;
      const out = applyLensOpticalEnhanced(canvas, active, "native", { watermark: shouldWm });
      const blob = await canvasToBlob(out, "image/jpeg", 0.92);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setPhase("result");
      stopCamera();
    } catch (e) {
      toast.error("Lens apply failed");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [active, busy, cameraOn, facing, sourceCanvas, isFree, stopCamera]);

  const onDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `motio-lens-${active?.id ?? "shot"}.jpg`;
    a.click();
  }, [resultUrl, active]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="text-sm font-semibold tracking-wide">Motio2edit · LENSES</div>
        {phase === "result" && (
          <Button size="sm" variant="ghost" onClick={() => { setPhase("idle"); setResultUrl(null); setSourceCanvas(null); }}>
            New
          </Button>
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {phase === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <p className="text-center text-sm text-muted-foreground">
              Capture or upload a photo, then pick a lens.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => void startCamera()} className="gap-2">
                <Camera className="h-4 w-4" /> Camera
              </Button>
              <Button variant="secondary" onClick={() => inputRef.current?.click()} className="gap-2">
                <ImageIcon className="h-4 w-4" /> Upload
              </Button>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn("absolute inset-0 h-full w-full object-contain", !cameraOn && "hidden")}
            />
            <canvas
              ref={liveCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              style={{ display: "none" }}
            />
            {sourceCanvas && !cameraOn && (
              <img
                src={sourceCanvas.toDataURL("image/jpeg", 0.85)}
                alt="Source"
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 px-2">
              {cameraOn && (
                <Button size="icon" variant="secondary" className="rounded-full" onClick={() => void startCamera(facing === "user" ? "environment" : "user")}>
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}

        {phase === "result" && resultUrl && (
          <img src={resultUrl} alt="Lens result" className="absolute inset-0 h-full w-full object-contain" />
        )}
      </div>

      {phase === "ready" && (
        <div className="shrink-0 border-t bg-background/95 p-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CAMERA_LENSES.map((lens) => (
              <button
                key={lens.id}
                type="button"
                onClick={() => setActiveId(lens.id)}
                className={cn(
                  "flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg p-1 text-[10px]",
                  activeId === lens.id ? "bg-primary/15 ring-1 ring-primary" : "opacity-80",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="line-clamp-2 text-center leading-tight">{lens.name}</span>
              </button>
            ))}
          </div>
          <Button className="w-full gap-2" disabled={busy} onClick={() => void onShutter()}>
            <Camera className="h-4 w-4" />
            {busy ? "Applying…" : "Capture"}
          </Button>
        </div>
      )}

      {phase === "result" && (
        <div className="flex shrink-0 gap-2 border-t p-3">
          <Button className="flex-1 gap-2" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
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
