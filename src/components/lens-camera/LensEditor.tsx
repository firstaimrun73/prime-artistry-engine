/**
 * Motio2edit Lens Editor — premium camera product.
 * Camera capture + optical lens processing is FREE.
 * Image-import path removed (lens = camera tool).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Download,
  Loader2,
  LayoutGrid,
  SwitchCamera,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  getDefaultCameraLens,
} from "@/lib/lens-camera/roster";
import {
  applyLensOptical,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Phase = "ready" | "processing" | "result" | "error";

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/permission|NotAllowed|NotFound|DevicesNotFound/i.test(raw)) {
    return "Camera access is blocked. Check browser permissions and try again.";
  }
  return raw || "Something went wrong. Please try again.";
}

type Props = { initialLensId?: string | null };

export function LensEditor({ initialLensId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lensId, setLensId] = useState(() => initialLensId || getDefaultCameraLens().id);
  const lens = useMemo(() => getCameraLensById(lensId) ?? getDefaultCameraLens(), [lensId]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(friendlyError(err));
      setCameraReady(false);
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if (phase === "ready" && user) void startCamera();
    return () => stopCamera();
  }, [phase, user, startCamera, stopCamera]);

  useEffect(() => {
    if (phase !== "ready" || !user) return;
    void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const captureAndApply = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    const v = videoRef.current;
    if (!v || !cameraReady || !v.videoWidth) {
      toast.error("Camera is not ready yet.");
      return;
    }

    setPhase("processing");
    setErrorMsg(null);
    stopCamera();

    try {
      const canvas = applyLensOptical(v, lens);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPhase("result");
    } catch (err) {
      setErrorMsg(friendlyError(err));
      setPhase("error");
    }
  };

  const retake = () => {
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setErrorMsg(null);
    setPhase("ready");
  };

  const download = async () => {
    if (!resultUrl) return;
    try {
      await triggerBrowserDownload(
        resultUrl,
        `motio2edit-${lens.name.replace(/\s+/g, "-").toLowerCase()}.jpg`,
      );
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <Camera className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-xl font-bold">Lens Editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to use the Motio2edit camera lenses.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/studio/image/lens-editor" }}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-3 py-3">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
            else void navigate({ to: "/" });
          }}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-tight">{lens.name}</p>
          <p className="text-[10px] text-white/55">{lens.shortDescription}</p>
        </div>
        <Link
          to="/studio/image/lenses"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md"
          aria-label="More lenses"
        >
          <LayoutGrid className="h-4 w-4" />
        </Link>
      </header>

      <div className="relative flex min-h-[100dvh] items-center justify-center">
        {phase === "processing" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-white/70">Applying {lens.name}…</p>
            <p className="text-[11px] text-white/40">Camera processing · free</p>
          </div>
        ) : phase === "result" && resultUrl ? (
          <img
            src={resultUrl}
            alt={`${lens.name} result`}
            className="max-h-[100dvh] max-w-full object-contain"
          />
        ) : phase === "error" ? (
          <div className="px-6 text-center">
            <CameraOff className="mx-auto h-10 w-10 text-white/50" />
            <p className="mt-3 text-sm text-white/80">{errorMsg}</p>
            <button
              type="button"
              onClick={retake}
              className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "max-h-[100dvh] max-w-full object-contain",
                facing === "user" && "scale-x-[-1]",
              )}
            />
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
                <CameraOff className="h-10 w-10 text-white/50" />
                <p className="text-sm text-white/80">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Retry camera
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex gap-2 overflow-x-auto px-3 scrollbar-none">
          {CAMERA_LENS_ROSTER.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLensId(l.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                l.id === lensId
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-white/15 bg-black/40 text-white/80",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>

        {phase === "result" ? (
          <div className="flex items-center justify-center gap-4 px-4">
            <button
              type="button"
              onClick={retake}
              className="rounded-full border border-white/20 bg-black/50 px-5 py-2.5 text-sm font-semibold backdrop-blur-md"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={() => void download()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        ) : phase === "ready" ? (
          <div className="flex items-center justify-center gap-8 px-4">
            <button
              type="button"
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md"
              aria-label="Flip camera"
            >
              <SwitchCamera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void captureAndApply()}
              disabled={!cameraReady}
              className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-white/90 text-black shadow-lg disabled:opacity-40"
              aria-label="Shutter"
            >
              <Camera className="h-6 w-6" />
            </button>
            <div className="h-12 w-12" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
