/**
 * Single glass upload tile for Image→Video / Video→Video.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Film, X, Replace, AlertCircle, Grid3x3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_MB = 40;
const MAX_BYTES = MAX_MB * 1024 * 1024;

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

  const accept =
    mode === "image"
      ? "image/jpeg,image/png,image/webp,image/*"
      : "video/mp4,video/webm,video/*";
  const addLabel = mode === "image" ? "Add image" : "Add video";
  const formats =
    mode === "image" ? "JPG, PNG, WebP · max 40MB" : "MP4, WebM · max 40MB";

  const aspectClass =
    aspect === "9:16"
      ? "aspect-[9/16] max-h-[42vh] w-auto mx-auto"
      : aspect === "1:1"
        ? "aspect-square max-h-[42vh] w-full max-w-[min(100%,42vh)] mx-auto"
        : "aspect-video w-full max-h-[42vh]";

  useEffect(() => {
    setVidDur(null);
  }, [previewUrl]);

  const validateAndPick = useCallback(
    (f: File | null) => {
      setError(null);
      if (!f) return;
      if (f.size > MAX_BYTES) {
        setError(`Max ${MAX_MB}MB`);
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
      onPick(f);
    },
    [mode, onPick],
  );

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const glass =
    "rounded-3xl border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(80,60,140,0.12)] backdrop-blur-xl saturate-150 ring-1 ring-black/5 dark:border-white/[0.12] dark:bg-white/[0.06] dark:ring-white/[0.06]";

  const GridOverlay = showGrid ? (
    <div className="pointer-events-none absolute inset-0 z-[5] opacity-30" aria-hidden>
      <div className="absolute left-1/3 top-0 h-full w-px bg-white" />
      <div className="absolute left-2/3 top-0 h-full w-px bg-white" />
      <div className="absolute left-0 top-1/3 h-px w-full bg-white" />
      <div className="absolute left-0 top-2/3 h-px w-full bg-white" />
    </div>
  ) : null;

  const cornerBtn =
    "grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-black/50 dark:text-white";

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          validateAndPick(f);
        }}
      />

      {previewUrl ? (
        <div className={cn("relative overflow-hidden", glass, aspectClass)}>
          <div className="relative h-full w-full">
            {mode === "video" ? (
              <video
                ref={videoRef}
                src={previewUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                onLoadedMetadata={() => {
                  const d = videoRef.current?.duration;
                  if (d && Number.isFinite(d)) {
                    const s = Math.round(d);
                    setVidDur(s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);
                  }
                }}
              />
            ) : (
              <img src={previewUrl} alt="Source" className="h-full w-full object-cover" />
            )}
            {GridOverlay}
            {vidDur && (
              <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                {vidDur}
              </span>
            )}
            <div className="absolute right-2 top-2 flex gap-1.5">
              {onToggleGrid && (
                <button
                  type="button"
                  onClick={onToggleGrid}
                  className={cn(cornerBtn, showGrid && "ring-2 ring-[#F43F5E]")}
                  aria-label="Toggle grid"
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
          </div>
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
            validateAndPick(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden px-4 transition",
            glass,
            aspectClass,
            "min-h-[140px]",
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
            <Film className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 text-slate-300 dark:text-zinc-600" aria-hidden />
          )}
        </button>
      )}

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
