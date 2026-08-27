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
  /** Free plan: keep + visible but locked. */
  lockAdd?: boolean;
  onLockedAdd?: () => void;
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
}: EditorUploadProps) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={mediaType === "image" ? "image/*" : "image/*,video/*"}
        multiple={mediaType === "image" && maxGalleryImages > 1 && !lockAdd}
        onChange={onFile}
        className="hidden"
      />

      {/* 1. UPLOAD — compact on mobile; full drop zone when empty */}
      <section className="min-w-0 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1. Upload
        </p>
        {gallery.length === 0 ? (
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
                : "Upload image"}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">
          Max file size: {maxImageMb} MB for images
          {mediaType === "video" ? `, ${maxVideoMb} MB for videos` : ""}.
        </p>
        {mediaType === "video" && (
          <p className="text-[11px] text-muted-foreground">
            {inputKind === "video"
              ? "Video → Video: your clip will be enhanced/transformed."
              : inputKind === "image"
                ? "Image → Video: motion will be generated from your image."
                : "No upload = Text → Video. Upload an image for Image → Video, or a video for Video → Video."}
          </p>
        )}

        {/* Multi-image strip — switch between uploads; Free shows locked + */}
        <EditorGallery
          gallery={gallery}
          activeImage={activeImage}
          maxImages={maxGalleryImages}
          loading={loading}
          onSwitch={onSwitchImage}
          onRemove={onRemoveImage}
          onAddMore={() => fileRef.current?.click()}
          lockAdd={lockAdd}
          onLockedAdd={onLockedAdd}
        />
      </section>
    </>
  );
}
