import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4 dark:bg-card/60">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {mode === "image" ? "Source image" : "Source video"}
        </p>
        {preview && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className={cn(
              "rounded-full p-1.5 text-muted-foreground transition-all duration-150",
              "hover:bg-muted hover:text-foreground active:scale-90",
              disabled && "pointer-events-none opacity-50",
            )}
            aria-label="Clear source"
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
        <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/20">
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
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-red-300/50",
            "bg-background/50 py-12 text-sm text-muted-foreground",
            "transition-all duration-150 ease-out active:scale-[0.99]",
            "hover:border-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="h-6 w-6 text-red-500 transition-transform duration-150 group-active:scale-90" />
          {mode === "image" ? "Upload image to animate" : "Upload video to enhance"}
        </button>
      )}
    </div>
  );
}
