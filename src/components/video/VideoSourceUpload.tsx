import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accepts live page props (file, previewUrl) and legacy (preview). */
export function VideoSourceUpload({
  mode,
  preview,
  previewUrl,
  file: _file,
  onPick,
  onClear,
  disabled,
}: {
  mode: "image" | "video";
  preview?: string | null;
  previewUrl?: string | null;
  file?: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const accept = mode === "image" ? "image/*" : "video/*";
  const src = previewUrl ?? preview ?? null;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {mode === "image" ? "Source image" : "Source video"}
        </p>
        {src && (
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className={cn(
              "rounded-full p-1.5 text-slate-400 transition-all duration-150",
              "hover:bg-slate-100 hover:text-slate-700 active:scale-90",
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
      {src ? (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-black/5">
          {mode === "video" ? (
            <video src={src} controls className="mx-auto max-h-52 w-full object-contain" />
          ) : (
            <img src={src} alt="" className="mx-auto max-h-52 object-contain" />
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#FF7A45]/40",
            "bg-white/40 py-12 text-sm text-slate-500",
            "transition-all duration-150 ease-out active:scale-[0.99]",
            "hover:border-[#F43F5E] hover:bg-[#FF7A45]/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]/30",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="h-6 w-6 text-[#F43F5E]" />
          {mode === "image" ? "Upload image to animate" : "Upload video to enhance"}
        </button>
      )}
    </div>
  );
}
