import { useRef } from "react";
import { Upload, X } from "lucide-react";

export function VideoSourceUpload({
  mode,
  preview,
  onPick,
  onClear,
  disabled,
}: {
  mode: "image" | "video";
  preview: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const accept = mode === "image" ? "image/*" : "video/*";

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {mode === "image" ? "Source image" : "Source video"}
        </p>
        {preview && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
      {preview ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black/5">
          {mode === "video" ? (
            <video src={preview} controls className="mx-auto max-h-52 w-full object-contain" />
          ) : (
            <img src={preview} alt="" className="mx-auto max-h-52 object-contain" />
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-red-300/50 bg-background/50 py-12 text-sm text-muted-foreground hover:border-red-500"
        >
          <Upload className="h-6 w-6 text-red-500" />
          {mode === "image" ? "Upload image to animate" : "Upload video to enhance"}
        </button>
      )}
    </div>
  );
}
