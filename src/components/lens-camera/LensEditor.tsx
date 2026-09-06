/**
 * Motio2edit Lens Editor — premium camera experience.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, CameraOff, Download, Image as ImageIcon, Loader2, Search, SwitchCamera,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER, LENS_GENERATION_CREDITS, getCameraLensById, getDefaultCameraLens,
} from "@/lib/lens-camera/roster";
import { widevistaFinalFromUrl, widevistaFromVideoFrame, canvasToBlob } from "@/lib/lens-camera/widevista";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

type Mode = "camera" | "image";
type Phase = "ready" | "processing" | "result" | "error";

function newGenerationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `lens-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/invalid_type|expected.*received|Required|ZodError|"code":/i.test(raw)) {
    return "Something went wrong. Please try again.";
  }
  if (/Not enough credits/i.test(raw)) return raw;
  if (/permission|NotAllowed|NotFound|DevicesNotFound/i.test(raw)) {
    return "Camera access is blocked. Check browser permissions and try again.";
  }
  return raw || "Something went wrong. Please try again.";
}

type Props = { initialLensId?: string | null; initialImageUrl?: string | null };

export function LensEditor({ initialLensId, initialImageUrl }: Props) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const chargeFn = useServerFn(chargeLensGeneration);

  const [lensId, setLensId] = useState(() => initialLensId || getDefaultCameraLens().id);
  const lens = useMemo(() => getCameraLensById(lensId) ?? getDefaultCameraLens(), [lensId]);

  const [mode, setMode] = useState<Mode>(initialImageUrl ? "image" : "camera");
  const [phase, setPhase] = useState<Phase>("ready");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const chargingRef = useRef(false);

  const credits = profile?.credits ?? 0;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(friendlyError(err));
      setCameraReady(false);
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if (mode === "camera" && phase === "ready" && user) void startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, phase, user, startCamera, stopCamera]);

  useEffect(() => {
    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
      setMode("image");
    }
  }, [initialImageUrl]);

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setMode("image");
    setPhase("ready");
    setResultUrl(null);
  };

  const applyLens = async (source: "camera" | "image") => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    if (lens.status === "coming-soon") {
      toast.message(`${lens.name} is coming soon.`);
      return;
    }
    if (lens.id !== "lens_widevista") {
      toast.message("Only Widevista is available in this build.");
      return;
    }
    if (chargingRef.current) return;
    chargingRef.current = true;
    setPhase("processing");

    const generationId = newGenerationId();

    try {
      let result: { canvas: HTMLCanvasElement };
      if (source === "camera") {
        const v = videoRef.current;
        if (!v || !cameraReady) throw new Error("Camera is not ready.");
        result = widevistaFromVideoFrame(v);
        stopCamera();
      } else {
        if (!imageUrl) throw new Error("No image selected.");
        result = await widevistaFinalFromUrl(imageUrl);
      }

      const blob = await canvasToBlob(result.canvas);
      const objectUrl = URL.createObjectURL(blob);

      const bill = await chargeFn({ data: { lensId: lens.id, generationId } });
      if (typeof bill.credits === "number") await refreshProfile?.();

      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setPhase("result");
      toast.success(bill.charged > 0 ? `${lens.name} applied · ${bill.charged} credits` : `${lens.name} applied`);
    } catch (err) {
      toast.error(friendlyError(err));
      setPhase("ready");
      if (source === "camera" && mode === "camera") void startCamera();
    } finally {
      chargingRef.current = false;
    }
  };

  const onShutter = () => {
    if (mode === "camera") void applyLens("camera");
    else void applyLens("image");
  };

  const onDownload = () => {
    if (!resultUrl) return;
    triggerBrowserDownload(resultUrl, `motio2edit-${lens.name.toLowerCase().replace(/\s+/g, "-")}.jpg`);
  };

  const onContinue = () => {
    setResultUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setPhase("ready");
    if (mode === "camera") void startCamera();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/70">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-black text-white">
        <Header />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
          <Camera className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Lens Editor</h1>
          <p className="text-sm text-white/60">Sign in to use the camera and apply lenses.</p>
          <Link
            to="/auth"
            search={{ redirect: "/studio/image/lens-editor" }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Lens Editor</span>
          <span className="text-sm font-bold">{lens.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">{credits} cr</span>
          <Link to="/studio/image/lenses" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md" aria-label="More lenses">
            <Search className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {phase === "result" && resultUrl ? (
          <img src={resultUrl} alt={`${lens.name} result`} className="max-h-[100dvh] max-w-full object-contain" />
        ) : mode === "camera" ? (
          <>
            <video ref={videoRef} playsInline muted autoPlay className={cn("h-full w-full object-cover", facing === "user" && "scale-x-[-1]")} />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
                {cameraError ? (
                  <>
                    <CameraOff className="h-8 w-8 text-white/50" />
                    <p className="text-sm text-white/70">{cameraError}</p>
                    <button type="button" onClick={() => void startCamera()} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold">Retry camera</button>
                    <button type="button" onClick={() => { setMode("image"); fileRef.current?.click(); }} className="text-sm text-primary">Use an existing photo instead</button>
                  </>
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                )}
              </div>
            )}
          </>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Source" className="max-h-[100dvh] max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <ImageIcon className="h-8 w-8 text-white/40" />
            <p className="text-sm text-white/60">Choose a photo to apply a lens</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Choose photo</button>
          </div>
        )}

        {phase === "processing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Applying {lens.name}…</p>
            <p className="text-[11px] text-white/50">{LENS_GENERATION_CREDITS} credits on success</p>
          </div>
        )}
      </div>

      {phase !== "result" && (
        <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => { setMode("camera"); setPhase("ready"); setResultUrl(null); }} className={cn("rounded-full px-3 py-1.5 text-[11px] font-semibold", mode === "camera" ? "bg-white text-black" : "bg-white/10 text-white/70")}>
              <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Camera</span>
            </button>
            <button type="button" onClick={() => { setMode("image"); stopCamera(); if (!imageUrl) fileRef.current?.click(); }} className={cn("rounded-full px-3 py-1.5 text-[11px] font-semibold", mode === "image" ? "bg-white text-black" : "bg-white/10 text-white/70")}>
              <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Photo</span>
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none" style={{ scrollSnapType: "x mandatory" }} role="listbox" aria-label="Lenses">
            {CAMERA_LENS_ROSTER.map((l) => {
              const active = l.id === lensId;
              return (
                <button key={l.id} type="button" role="option" aria-selected={active} onClick={() => setLensId(l.id)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5" style={{ scrollSnapAlign: "center" }}>
                  <span className={cn("grid h-14 w-14 place-items-center rounded-full border text-[10px] font-bold uppercase tracking-wide transition", active ? "scale-110 border-primary bg-primary/25 text-white shadow-[0_0_16px_hsl(24_95%_53%/0.35)]" : "border-white/20 bg-white/10 text-white/70", l.status !== "full" && "opacity-60")}>
                    {l.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <span className={cn("max-w-[72px] truncate text-center text-[10px] font-medium", active ? "text-white" : "text-white/55")} >{l.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-8">
            {mode === "camera" ? (
              <button type="button" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md" aria-label="Flip camera">
                <SwitchCamera className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md" aria-label="Choose another photo">
                <ImageIcon className="h-5 w-5" />
              </button>
            )}

            <button type="button" onClick={onShutter} disabled={phase === "processing" || (mode === "camera" && !cameraReady) || (mode === "image" && !imageUrl)} className={cn("relative grid h-[68px] w-[68px] place-items-center rounded-full border-[3px] border-white/90 bg-white/15 shadow-[0_0_24px_rgba(255,255,255,0.15)] transition active:scale-90 disabled:opacity-40")} aria-label={mode === "camera" ? "Capture" : `Apply ${lens.name}`}>
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>

            <Link to="/studio/image/lenses" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md" aria-label="More lenses">
              <Search className="h-5 w-5" />
            </Link>
          </div>

          <p className="text-center text-[10px] text-white/40">
            {lens.status === "full" ? `${LENS_GENERATION_CREDITS} credits · one charge on success` : "Coming soon"}
          </p>
        </div>
      )}

      {phase === "result" && resultUrl && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-12">
          <button type="button" onClick={onContinue} className="rounded-full border border-white/25 bg-black/50 px-4 py-2.5 text-sm font-semibold backdrop-blur-md">Continue</button>
          <button type="button" onClick={onDownload} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
    </div>
  );
}
