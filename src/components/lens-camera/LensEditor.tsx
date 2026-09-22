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
import { disposeFaceLandmarker } from "@/lib/lens-camera/face-track";
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
