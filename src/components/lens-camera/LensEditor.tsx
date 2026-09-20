 /**
 * Motio2edit Lenses — Snapchat-style full-screen camera UI.
 * Single canvas preview only (no split). Swipe to change lens. Torch when supported.
 *
 * Surgical fix pass (drop-in replacement for src/components/lens-camera/LensEditor.tsx):
 *  - Bottom safe-area is now part of the solid black control surface (no camera strip).
 *  - One button per job: gallery (bottom-left), shutter, More Lenses (bottom-right),
 *    flip camera + torch (right column). Duplicate header gallery + duplicate Flip removed.
 *  - X / close returns Home. Bottom-right button opens the More Lenses page.
 *  - Lens thumbnails: stable lensId -> image mapping, duplicated images are never shown twice.
 *  - Uploaded photos / results are displayed with object-contain (no crop, no zoom).
 *    Capture / output pipeline is untouched (native dimensions).
 *  - Camera-aperture processing animation replaces the Loader2 spinner.
 *  - Output-only Watermark control on the result screen (free = locked ON, paid = toggle).
 *    Toggling never re-charges credits and never touches the live preview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Download,
  Droplet,
  ImagePlus,
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

/** Home page route (X / close button). Change only if your Home route is not "/". */
const HOME_ROUTE = "/" as const;
/** More Lenses page route (bottom-right button). Same page the old X used to open. */
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

/** "lens_natural_frame" -> "naturalframe" (used only to sanity-check thumbnail file names). */
function lensSlug(id: string): string {
  return id.replace(/^lens_/, "").replace(/_/g, "").toLowerCase();
}

/**
 * Stable lensId -> thumbnail mapping built ONLY from real sample cards.
 * - never uses array position
 * - if two different lenses point to the same image, the lens whose id appears in the
 *   image file name keeps it; the other one falls back to its code chip instead of
 *   showing a wrong / duplicated picture.
 */
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

