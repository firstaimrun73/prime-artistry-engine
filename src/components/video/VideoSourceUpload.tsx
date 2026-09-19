/**
 * Reel-style media slot for Image→Video / Video→Video.
 * Canvas is clickable; shape follows aspect; optional rule-of-thirds grid.
 */
import { useCallback, useRef, useState } from "react";
import { ImagePlus, Film, X, Replace, AlertCircle, Grid3x3 } from "lucide-react";
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
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept =
    mode === "image"
      ? "image/jpeg,image/png,image/webp,image/*"
      : "video/mp4,video/webm,video/*";
  const addLabel = mode === "image" ? "Add Image" : "Add Video";
  const Icon = mode === "image" ? ImagePlus : Film;

  const aspectClass =
    aspect === "9:16"
      ? "aspect-[9/16] max-h-[320px] w-auto mx-auto"
      : aspect === "1:1"
        ? "aspect-square max-h-[280px] w-full max-w-[280px] mx-auto"
        : "aspect-video w-full";

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

  const GridOverlay = showGrid ? (
    <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
      <div className="absolute left-1/3 top-0 h-full w-px bg-foreground" />
      <div className="absolute left-2/3 top-0 h-full w-px bg-foreground" />
      <div className="absolute left-0 top-1/3 h-px w-full bg-foreground" />
      <div className="absolute left-0 top-2/3 h-px w-full bg-foreground" />
    </div>
  ) : null;

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

      <div className="mb-2 flex justify-end">
        {onToggleGrid && (
          <button
            type="button"
            onClick={onToggleGrid}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              showGrid
                ? "border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-300"
                : "border-border/50 bg-background/50 text-muted-foreground",
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Grid
          </button>
        )}
      </div>

      {previewUrl ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-[20px] border border-border/40 bg-background/40 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-[16px] dark:border-white/15 dark:bg-white/5",
            aspectClass,
          )}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            {mode === "video" ? (
              <video
                src={previewUrl}
                className="h-full w-full object-contain"
                muted
                playsInline
                controls={false}
              />
            ) : (
              <img src={previewUrl} alt="Source" className="h-full w-full object-contain" />
            )}
            {GridOverlay}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-border/40 bg-background/80 px-3 py-2 backdrop-blur-md dark:bg-black/50">
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">
              {file?.name ?? "Source ready"}
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={openPicker}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1.5 text-[11px] font-semibold"
              >
                <Replace className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-background/80 text-muted-foreground"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
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
            "group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[20px] border-2 border-dashed px-4 transition",
            aspectClass,
            "min-h-[140px]",
            dragging
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-border/60 bg-background/30 hover:border-orange-400/50 hover:bg-orange-500/5 dark:border-white/15 dark:bg-white/5",
            disabled && "opacity-50",
          )}
        >
          {GridOverlay}
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border/50 bg-background/70 shadow-sm dark:bg-white/5">
            <Icon className="h-6 w-6 text-orange-500" />
          </span>
          <span className="text-sm font-bold text-foreground">{addLabel}</span>
          <span className="text-center text-[11px] text-muted-foreground">
            Tap or drop · max {MAX_MB}MB
          </span>
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
