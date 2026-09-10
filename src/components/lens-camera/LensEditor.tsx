/**
 * Motio2edit Lens — Snapchat-style camera.
 * Clean surface: MOTIO2EDIT + floating lens circles only.
 * Info (i) for name/credits. Camera + gallery. Watermark final-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Download, ImagePlus, Info, Loader2, RotateCcw, Share2, X } from "lucide-react";
import { Header } from "@/components/Header";
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CAMERA_LENS_ROSTER,
  getCameraLensById,
  isAiLens,
  type CameraLensDef,
} from "@/lib/lens-camera/roster";
import {
  applyLensOpticalEnhanced,
  applyFreeLensWatermark,
  canvasToBlob,
} from "@/lib/lens-camera/optical-engine";
import { chargeLensGeneration } from "@/lib/lens-camera/lens-generation.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { getLensSampleCards } from "@/lib/lens-camera/lens-samples";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";

function playShutterClick() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    window.setTimeout(() => void ctx.close(), 200);
  } catch {
    /* ignore */
  }
}

type Phase = "idle" | "ready" | "processing" | "result";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

type Props = { initialLensId?: string | null };

export function LensEditor({ initialLensId }: Props) {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isPaid = isAdminEmail(profile?.email) || isPaidPlan(profile?.plan);
  const sampleByLensId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of getLensSampleCards()) m.set(c.lensId, c.imageUrl);
    return m;
  }, []);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [nameChip, setNameChip] = useState<string | null>(null);

  const [lensId, setLensId] = useState<string | null>(() =>
    initialLensId && getCameraLensById(initialLensId) ? initialLensId : null,
  );
  const lens: CameraLensDef | null = useMemo(
    () => (lensId ? getCameraLensById(lensId) ?? null : null),
    [lensId],
  );

  useEffect(() => {
    if (initialLensId && getCameraLensById(initialLensId)) setLensId(initialLensId);
  }, [initialLensId]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const previewBusy = useRef(false);
  const shutterAreaRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeIndex = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chipTimer = useRef<number | null>(null);

  const goHome = useCallback(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const flashName = useCallback((name: string) => {
    setNameChip(name);
    if (chipTimer.current) window.clearTimeout(chipTimer.current);
    chipTimer.current = window.setTimeout(() => setNameChip(null), 1400);
  }, []);

  const selectLens = useCallback(
    (id: string) => {
      setLensId(id);
      const idx = CAMERA_LENS_ROSTER.findIndex((x) => x.id === id);
      if (idx >= 0) swipeIndex.current = idx;
      const def = getCameraLensById(id);
      if (def) flashName(def.name);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewUrl(null);
      setPhase((p) => (p === "result" || p === "processing" ? "ready" : p));
      previewBusy.current = false;
      setShowInfo(false);
    },
    [flashName],
  );

  useEffect(() => {
    if (!sourceUrl || !lens || phase === "processing" || phase === "idle" || phase === "result") {
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (previewBusy.current) return;
      previewBusy.current = true;
      try {
        const img = await loadImage(sourceUrl);
        const maxW = 720;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(img.naturalWidth, maxW);
        canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = applyLensOpticalEnhanced(canvas, lens, "native", { watermark: false });
        const blob = await canvasToBlob(out, "image/jpeg", 0.78);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        /* ignore */
      } finally {
        previewBusy.current = false;
      }
    };
    const t = window.setTimeout(() => void run(), 40);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lens, sourceUrl, phase]);

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(null);
      setResultUrl(null);
      setPreviewUrl(null);
      setPhase("ready");
      if (!lensId) {
        const first = CAMERA_LENS_ROSTER.find((l) => l.tier === "normal") ?? CAMERA_LENS_ROSTER[0];
        if (first) selectLens(first.id);
      }
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      await new Promise((r) => setTimeout(r, 450));
      if (video.videoWidth < 2) {
        stopCamera();
        inputRef.current?.click();
        return;
      }
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await canvasToBlob(c, "image/jpeg", 0.92);
      stopCamera();
      setSourceUrl(URL.createObjectURL(blob));
    } catch {
      inputRef.current?.click();
    }
  };

  const onPick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setResultUrl(null);
    setPreviewUrl(null);
    setSourceUrl(URL.createObjectURL(file));
    setPhase("ready");
    if (!lensId) {
      const first = CAMERA_LENS_ROSTER.find((l) => l.tier === "normal") ?? CAMERA_LENS_ROSTER[0];
      if (first) selectLens(first.id);
    }
  };

  const clear = () => {
    stopCamera();
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSourceUrl(null);
    setResultUrl(null);
    setPreviewUrl(null);
    setLensId(null);
    setPhase("idle");
    setNameChip(null);
    setShowInfo(false);
  };

  const applyFromCanvas = async (canvas: HTMLCanvasElement, active: CameraLensDef) => {
    processingRef.current = true;
    playShutterClick();
    setPhase("processing");
    try {
      let out = applyLensOpticalEnhanced(canvas, active, "native", { watermark: false });
      const wantWm = !isPaid || watermarkOn;
      if (wantWm) {
        out = applyFreeLensWatermark(out);
      }
      const blob = await canvasToBlob(out, "image/jpeg", 0.94);
      const srcBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const srcUrl = URL.createObjectURL(srcBlob);
      const url = URL.createObjectURL(blob);

      if (isAiLens(active) && active.creditCost > 0) {
        const generationId = `lens_${active.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        try {
          await chargeLensGeneration({ data: { lensId: active.id, generationId } });
        } catch (chargeErr) {
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(srcUrl);
          throw chargeErr instanceof Error ? chargeErr : new Error("Could not charge credits");
        }
      }

      setSourceUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return srcUrl;
      });
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPreviewUrl(null);
      setNameChip(null);
      setPhase("result");
    } catch {
      setPhase(sourceUrl ? "ready" : "idle");
    } finally {
      processingRef.current = false;
    }
  };

  const applyLens = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/studio/image/lens-editor" } });
      return;
    }
    if (!isPaid) {
      navigate({ to: "/pricing" });
      return;
    }
    if (processingRef.current) return;
    if (!sourceUrl) {
      inputRef.current?.click();
      return;
    }
    if (!lens) return;
    try {
      const img = await loadImage(sourceUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      await applyFromCanvas(canvas, lens);
    } catch {
      /* ignore */
    }
  };

  const cycleLens = useCallback(
    (dir: 1 | -1) => {
      const list = CAMERA_LENS_ROSTER;
      if (!list.length) return;
      let idx = swipeIndex.current;
      if (lensId) {
        const found = list.findIndex((l) => l.id === lensId);
        if (found >= 0) idx = found;
      }
      idx = (idx + dir + list.length) % list.length;
      selectLens(list[idx].id);
    },
    [lensId, selectLens],
  );

  const onShutterPointerDown = (e: React.PointerEvent) => {
    if (phase !== "ready" || !sourceUrl) return;
    swipeStartX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onShutterPointerMove = (e: React.PointerEvent) => {
    if (swipeStartX.current == null || phase !== "ready") return;
    const dx = e.clientX - swipeStartX.current;
    if (Math.abs(dx) > 48) {
      cycleLens(dx < 0 ? 1 : -1);
      swipeStartX.current = e.clientX;
    }
  };

  const onShutterPointerUp = () => {
    swipeStartX.current = null;
  };

  const download = async () => {
    if (!resultUrl) return;
    try {
      const name = (lens?.name ?? "lens").replace(/\s+/g, "-").toLowerCase();
      await triggerBrowserDownload(resultUrl, `motio2edit-${name}.jpg`);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!resultUrl) return;
    try {
      if (navigator.share) {
        const res = await fetch(resultUrl);
        const blob = await res.blob();
        const file = new File([blob], "motio2edit-lens.jpg", { type: "image/jpeg" });
        await navigator.share({ files: [file], title: lens?.name ?? "Motio2edit Lens" });
      } else {
        await download();
      }
    } catch {
      /* cancelled */
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Lens</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to apply lenses on your photos.</p>
          <Link
            to="/auth"
            search={{ redirect: "/studio/image/lens-editor" }}
            className="mt-6 inline-flex rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </main>
      </div>
    );
  }

  const showResult = phase === "result" && resultUrl && sourceUrl;
  const stillSrc = phase === "ready" && previewUrl && lens ? previewUrl : sourceUrl;
  const ringColor = lens?.color ?? "#fbbf24";

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-50 dark">
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={goHome}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 shadow-sm backdrop-blur-xl"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-300/90 backdrop-blur-md">
          MOTIO2EDIT
        </span>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 text-zinc-300 backdrop-blur-xl"
          aria-label="Lens info"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showInfo && lens && phase !== "idle" && (
        <div className="absolute right-3 top-[max(3.5rem,env(safe-area-inset-top)+2.75rem)] z-40 max-w-[200px] rounded-2xl border border-white/15 bg-black/75 px-3 py-2 text-left shadow-xl backdrop-blur-xl">
          <p className="text-[12px] font-semibold text-white">{lens.name}</p>
          <p className="mt-0.5 text-[10px] text-zinc-400">{lens.shortDescription}</p>
          <p className="mt-1 text-[10px] font-medium text-amber-300/90">
            {isAiLens(lens) ? `${lens.creditCost} credits` : "Free"}
          </p>
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-56 pt-14">
        {phase === "idle" && (
          <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-white/20 bg-black/55 px-5 py-2.5 text-sm font-medium text-white/95 shadow-xl backdrop-blur-xl transition active:scale-95"
            >
              Upload your image here
            </button>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-medium text-zinc-200 backdrop-blur-xl"
            >
              <Camera className="h-3.5 w-3.5" />
              Open camera
            </button>
          </div>
        )}

        {(phase === "ready" || phase === "processing") && stillSrc && (
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl">
            <img
              src={stillSrc}
              alt=""
              className="mx-auto max-h-[min(52dvh,560px)] w-auto object-contain"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
            {phase === "processing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            )}
          </div>
        )}

        {nameChip && phase === "ready" && (
          <div className="pointer-events-none absolute left-1/2 top-[max(4.5rem,env(safe-area-inset-top)+3.5rem)] z-40 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-medium text-white/95 shadow-lg backdrop-blur-xl">
            {nameChip}
          </div>
        )}

        {showResult && (
          <div className="flex w-full max-w-lg flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl">
              <CompareSlider before={sourceUrl!} after={resultUrl!} className="rounded-2xl" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setResultUrl((prev) => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return null;
                  });
                  setPreviewUrl(null);
                  setPhase("ready");
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xl"
              >
                <RotateCcw className="h-4 w-4" />
                Another lens
              </button>
              <button
                type="button"
                onClick={() => void download()}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2.5 text-xs font-semibold text-amber-100 backdrop-blur-xl"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={() => void share()}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xl"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
            <button
              type="button"
              disabled={!isPaid}
              onClick={() => {
                if (!isPaid) return;
                setWatermarkOn((v) => !v);
              }}
              className={cn(
                "mx-auto flex min-w-[140px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold",
                !isPaid
                  ? "cursor-not-allowed border-white/10 bg-black/40 text-zinc-500"
                  : watermarkOn
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-white/10 text-zinc-400",
              )}
            >
              {!isPaid ? "Locked · " : ""}Watermark {watermarkOn ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="mx-auto text-[11px] text-zinc-500 underline-offset-2 hover:underline"
            >
              New photo
            </button>
          </div>
        )}
      </div>

      {phase !== "idle" && phase !== "result" && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8">
          <div className="w-full overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max items-center gap-2.5 py-1">
              {CAMERA_LENS_ROSTER.map((l) => {
                const active = lens?.id === l.id;
                const img = sampleByLensId.get(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => selectLens(l.id)}
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-full border-2 transition-transform duration-200 active:scale-90",
                      active ? "h-[52px] w-[52px] border-white" : "h-10 w-10 border-white/25 opacity-75",
                    )}
                    style={
                      active ? { boxShadow: `0 0 0 2px ${l.color}, 0 0 14px ${l.color}88` } : undefined
                    }
                    aria-label={l.name}
                    aria-pressed={active}
                  >
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <span
                        className="grid h-full w-full place-items-center text-[9px] font-bold text-white"
                        style={{ background: l.color }}
                      >
                        {l.code}
                      </span>
                    )}
                    {l.tier === "ai" && (
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-zinc-950 bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex h-[96px] w-full items-center justify-center gap-10 px-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 text-zinc-300 backdrop-blur-xl"
              aria-label="Gallery"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            <div
              ref={shutterAreaRef}
              className="relative shrink-0 touch-none select-none"
              onPointerDown={onShutterPointerDown}
              onPointerMove={onShutterPointerMove}
              onPointerUp={onShutterPointerUp}
              onPointerCancel={onShutterPointerUp}
            >
              <button
                type="button"
                onClick={() => void applyLens()}
                disabled={phase === "processing" || !lens}
                className="relative grid h-[84px] w-[84px] place-items-center rounded-full transition-transform active:scale-90 disabled:opacity-40"
                aria-label="Shutter"
                style={{
                  boxShadow: `0 0 0 3px ${ringColor}, 0 0 24px ${ringColor}77`,
                  background: `linear-gradient(145deg, ${ringColor}55, ${ringColor}22)`,
                }}
              >
                <span
                  className="grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-full"
                  style={{
                    background: `linear-gradient(160deg, ${ringColor}ee, ${ringColor})`,
                  }}
                >
                  {lens && sampleByLensId.get(lens.id) ? (
                    <img
                      src={sampleByLensId.get(lens.id)}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : null}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void startCamera()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 text-zinc-300 backdrop-blur-xl"
              aria-label="Camera"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
