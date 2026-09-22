/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 *
 * Source image persists across lens changes. User can still re-pick after a result.
 * Live AR mode uses face tracking (MediaPipe) for crown/hat overlays.
 */
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  detectFace,
  disposeFaceLandmarker,
  warmFaceLandmarker,
  type FaceLandmarks,
} from "@/lib/lens-camera/face-track";
import { LENS_REGISTRY, type LensId, type LensDef } from "@/lib/lens-camera/lens-registry";
import { processLens } from "@/lib/lens-camera/lens-process";

const MAX_PREVIEW = 560;

type Phase = "idle" | "camera" | "preview" | "processing" | "result";

function resizeToMax(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  maxSide: number,
): HTMLCanvasElement {
  const w =
    "videoWidth" in source
      ? source.videoWidth
      : "naturalWidth" in source
        ? source.naturalWidth
        : source.width;
  const h =
    "videoHeight" in source
      ? source.videoHeight
      : "naturalHeight" in source
        ? source.naturalHeight
        : source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source as CanvasImageSource, 0, 0, cw, ch);
  return c;
}

function LensEditor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveRafRef = useRef<number | null>(null);
  const faceRef = useRef<FaceLandmarks | null>(null);
  const frameCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [lensId, setLensId] = useState<LensId>("none");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const lens = useMemo(() => LENS_REGISTRY.find((l) => l.id === lensId) ?? LENS_REGISTRY[0], [lensId]);

  const stopCamera = useCallback(() => {
    if (liveRafRef.current != null) {
      cancelAnimationFrame(liveRafRef.current);
      liveRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    disposeFaceLandmarker();
    setCameraOn(false);
    setTorchOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      stopCamera();
      warmFaceLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchSupported(!!caps?.torch);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      setPhase("camera");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera access failed");
      setPhase("idle");
    }
  }, [stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      /* torch not supported at runtime */
    }
  }, [torchOn]);

  const onPick = useCallback((file: File | null) => {
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = resizeToMax(img, 1280);
      sourceCanvasRef.current = c;
      setResultUrl(null);
      setPhase("preview");
      stopCamera();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Could not load image");
    };
    img.src = url;
  }, [stopCamera]);

  const runProcess = useCallback(async () => {
    const src = sourceCanvasRef.current;
    if (!src) return;
    setPhase("processing");
    setError(null);
    try {
      const out = await processLens(src, lensId, faceRef.current);
      const dataUrl = out.toDataURL("image/jpeg", 0.92);
      setResultUrl(dataUrl);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setPhase("preview");
    }
  }, [lensId]);

  // Live AR loop — only when camera is on and lens needs face
  useEffect(() => {
    if (!cameraOn || phase === "processing" || phase === "result") {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        liveRafRef.current = requestAnimationFrame(tick);
        return;
      }

      frameCountRef.current += 1;
      // Throttle face detect to every 3rd frame for performance
      if (frameCountRef.current % 3 === 0) {
        try {
          const face = await detectFace(video, canvas);
          faceRef.current = face;
        } catch {
          /* ignore frame errors */
        }
      }

      // Draw video + overlay
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }
        ctx.drawImage(video, 0, 0);
        // Lens-specific overlay drawing happens in processLens / live path
        // For live, simple placeholder markers when face present
        const f = faceRef.current;
        if (f && lensId !== "none") {
          ctx.save();
          ctx.strokeStyle = "rgba(255,200,50,0.6)";
          ctx.lineWidth = 2;
          const hx = f.headTop.x * canvas.width;
          const hy = f.headTop.y * canvas.height;
          ctx.beginPath();
          ctx.arc(hx, hy, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      liveRafRef.current = requestAnimationFrame(tick);
    };

    liveRafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
    };
  }, [cameraOn, phase, lensId]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
    setSwipeX(dx);
  };

  const onTouchEnd = () => {
    if (Math.abs(swipeX) > 60) {
      const idx = LENS_REGISTRY.findIndex((l) => l.id === lensId);
      const next = swipeX < 0 ? idx + 1 : idx - 1;
      if (next >= 0 && next < LENS_REGISTRY.length) {
        setLensId(LENS_REGISTRY[next].id);
      }
    }
    setSwipeX(0);
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Canvas / video area */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${cameraOn ? "" : "hidden"}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover ${cameraOn ? "" : "hidden"}`}
        />
        {resultUrl && (
          <img src={resultUrl} alt="result" className="absolute inset-0 w-full h-full object-contain" />
        )}
        {phase === "preview" && sourceCanvasRef.current && (
          <img
            src={sourceCanvasRef.current.toDataURL("image/jpeg", 0.85)}
            alt="preview"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        {error && (
          <div className="absolute top-4 left-0 right-0 text-center text-red-400 text-sm px-4">{error}</div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-4 pb-8 flex flex-col gap-3 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-2 overflow-x-auto">
          {LENS_REGISTRY.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLensId(l.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                lensId === l.id ? "bg-white text-black" : "bg-white/20"
              }`}
            >
              {l.emoji ?? l.name}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4">
          {!cameraOn && phase !== "result" && (
            <button type="button" onClick={startCamera} className="px-4 py-2 bg-white/20 rounded-full text-sm">
              Camera
            </button>
          )}
          {cameraOn && torchSupported && (
            <button type="button" onClick={toggleTorch} className="px-4 py-2 bg-white/20 rounded-full text-sm">
              {torchOn ? "Torch off" : "Torch"}
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-white/20 rounded-full text-sm"
          >
            Gallery
          </button>
          {(phase === "preview" || phase === "camera") && (
            <button type="button" onClick={runProcess} className="px-4 py-2 bg-pink-500 rounded-full text-sm font-medium">
              Apply
            </button>
          )}
          {phase === "result" && resultUrl && (
            <a href={resultUrl} download="lens.jpg" className="px-4 py-2 bg-green-500 rounded-full text-sm">
              Save
            </a>
          )}
          {cameraOn && (
            <button type="button" onClick={stopCamera} className="px-4 py-2 bg-white/20 rounded-full text-sm">
              Stop
            </button>
          )}
        </div>
      </div>

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
