/**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 *
 * Common lenses = free (local optical only). AI+ = plan entitlement after capture/upload only.
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
import {
  runLensAiPlusGeneration,
} from "@/lib/lens-camera/lens-generation.functions";
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
const ORDERED_ROSTER = CAMERA_LENS_ROSTER;

const HEAVY_LENS_IDS = new Set([
  "lens_perspective_stretch",
  "lens_fisheye_orbit",
  "lens_ultrawide_horizon",
  "lens_widevista",
  "lens_swirl_depth",
  "lens_architect_align",
]);

const LIGHTWEIGHT_LENS_IDS = new Set([
  "lens_hd_4k",
  "lens_windows_colour",
  "lens_date_time",
  "lens_snake_view",
  "lens_retro_80s",
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
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const resultVariantsRef = useRef<{ wm?: string; clean?: string }>({});
  const resultSourceRef = useRef<HTMLCanvasElement | null>(null);
  const shutterLockRef = useRef(false);
  const dateTimeTextRef = useRef("");
  const nameChipTimer = useRef<number | null>(null);

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
  const [farZoom, setFarZoom] = useState(12);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time" | "both">("both");
  const [dateTimeStyle, setDateTimeStyle] = useState<"digital" | "clean" | "mono" | "classic">("clean");
  const [colourNegative, setColourNegative] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const [dateTimeDisplay, setDateTimeDisplay] = useState("");

  useEffect(() => {
    const plan =
      (user as { plan?: string } | null)?.plan ||
      (user as { subscription?: { status?: string } } | null)?.subscription?.status;
    const email = ((user as { email?: string } | null)?.email ?? "").toLowerCase();
    const admin = email === "firstaimrun89@gmail.com";
    setIsPaid(admin || (!!plan && plan !== "free"));
    if (!admin && (!plan || plan === "free")) setWantWm(true);
  }, [user]);

  // CONTINUED_IN_NEXT_CHUNK_PLACEHOLDER - THIS WILL BE INCOMPLETE
