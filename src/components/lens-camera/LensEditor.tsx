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
