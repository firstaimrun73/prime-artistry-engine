/**
 * Motio2edit Lenses — Snapchat-style camera UI.
 * Complete file restored to unblock production builds (partial restore was causing EOF parse errors).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, SwitchCamera, X } from "lucide-react";
import { disposeFaceLandmarker } from "@/lib/lens-camera/face-track";

const HOME_ROUTE = "/" as const;

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    disposeFaceLandmarker();
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(
    async (face?: "user" | "environment") => {
      const mode = face ?? facingMode;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        setFacingMode(mode);
        setCameraOn(true);
      } catch (error) {
        console.error("[Lenses] camera start failed", error);
        toast.error("Camera unavailable — try Upload");
      }
    },
    [facingMode],
  );

  useEffect(() => {
    void startCamera("user");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
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
        <div className="h-10 w-10" aria-hidden />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {cameraOn ? (
          <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-cover" />
        ) : sourceUrl ? (
          <img src={sourceUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <p className="text-center text-sm text-white/60">Allow camera or upload a photo</p>
            <button
              type="button"
              onClick={() => void startCamera("user")}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
            >
              Open Camera
            </button>
          </div>
        )}
        {!cameraOn && <video ref={videoRef} playsInline muted className="hidden" />}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-8 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md"
          aria-label="Gallery"
        >
          <ImagePlus className="h-5 w-5 text-white/90" />
        </button>
        <button
          type="button"
          onClick={() => void startCamera(facingMode === "user" ? "environment" : "user")}
          className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur-md"
          aria-label="Flip camera"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
        <Link
          to="/studio/image/circle-remove"
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white"
        >
          Circle2edit
        </Link>
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
