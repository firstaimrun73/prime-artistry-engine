/**
 * Single glass upload tile for Image→Video / Video→Video.
 * D1-2: fixed size (never follows aspect). Dashed output-ratio guide.
 * D1-3: instant object URL preview. D1-4: type-safe img vs video.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, Film, X, Replace, AlertCircle, Grid3x3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_MB = 40;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_VIDEO_SEC = 10;

/** Fixed tile — never changes with aspect ratio (D1-2). */
const TILE =
  "relative w-full h-[200px] overflow-hidden rounded-3xl border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5 dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]";

export function VideoSourceUpload({
  mode,
  file,
  previewUrl,
  onPick,
  onClear,
  disabled,
  aspect = "16:9",
  showGrid = false,
  onToggleGrid,
}: {
  mode: "image" | "video";
  file: File | null;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  aspect?: "16:9" | "9:16" | "1:1";
  showGrid?: boolean;
  onToggleGrid?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vidDur, setVidDur] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const accept =
    mode === "image"
      ? "image/jpeg,image/png,image/webp,image/*"
      : "video/mp4,video/webm,video/quicktime,video/*";
  const addLabel = mode === "image" ? "Add image" : "Add video";
  const formats =
    mode === "image" ? "JPG, PNG, WebP · max 40MB" : "MP4, WebM, MOV · max 40MB · max 10s";

  useEffect(() => {
    setVidDur(null);
    setError(null);
  }, [previewUrl, mode]);

  const validateAndPick = useCallback(
    async (f: File | null) => {
      setError(null);
      if (!f) return;
      if (f.size > MAX_BYTES) {
        setError(`File too large (max ${MAX_MB}MB)`);
        return;
      }
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (mode === "image" && !isImage) {
        setError("Choose an image file");
        return;
      }
      if (mode === "video" && !isVideo) {
        setError("Choose a video file");
        return;
      }
      if (mode === "video") {
        const dur = await new Promise<number | null>((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          const url = URL.createObjectURL(f);
          v.onloadedmetadata = () => {
            const d = v.duration;
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(d) ? d : null);
          };
          v.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          v.src = url;
        });
        if (dur == null) {
          setError("Could not read this video. Try another file.");
          return;
        }
        if (dur > MAX_VIDEO_SEC + 0.05) {
          setError(
            `Your video is ${dur.toFixed(1)}s. The maximum is ${MAX_VIDEO_SEC}s. Trim it and upload again.`,
          );
          return;
        }
        if (dur < 1) {
          setError("Video must be at least 1 second.");
          return;
        }
      }
      onPick(f);
    },
    [mode, onPick],
  );

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const cornerBtn =
    "grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/80 text-slate-700 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/50 dark:text-zinc-200";

  const hasSource = Boolean(previewUrl && file);
  const isVideoFile = Boolean(file?.type.startsWith("video/"));
  const isImageFile = Boolean(file?.type.startsWith("image/"));
  const videoSrc = previewUrl
    ? previewUrl.includes("#")
      ? previewUrl
      : `${previewUrl}#t=0.1`
    : null;

  const onMediaTap = () => {
    if (mode === "image" && isImageFile) {
      setViewerOpen(true);
      return;
    }
    if (mode === "video" && isVideoFile) {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) void v.play();
      else v.pause();
    }
  };

  /** Dashed output-ratio guide inside fixed tile (D1-2). */
  const guideStyle: CSSProperties = (() => {
    if (aspect === "9:16") {
      return { width: "28%", height: "88%", maxWidth: 72 };
    }
    if (aspect === "1:1") {
      return { width: "52%", height: "78%", maxWidth: 140 };
    }
    return { width: "78%", height: "52%", maxWidth: 220 };
  })();

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          void validateAndPick(f);
        }}
      />

      {hasSource ? (
        <div className={cn(TILE, "min-h-[200px]")}>
          {/* Media — object-contain, never blank */}
          {mode === "image" && isImageFile ? (
            <button
              type="button"
              className="absolute inset-0 block h-full w-full"
              onClick={onMediaTap}
              aria-label="View image"
            >
              <img
                src={previewUrl!}
                alt="Uploaded"
                className="h-full w-full object-contain bg-black/5 dark:bg-black/30"
              />
            </button>
          ) : mode === "video" && isVideoFile ? (
            <button
              type="button"
              className="absolute inset-0 block h-full w-full"
              onClick={onMediaTap}
              aria-label="Play or pause video"
            >
              <video
                ref={videoRef}
                key={videoSrc ?? "empty"}
                src={videoSrc ?? undefined}
                className="h-full w-full object-contain bg-black/5 dark:bg-black/30"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d)) setVidDur(`${d.toFixed(1)}s`);
                }}
                onError={() => setError("Could not decode this video. Tap Replace.")}
              />
              {vidDur && (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {vidDur}
                </span>
              )}
            </button>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <p className="text-[12px] text-slate-600 dark:text-zinc-300">
                This file cannot be previewed. Tap Replace.
              </p>
            </div>
          )}

          {/* Output ratio guide */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="relative border border-dashed border-white/50 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
              style={guideStyle}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                Output {aspect}
              </span>
            </div>
          </div>

          {showGrid && (
            <div
              className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
              aria-hidden
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="border border-white/20" />
              ))}
            </div>
          )}

          <div className="absolute right-2 top-2 z-10 flex gap-1.5">
            {onToggleGrid && (
              <button
                type="button"
                disabled={disabled}
                onClick={onToggleGrid}
                className={cn(cornerBtn, showGrid && "ring-2 ring-[#FF7A45]")}
                aria-label="Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              className={cornerBtn}
              aria-label="Replace"
            >
              <Replace className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className={cornerBtn}
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p className="absolute bottom-2 left-2 right-14 z-10 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[11px] text-amber-200">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{error}</span>
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (disabled) return;
            void validateAndPick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "group flex flex-col items-center justify-center gap-2 px-4 transition",
            TILE,
            "shadow-[inset_0_0_0_1px_rgba(255,122,69,0.25)]",
            dragging && "ring-2 ring-[#FF7A45]/60",
            disabled && "opacity-50",
          )}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#FF7A45] to-[#F43F5E] text-white shadow-[0_6px_18px_rgba(244,63,94,0.35)]">
            {mode === "image" ? <ImagePlus className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-white">{addLabel}</span>
          <span className="text-center text-[11px] text-slate-500 dark:text-zinc-400">{formats}</span>
          {mode === "video" && (
            <Film
              className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 text-slate-300 dark:text-zinc-600"
              aria-hidden
            />
          )}
          {error && (
            <p className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </button>
      )}

      {viewerOpen && previewUrl && mode === "image" && isImageFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => setViewerOpen(false)}
          />
          <img
            src={previewUrl}
            alt="Full size"
            className="relative z-10 max-h-[90vh] max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
            aria-label="Close viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
