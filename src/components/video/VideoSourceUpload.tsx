/**
 * Reel-style media slot for Image→Video / Video→Video.
 * Canvas is clickable; Add action is always obvious.
 */
import { useCallback, useRef, useState } from "react";
import { ImagePlus, Film, X, Replace, AlertCircle } from "lucide-react";
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
}: {
  mode: "image" | "video";
  file: File | null;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
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
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/40 shadow-sm dark:border-white/12 dark:bg-black/40">
          <div className="flex min-h-[140px] items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10 dark:from-black/20 dark:to-black/40">
            {mode === "video" ? (
              <video
                src={previewUrl}
                className="mx-auto max-h-40 w-full object-contain"
                muted
                playsInline
                controls={false}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Source"
                className="mx-auto max-h-40 w-full object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2 dark:border-white/10">
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">
              {file?.name ?? "Source ready"}
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={openPicker}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1.5 text-[11px] font-semibold"
              >
                <Replace className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                className="grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-background text-muted-foreground"
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
            "group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 transition",
            dragging
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-border/80 bg-muted/30 hover:border-orange-400/50 hover:bg-orange-500/5",
            "dark:border-white/15 dark:bg-white/5 dark:hover:border-white/25",
            disabled && "opacity-50",
          )}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-background shadow-sm dark:border-white/10 dark:bg-white/5">
            <Icon className="h-6 w-6 text-orange-500" />
          </span>
          <span className="text-sm font-bold text-foreground">{addLabel}</span>
          <span className="text-center text-[11px] text-muted-foreground">
            Tap the canvas or drop a file
            <br />
            max {MAX_MB}MB
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
