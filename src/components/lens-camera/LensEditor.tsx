/**
 * Motio2edit Lens — camera software (20 fixed lenses).
 * Front camera default · free · on-device optics.
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
  SwitchCamera,
  Lightbulb,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  LENS_ASPECT_PRESETS,
  getCameraLensById,
  getDefaultCameraLens,
  type LensAspectId,
} from "@/lib/lens-camera/roster";
import {
  applyLensOpticalEnhanced,
  captureVideoFrame,
  canvasToBlob,
  nightBoostPreview,
} from "@/lib/lens-camera/optical-engine";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Phase = "ready" | "processing" | "result" | "error";
type FaceBox = { x: number; y: number; w: number; h: number };

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/permission|NotAllowed|NotFound|DevicesNotFound/i.test(raw)) {
    return "Camera access is blocked. Check browser permissions and try again.";
  }
  if (/not ready|frame is not ready/i.test(raw)) {
    return "Camera is still starting. Wait a second and try again.";
  }
  return raw || "Something went wrong. Please try again.";
}

function lensInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
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
  const [aspectId, setAspectId] = useState<LensAspectId>("native");
  const [bulbOn, setBulbOn] = useState(false);
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);
  const [faceTrack, setFaceTrack] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const facingRef = useRef(facing);
  facingRef.current = facing;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async (mode?: "environment" | "user") => {
    const face = mode ?? facingRef.current;
    setCameraError(null);
    setCameraReady(false);
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera is not supported in this browser.");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { exact: face }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: face }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      }
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        v.muted = true;
        await v.play().catch(() => undefined);
        await new Promise<void>((resolve) => {
          if (v.videoWidth > 0) { resolve(); return; }
          const onMeta = () => { v.removeEventListener("loadedmetadata", onMeta); resolve(); };
          v.addEventListener("loadedmetadata", onMeta);
          setTimeout(resolve, 1200);
        });
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(friendlyError(err));
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "ready" && user) void startCamera(facing);
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, user]);

  useEffect(() => {
    if (!cameraReady || !faceTrack || phase !== "ready") {
      setFaceBoxes([]);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    const w = v.clientWidth || 1;
    const h = v.clientHeight || 1;
    setFaceBoxes([{ x: w * 0.22, y: h * 0.18, w: w * 0.56, h: h * 0.52 }]);
  }, [cameraReady, faceTrack, phase]);

  const flipCamera = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    facingRef.current = next;
    void startCamera(next);
  };

  const captureAndApply = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    if (processingRef.current) return;
    const v = videoRef.current;
    if (!v || !cameraReady || !v.videoWidth) {
      toast.error("Camera is not ready yet.");
      return;
    }
    processingRef.current = true;
    setPhase("processing");
    setErrorMsg(null);
    try {
      const mirror = facing === "user";
      let frame = captureVideoFrame(v, mirror);
      if (bulbOn) frame = nightBoostPreview(frame, 0.9);
      stopCamera();
      await new Promise((r) => setTimeout(r, 16));
      const canvas = applyLensOpticalEnhanced(frame, lens, aspectId);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPhase("result");
      toast.success(`${lens.name} · free`);
    } catch (err) {
      setErrorMsg(friendlyError(err));
      setPhase("error");
      toast.error(friendlyError(err));
    } finally {
      processingRef.current = false;
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
      await triggerBrowserDownload(resultUrl, `motio2edit-${lens.name.replace(/\s+/g, "-").toLowerCase()}.jpg`);
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
          <h1 className="mt-4 text-xl font-bold">Lens</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to use Motio2edit lenses.</p>
          <Link to="/auth" search={{ redirect: "/studio/image/lens-editor" }} className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) window.history.back(); else void navigate({ to: "/" }); }} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium tracking-[0.16em] text-white/40">MOTIO2EDIT</span>
          <span className="text-sm font-bold tracking-tight">Lens</span>
          <span className="text-[10px] text-white/50">{lens.name} · {lens.shortDescription}</span>
        </div>
        <button type="button" onClick={() => setFaceTrack((v) => !v)} className={cn("grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md text-[9px] font-bold", faceTrack ? "border-primary/50 bg-primary/20 text-primary" : "border-white/15 bg-black/40 text-white/70")} aria-label="Toggle face guide">
          FACE
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {phase === "result" && resultUrl ? (
          <img src={resultUrl} alt={`${lens.name} result`} className="max-h-[100dvh] max-w-full object-contain" />
        ) : phase === "error" ? (
          <div className="px-6 text-center">
            <CameraOff className="mx-auto h-10 w-10 text-white/50" />
            <p className="mt-3 text-sm text-white/80">{errorMsg}</p>
            <button type="button" onClick={retake} className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm">Try again</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted autoPlay className={cn("h-full w-full object-cover", facing === "user" && "scale-x-[-1]", bulbOn && "brightness-125 contrast-110")} />
            {faceTrack && faceBoxes.map((b, i) => (
              <div key={i} className="pointer-events-none absolute rounded-xl border-2 border-primary/80 shadow-[0_0_12px_hsl(24_95%_53%/0.4)]" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
            ))}
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
                {cameraError ? (
                  <>
                    <CameraOff className="h-8 w-8 text-white/50" />
                    <p className="text-sm text-white/70">{cameraError}</p>
                    <button type="button" onClick={() => void startCamera(facing)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">Retry camera</button>
                  </>
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                )}
              </div>
            )}
          </>
        )}
        {phase === "processing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Applying {lens.name}…</p>
            <p className="text-[11px] text-white/50">Motio2edit · free · on-device</p>
          </div>
        )}
      </div>

      {phase !== "result" && phase !== "error" && (
        <div className="absolute inset-x-0 bottom-0 z-30 space-y-2 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
          <div className="flex gap-3 overflow-x-auto overflow-y-visible px-1 pb-2 pt-3 scrollbar-none" style={{ scrollSnapType: "x mandatory" }} role="listbox" aria-label="Lenses">
            {CAMERA_LENS_ROSTER.map((l) => {
              const active = l.id === lensId;
              return (
                <button key={l.id} type="button" role="option" aria-selected={active} onClick={() => setLensId(l.id)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" style={{ scrollSnapAlign: "center" }}>
                  <span className={cn("grid h-14 w-14 place-items-center rounded-full border text-[10px] font-bold uppercase tracking-wide transition", active ? "scale-110 border-primary bg-primary/25 text-white shadow-[0_0_16px_hsl(24_95%_53%/0.35)]" : "border-white/20 bg-white/10 text-white/70")}>
                    {lensInitials(l.name)}
                  </span>
                  <span className={cn("max-w-[72px] truncate text-center text-[10px] font-medium", active ? "text-white" : "text-white/55")}>{l.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none">
            {LENS_ASPECT_PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => setAspectId(p.id)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold", aspectId === p.id ? "border-primary bg-primary/25 text-primary" : "border-white/15 bg-black/40 text-white/70")}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-5">
            <button type="button" onClick={flipCamera} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md" aria-label="Flip camera">
              <SwitchCamera className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setBulbOn((b) => !b)} className={cn("grid h-11 w-11 place-items-center rounded-full border backdrop-blur-md", bulbOn ? "border-amber-400/60 bg-amber-400/25 text-amber-300" : "border-white/20 bg-black/40 text-white")} aria-label="Night light boost">
              <Lightbulb className={cn("h-5 w-5", bulbOn && "fill-current")} />
            </button>
            <button type="button" onClick={() => void captureAndApply()} disabled={phase === "processing" || !cameraReady} className="relative grid h-[68px] w-[68px] place-items-center rounded-full border-[3px] border-white/90 bg-white/15 shadow-[0_0_24px_rgba(255,255,255,0.15)] transition active:scale-90 disabled:opacity-40" aria-label="Capture">
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>
            <div className="grid h-11 w-11 place-items-center">
              <span className="text-[9px] font-semibold text-white/50">{facing === "user" ? "Front" : "Rear"}</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-white/35">
            Motio2edit · {lens.name} · {aspectId === "native" ? "Full frame" : aspectId}
            {bulbOn ? " · Night light on" : ""}
          </p>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-12">
          <button type="button" onClick={retake} className="rounded-full border border-white/25 bg-black/50 px-4 py-2.5 text-sm font-semibold backdrop-blur-md">Retake</button>
          <button type="button" onClick={() => void download()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      )}
    </div>
  );
}
