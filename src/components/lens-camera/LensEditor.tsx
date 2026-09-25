/**
 * Motio2edit Lenses — single-viewport Snapchat-style camera UI.
 * ONE visual preview at a time. Video is hero; canvas overlays same geometry.
 * Throttled optical RAF (~12fps). Lens change never restarts camera.
 * Shutter is the fixed center anchor of the lens carousel.
 * One swipe = one lens. Haptics gated by Profile "Haptics" preference.
 * Face-dependent lenses never invent synthetic faces (see face-track).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ImagePlus,
  Info,
  LayoutGrid,
  Loader2,
  Share2,
  SwitchCamera,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  getCameraLensById,
  getMainCameraCarousel,
  isAiLens,
  LENS_INFO,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import { disposeFaceLandmarker, warmFaceLandmarker } from "@/lib/lens-camera/face-track";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import {
  applyLensOpticalEnhanced,
  canvasToBlob,
  captureVideoFrame,
  formatDateTimeOverlay,
} from "@/lib/lens-camera/optical-engine";
import { runLensAiPlusGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

const DEFAULT_FREE_LENS = "lens_crown";
const SLOT_SPACING_PX = 68;
const OPTICAL_INTERVAL_MS = 80;
const LIVE_MAX_W = 640;

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

/** Read existing Profile preference "Haptics" (localStorage). Default ON. */
function isHapticsEnabled(): boolean {
  try {
    const v =
      localStorage.getItem("Haptics") ??
      localStorage.getItem("haptics") ??
      localStorage.getItem("motio-haptics") ??
      localStorage.getItem("motio2edit-haptics");
    if (v == null) return true;
    const low = v.toLowerCase();
    return low !== "off" && low !== "false" && low !== "0";
  } catch {
    return true;
  }
}

function hapticOnce() {
  if (!isHapticsEnabled()) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(8);
  } catch {
    /* unsupported */
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

const ORDERED_ROSTER = getMainCameraCarousel();
const LENS_COUNT = ORDERED_ROSTER.length;

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const liveRafRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastProcessTimeRef = useRef(0);
  const lensRef = useRef<CameraLensDef | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");
  const cameraOnRef = useRef(false);
  const phaseRef = useRef<"idle" | "ready" | "processing" | "result">("idle");
  const liveFxOkRef = useRef(false);
  const previewBusy = useRef(false);
  const didAutoStart = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const dateTimeTextRef = useRef("");
  const tmpCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const resolvedInitial =
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : DEFAULT_FREE_LENS;

  const [phase, setPhase] = useState<"idle" | "ready" | "processing" | "result">("idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [lensId, setLensId] = useState<string>(resolvedInitial);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [wantWm, setWantWm] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [fxVisible, setFxVisible] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [apertureOn, setApertureOn] = useState(false);
  const [farZoom, setFarZoom] = useState(1);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time" | "both">("both");
  const [dateTimeStyle, setDateTimeStyle] = useState<"digital" | "clean" | "mono" | "classic">("clean");
  const [colourNegative, setColourNegative] = useState(false);

  const lens = useMemo(
    () => getCameraLensById(lensId) ?? ORDERED_ROSTER[0] ?? null,
    [lensId],
  );

  const activeIndex = useMemo(() => {
    const i = ORDERED_ROSTER.findIndex((l) => l.id === lensId);
    return i < 0 ? 0 : i;
  }, [lensId]);

  const carouselSlots = useMemo(() => {
    const slots: { lens: CameraLensDef; offset: number; key: string }[] = [];
    for (let off = -2; off <= 2; off++) {
      const i = (activeIndex + off + LENS_COUNT) % LENS_COUNT;
      const l = ORDERED_ROSTER[i];
      slots.push({ lens: l, offset: off, key: `${l.id}@${off}` });
    }
    return slots;
  }, [activeIndex]);

  useEffect(() => {
    lensRef.current = lens;
  }, [lens]);
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);
  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const plan =
      (user as { plan?: string } | null)?.plan ||
      (user as { subscription?: { status?: string } } | null)?.subscription?.status;
    setIsPaid(!!plan && plan !== "free");
    if (!plan || plan === "free") setWantWm(true);
  }, [user]);

  useEffect(() => {
    if (lensId !== "lens_date_time") return;
    const tick = () => {
      dateTimeTextRef.current = formatDateTimeOverlay(dateTimeMode);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lensId, dateTimeMode]);

  // NOTE: Full implementation continues — this intermediate push is incomplete.
  // See /home/workdir/artifacts/LensEditor_RESTORE.tsx for the complete file.
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      <p className="p-6 text-center text-sm text-white/70">
        Restoring full Lens Studio… please use LensEditor_RESTORE.tsx
      </p>
    </div>
  );
}

export default LensEditor;
