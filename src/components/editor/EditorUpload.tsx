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
}: EditorUploadProps) {
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={mediaType === "image" ? "image/*" : "image/*,video/*"}
        multiple={mediaType === "image"}
        onChange={onFile}
        className="hidden"
      />

      {/* 1. UPLOAD */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          1. Upload
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={videoLocked || loading}
          className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 sm:min-h-[140px]"
        >
          <Upload className="h-6 w-6" />
          {inputPreview
            ? `Replace ${inputKind ?? "media"}`
            : mediaType === "video"
              ? "Upload image or video (optional)"
              : "Upload image (optional)"}
        </button>
        <p className="text-[11px] text-muted-foreground">
          Max file size: {maxImageMb} MB for images{mediaType === "video" ? `, ${maxVideoMb} MB for videos` : ""}.
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

        {/* Multi-image strip — switch between uploads, each edits separately. */}
        <EditorGallery
          gallery={gallery}
          activeImage={activeImage}
          maxImages={maxGalleryImages}
          loading={loading}
          onSwitch={onSwitchImage}
          onRemove={onRemoveImage}
          onAddMore={() => fileRef.current?.click()}
        />
      </section>
    </>
  );
}