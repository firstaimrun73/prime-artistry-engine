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
