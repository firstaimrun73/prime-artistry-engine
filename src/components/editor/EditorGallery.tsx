import { Plus, X } from "lucide-react";
import type { GalleryItem } from "@/lib/editor/editor.types";

interface EditorGalleryProps {
  gallery: GalleryItem[];
  activeImage: number;
  maxImages: number;
  loading: boolean;
  onSwitch: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddMore: () => void;
}

/** Renders ALL selected images as a compact thumbnail grid (never first-only). */
export function EditorGallery({
  gallery,
  activeImage,
  maxImages,
  loading,
  onSwitch,
  onRemove,
  onAddMore,
}: EditorGalleryProps) {
  if (gallery.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {gallery.length} image{gallery.length === 1 ? "" : "s"} selected
        </span>
        <span>
          Limit {maxImages} · active {activeImage + 1}/{gallery.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {gallery.map((item, i) => (
          <div key={item.id} className="relative h-16 w-16 sm:h-[72px] sm:w-[72px]">
            <button
              type="button"
              onClick={() => onSwitch(i)}
              className={`h-full w-full overflow-hidden rounded-lg border-2 transition-colors ${
                i === activeImage ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={item.preview}
                alt={`Upload ${i + 1}`}
                className="h-full w-full object-cover protected-image"
              />
            </button>
            <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <button
              type="button"
              aria-label={`Remove image ${i + 1}`}
              onClick={() => onRemove(i)}
              disabled={loading}
              className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {gallery.length < maxImages && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={loading}
            className="grid h-16 w-16 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 sm:h-[72px] sm:w-[72px]"
            aria-label="Add more images"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