/** Physical camera-aperture animation: six blades close and open like a real iris. */
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
              <rect
                className="m2e-blade"
                x="0"
                y="-70"
                width="140"
                height="140"
                fill="#17171a"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.9"
              />
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
  const previewBusy = useRef(false);
  const didAutoStart = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  /** Result images already rendered: with / without watermark (blob URLs). */
  const resultVariantsRef = useRef<{ wm?: string; clean?: string }>({});
  /** Captured (un-watermarked) source canvas, kept so the watermark can be toggled locally. */
  const resultSourceRef = useRef<HTMLCanvasElement | null>(null);

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
  const [resultWm, setResultWm] = useState(true);
  const [wmBusy, setWmBusy] = useState(false);
  const [resultFromUpload, setResultFromUpload] = useState(false);
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

  const clearResultVariants = useCallback(() => {
    const v = resultVariantsRef.current;
    if (v.wm?.startsWith("blob:")) URL.revokeObjectURL(v.wm);
    if (v.clean?.startsWith("blob:")) URL.revokeObjectURL(v.clean);
    resultVariantsRef.current = {};
    resultSourceRef.current = null;
    setResultUrl(null);
  }, []);

  useEffect(
    () => () => {
      const v = resultVariantsRef.current;
      if (v.wm?.startsWith("blob:")) URL.revokeObjectURL(v.wm);
      if (v.clean?.startsWith("blob:")) URL.revokeObjectURL(v.clean);
    },
    [],
  );

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
  const startCamera = useCallback(async () => {
    if (cameraOn || didAutoStart.current) return;
    didAutoStart.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play();

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };

      setTorchSupported(Boolean(capabilities?.torch));
      setCameraOn(true);
      setPhase("ready");
    } catch (error) {
      didAutoStart.current = false;
      console.error("[Lenses] camera start failed", error);
      toast.error("Camera access is required to use Lenses.");
    }
  }, [cameraOn, facingMode]);

  useEffect(() => {
    void startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    didAutoStart.current = false;

    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);

    setTimeout(() => {
      void startCamera();
    }, 50);
  }, [facingMode, startCamera, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;

    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch (error) {
      console.error("[Lenses] torch failed", error);
      toast.error("Flash is not available on this camera.");
    }
  }, [torchOn, torchSupported]);

  const drawLivePreview = useCallback(() => {
    const video = videoRef.current;
    const canvas = liveCanvasRef.current;

    if (!video || !canvas || !cameraOn) {
      liveRafRef.current = requestAnimationFrame(drawLivePreview);
      return;
    }

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const ctx = canvas.getContext("2d", { alpha: false });

      if (ctx) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.save();

        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (liveFxOn && lens) {
          /*
           * The live preview is intentionally lightweight.
           * Final capture still goes through the full optical engine.
           */
          ctx.save();
          ctx.globalAlpha = 0.08;

          if (isAiLens(lens)) {
            ctx.fillStyle = "#ff5a1f";
          } else {
            ctx.fillStyle = "#ffffff";
          }

          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }
    }

    liveRafRef.current = requestAnimationFrame(drawLivePreview);
  }, [cameraOn, facingMode, lens, liveFxOn]);

  useEffect(() => {
    if (!cameraOn) return;

    liveRafRef.current = requestAnimationFrame(drawLivePreview);

    return () => {
      if (liveRafRef.current != null) {
        cancelAnimationFrame(liveRafRef.current);
        liveRafRef.current = null;
      }
    };
  }, [cameraOn, drawLivePreview]);

  const showLensName = useCallback((value: CameraLensDef | null) => {
    if (!value) return;

    setNameChip(value.name);

    if (nameChipTimer.current != null) {
      window.clearTimeout(nameChipTimer.current);
    }

    nameChipTimer.current = window.setTimeout(() => {
      setNameChip(null);
      nameChipTimer.current = null;
    }, 1400);
  }, []);

  useEffect(
    () => () => {
      if (nameChipTimer.current != null) {
        window.clearTimeout(nameChipTimer.current);
      }
    },
    [],
  );

  const selectLens = useCallback(
    (id: string) => {
      const next = getCameraLensById(id);
      if (!next) return;

      setLensId(id);
      showLensName(next);
      setSourceUrl(null);
      setPreviewUrl(null);
      clearResultVariants();
      setResultFromUpload(false);
      setPhase(cameraOn ? "ready" : "idle");
    },
    [cameraOn, clearResultVariants, showLensName],
  );

  const moveLens = useCallback(
    (direction: 1 | -1) => {
      if (!lensId) return;

      const currentIndex = ORDERED_ROSTER.findIndex((item) => item.id === lensId);
      if (currentIndex < 0) return;

      const nextIndex =
        (currentIndex + direction + ORDERED_ROSTER.length) %
        ORDERED_ROSTER.length;

      const next = ORDERED_ROSTER[nextIndex];
      if (!next) return;

      selectLens(next.id);
    },
    [lensId, selectLens],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      if (!touch) return;

      swipeStartX.current = touch.clientX;
      swipeStartY.current = touch.clientY;
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (swipeStartX.current == null || swipeStartY.current == null) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - swipeStartX.current;
      const dy = touch.clientY - swipeStartY.current;

      swipeStartX.current = null;
      swipeStartY.current = null;

      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;

      moveLens(dx < 0 ? 1 : -1);
    },
    [moveLens],
  );

  const getCurrentFrame = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    try {
      const canvas = captureVideoFrame(video, facingMode === "user");

      return await canvasToBlob(canvas, "image/jpeg", 0.94);
    } catch (error) {
      console.error("[Lenses] frame capture failed", error);
      return null;
    }
  }, [facingMode]);

  const makeOutputCanvas = useCallback(
    async (input: Blob): Promise<HTMLCanvasElement> => {
      if (!lens) {
        const img = await loadImage(URL.createObjectURL(input));
        const canvas = document.createElement("canvas");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");

        ctx.drawImage(img, 0, 0);
        return canvas;
      }

      return applyLensOpticalEnhanced(input, lens);
    },
    [lens],
  );

  const drawWatermark = useCallback(
    (source: HTMLCanvasElement, enabled: boolean): HTMLCanvasElement => {
      const canvas = document.createElement("canvas");

      canvas.width = source.width;
      canvas.height = source.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return source;

      ctx.drawImage(source, 0, 0);

      if (!enabled) return canvas;

      const scale = Math.max(
        0.75,
        Math.min(source.width, source.height) / 900,
      );

      const fontSize = Math.max(18, Math.round(28 * scale));

      ctx.save();
      ctx.font = `600 ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      const padding = Math.round(24 * scale);

      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillText(
        "L E N S E S",
        source.width - padding,
        source.height - padding - fontSize - 8,
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        "Motio2edit",
        source.width - padding,
        source.height - padding,
      );

      ctx.restore();

      return canvas;
    },
    [],
  );

  const createResultVariant = useCallback(
    async (source: HTMLCanvasElement, watermark: boolean): Promise<string> => {
      const canvas = drawWatermark(source, watermark);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.96);

      return URL.createObjectURL(blob);
    },
    [drawWatermark],
  );

  const prepareResult = useCallback(
    async (source: HTMLCanvasElement) => {
      resultSourceRef.current = source;

      const clean = await createResultVariant(source, false);
      const wm = await createResultVariant(source, true);

      resultVariantsRef.current = { clean, wm };

      const initialWm = !isPaid || wantWm;
      setResultWm(initialWm);
      setResultUrl(initialWm ? wm : clean);
    },
    [createResultVariant, isPaid, wantWm],
  );

  const processBlob = useCallback(
    async (input: Blob, fromUpload = false) => {
      if (previewBusy.current) return;

      previewBusy.current = true;
      setPhase("processing");
      setResultFromUpload(fromUpload);
      clearResultVariants();

      try {
        const source = await makeOutputCanvas(input);

        if (!source.width || !source.height) {
          throw new Error("Invalid output dimensions");
        }

        await prepareResult(source);

        const previewBlob = await canvasToBlob(source, "image/jpeg", 0.92);
        const nextPreview = URL.createObjectURL(previewBlob);

        setPreviewUrl((old) => {
          if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
          return nextPreview;
        });

        setPhase("result");
      } catch (error) {
        console.error("[Lenses] processing failed", error);
        toast.error("Lens processing failed. Please try again.");
        setPhase(cameraOn ? "ready" : "idle");
      } finally {
        previewBusy.current = false;
      }
    },
    [
      cameraOn,
      clearResultVariants,
      makeOutputCanvas,
      prepareResult,
    ],
  );

  const capture = useCallback(async () => {
    if (previewBusy.current) return;

    const selectedLens = lens;
    if (!selectedLens) {
      toast.error("Select a lens first.");
      return;
    }

    playShutterClick();

    const frame = await getCurrentFrame();

    if (!frame) {
      toast.error("Could not capture the camera frame.");
      return;
    }

    try {
      if (isAiLens(selectedLens)) {
        const charge = await chargeLensGeneration({
          lensId: selectedLens.id,
          userId: user?.id ?? null,
        });

        if (!charge?.allowed) {
          toast.error(charge?.message || "You need credits to use this AI lens.");
          return;
        }
      }

      await processBlob(frame, false);
    } catch (error) {
      console.error("[Lenses] capture failed", error);
      toast.error("Could not process this lens.");
    }
  }, [getCurrentFrame, lens, processBlob, user?.id]);

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image.");
        return;
      }

      const url = URL.createObjectURL(file);
      setSourceUrl(url);

      try {
        await processBlob(file, true);
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [processBlob],
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
    clearResultVariants();
    setSourceUrl(URL.createObjectURL(file));
    setPreviewUrl(null);
    setPhase("ready");
  };

  const applyFromCanvas = async (
    canvas: HTMLCanvasElement,
    active: CameraLensDef,
    fromUpload: boolean,
  ) => {
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
      clearResultVariants();
      resultVariantsRef.current = shouldWm ? { wm: url } : { clean: url };
      resultSourceRef.current = canvas;
      setResultWm(shouldWm);
      setResultFromUpload(fromUpload);
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
      await applyFromCanvas(frame, lens, false);
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
      await applyFromCanvas(c, lens, true);
    }
  };

  /** Camera shot -> back to live camera. Uploaded photo -> back to that photo to try another lens. */
  const onRetake = () => {
    const wasUpload = resultFromUpload;
    clearResultVariants();
    if (wasUpload && sourceUrl) {
      setPreviewUrl(null);
      setPhase("ready");
      return;
    }
    setPhase("ready");
    void startCamera(facingMode);
  };

  const onNewShot = () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    clearResultVariants();
    setPhase("idle");
    setSourceUrl(null);
    setPreviewUrl(null);
    setLensId(DEFAULT_FREE_LENS);
    void startCamera("user");
  };

  /**
   * Output-only watermark control.
   * Free users: watermark is locked ON. Paid users: toggle.
   * Re-renders locally from the captured source — no new generation, no credit charge.
   */
  const toggleWatermark = async () => {
    if (!isPaid) {
      toast.message("Removing the watermark is a paid feature");
      return;
    }
    const src = resultSourceRef.current;
    if (!src || !lens || wmBusy) return;
    const next = !resultWm;
    const key = next ? "wm" : "clean";
    try {
      if (!resultVariantsRef.current[key]) {
        setWmBusy(true);
        await new Promise((r) => window.setTimeout(r, 30));
        const out = applyLensOpticalEnhanced(src, lens, "native", {
          watermark: next,
          maxEdge: 2560,
        });
        const blob = await canvasToBlob(out, "image/jpeg", 0.96);
        resultVariantsRef.current[key] = URL.createObjectURL(blob);
      }
      setResultWm(next);
      setResultUrl(resultVariantsRef.current[key] ?? null);
    } catch {
      toast.error("Could not update the watermark");
    } finally {
      setWmBusy(false);
    }
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
        {/* X / close -> Home */}
        <Link
          to={HOME_ROUTE}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur-md"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/90">MOTIO2EDIT · LENSES</p>
        </div>
        {/* Spacer keeps the title centered (gallery lives in the bottom bar only) */}
        <div className="h-10 w-10" aria-hidden />
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
        {/* Hidden capture source — user never sees this element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="pointer-events-none absolute opacity-0"
          style={{ width: 1, height: 1, left: -9999, top: -9999 }}
        />
        {/* Only visible live surface */}
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0 block h-full w-full bg-black"
        />

        {/* Uploaded photo / result: fitted (never cropped or zoomed) above the controls */}
        {showStill && (
          <div
            className="absolute inset-0 z-10 bg-black"
            style={{
              paddingTop: "calc(max(0.75rem, env(safe-area-inset-top)) + 3rem)",
              paddingBottom: phase === "result" ? "12.5rem" : "13rem",
            }}
          >
            <img src={stillSrc!} alt="" className="h-full w-full object-contain" />
          </div>
        )}        {phase === "idle" && !cameraOn && !stillSrc && (
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
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/50 backdrop-blur-sm">
            <ApertureLoader />
          </div>
        )}

        {nameChip && phase !== "result" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl">
              {nameChip}
            </span>
          </div>
        )}
        {showCamera && !nameChip && phase === "ready" && (
          <div className="pointer-events-none absolute left-1/2 top-[20%] z-20 -translate-x-1/2">
            <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">
              ← Swipe to change lens →
            </span>
          </div>
        )}

        {/* Camera controls: the ONLY flip-camera button + torch */}
        {showCamera && (
          <div className="absolute right-4 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-20 flex flex-col gap-2">
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
                aria-label="Toggle light"
              >
                <Zap className={cn("h-5 w-5", torchOn && "fill-current")} />
              </button>
            )}
          </div>
        )}
      </div>

      {phase !== "result" && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col">
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
                        selected ? "scale-110 ring-[3px] ring-white shadow-lg" : "ring-1 ring-white/25",
                      )}
                      style={selected ? { boxShadow: `0 0 0 2px ${l.color}` } : undefined}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
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

          {/* Solid black control surface — the safe-area padding is INSIDE it, so no camera strip shows below */}
          <div
            className="pointer-events-auto flex items-center justify-center gap-10 bg-black px-6 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
            onTouchStart={(e) => {
              const t = e.changedTouches[0];
              if (t) onSwipeStart(t.clientX, t.clientY);
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              if (t) onSwipeEnd(t.clientX, t.clientY);
            }}
          >
            {/* Gallery / upload — the ONLY upload button */}
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

            {/* More Lenses page (replaces the duplicate Flip button) */}
            <Link
              to={MORE_LENSES_ROUTE}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10"
              aria-label="More lenses"
              title="More lenses"
            >
              <LayoutGrid className="h-5 w-5 text-white/90" />
            </Link>
          </div>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
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
                void triggerBrowserDownload(resultUrl, `motio-lens-${lensId ?? "shot"}.jpg`)
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
              {resultFromUpload ? "Edit again" : "Retake"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            {/* Output-only watermark control: free = locked ON, paid = toggle */}
            <button
              type="button"
              disabled={wmBusy}
              onClick={() => void toggleWatermark()}
              aria-pressed={isPaid ? resultWm : true}
              aria-label={
                isPaid
                  ? `Watermark ${resultWm ? "on" : "off"}`
                  : "Watermark locked on — upgrade to remove"
              }
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60",
                !isPaid
                  ? "bg-white/10 text-white/70"
                  : resultWm
                    ? "bg-white/15 text-white"
                    : "bg-white text-black",
              )}
            >
              {isPaid ? <Droplet className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {wmBusy ? "Updating…" : `Watermark: ${resultWm ? "On" : "Off"}`}
            </button>
            <button
              type="button"
              className="h-11 px-3 text-sm font-medium text-white/60"
              onClick={onNewShot}
            >
              New shot
            </button>
          </div>
        </div>
      )}

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