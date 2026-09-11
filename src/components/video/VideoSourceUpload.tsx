/**
 * Compact source upload for Image→Video / Video→Video — drag-drop + preview.
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
  const label = mode === "image" ? "Add image" : "Add video";
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    validateAndPick(f);
  };

  return (
    <div className="w-full max-w-sm">
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
        <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black/40">
          {mode === "video" ? (
            <video
              src={previewUrl}
              className="mx-auto max-h-28 w-full object-contain"
              muted
              playsInline
              controls={false}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Source"
              className="mx-auto max-h-28 w-full object-contain"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
            <p className="truncate text-[10px] text-zinc-300">
              {file?.name ?? "Source"}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10"
                aria-label="Replace"
              >
                <Replace className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/10"
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
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-3 py-4 transition",
            dragging
              ? "border-red-400/50 bg-red-500/10"
              : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8",
            disabled && "opacity-50",
          )}
        >
          <Icon className="h-5 w-5 text-zinc-400" />
          <span className="text-[11px] font-medium text-zinc-300">{label}</span>
          <span className="text-[10px] text-zinc-500">Tap or drop · max {MAX_MB}MB</span>
        </button>
      )}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
