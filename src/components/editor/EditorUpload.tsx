import { Upload } from "lucide-react";
import type { GalleryItem } from "@/lib/editor/editor.types";
import { EditorGallery } from "./EditorGallery";

interface EditorUploadProps {
  fileRef: React.RefObject<HTMLInputElement>;
  mediaType: "image" | "video";
  videoLocked: boolean;
  loading: boolean;
  inputPreview: string | null;
  inputKind: "image" | "video" | null;
  maxImageMb: number;
  maxVideoMb: number;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gallery: GalleryItem[];
  activeImage: number;
  maxGalleryImages: number;
  onSwitchImage: (idx: number) => void;
  onRemoveImage: (idx: number) => void;
  lockAdd?: boolean;
  onLockedAdd?: () => void;
  /** Slim strip for glass Image Studio (no tall dashed dropzone). */
  compact?: boolean;
}

export function EditorUpload({
  fileRef,
  mediaType,
  videoLocked,
  loading,
  inputPreview,
  inputKind,
  maxImageMb,
  maxVideoMb,
  onFile,
  gallery,
  activeImage,
  maxGalleryImages,
  onSwitchImage,
  onRemoveImage,
  lockAdd = false,
  onLockedAdd,
  compact = false,
}: EditorUploadProps) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={mediaType === "video" ? "image/*,video/*" : "image/*"}
        multiple
        className="hidden"
        onChange={onFile}
      />

      <section className="min-w-0 space-y-2">
        {gallery.length === 0 ? (
          compact ? (
            <div className="flex justify-center py-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={videoLocked || loading}
                className="group inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#FF5A1F]/50 bg-[#FF5A1F]/5 px-5 py-2.5 text-sm font-semibold text-[#FF5A1F] transition hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 disabled:opacity-50"
              >
                <Upload className="h-5 w-5 animate-[pulse_2.5s_ease-in-out_infinite] transition group-hover:scale-110 group-hover:animate-none" />
                Upload Image
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={videoLocked || loading}
              className="flex min-h-[96px] w-full max-w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 sm:min-h-[120px] sm:gap-2 sm:px-4 sm:py-6 md:min-h-[140px]"
            >
              <Upload className="h-6 w-6" />
              {mediaType === "video"
                ? "Upload image or video (optional)"
                : "Upload image (optional)"}
            </button>
          )
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={videoLocked || loading || lockAdd}
            className="flex min-h-[40px] w-full max-w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 sm:min-h-[44px] sm:text-sm"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {inputPreview
              ? `Replace ${inputKind ?? "media"}`
              : mediaType === "video"
                ? "Upload image or video"
                : "Add another image"}
          </button>
        )}
        {!compact && (
          <p className="text-[11px] text-muted-foreground">
            Max file size: {maxImageMb} MB for images
            {mediaType === "video" ? `, ${maxVideoMb} MB for videos` : ""}.
          </p>
        )}
        {gallery.length > 0 && (
          <EditorGallery
            gallery={gallery}
            activeImage={activeImage}
            maxGalleryImages={maxGalleryImages}
            onSwitchImage={onSwitchImage}
            onRemoveImage={onRemoveImage}
            lockAdd={lockAdd}
            onLockedAdd={onLockedAdd}
            onAddMore={() => {
              if (lockAdd) onLockedAdd?.();
              else fileRef.current?.click();
            }}
          />
        )}
      </section>
    </>
  );
}
