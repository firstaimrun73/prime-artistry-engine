import { Plus, X, Lock } from "lucide-react";
import type { GalleryItem } from "@/lib/editor/editor.types";

interface EditorGalleryProps {
  gallery: GalleryItem[];
  activeImage: number;
  /** Max images allowed for current plan + experience. */
  maxImages: number;
  loading?: boolean;
  onSwitch: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddMore: () => void;
  /** When true, + is shown locked (Free / at plan limit) instead of opening the picker. */
  lockAdd?: boolean;
  onLockedAdd?: () => void;
}

/** Renders ALL selected images as a compact thumbnail grid (never first-only). */
export function EditorGallery({
  gallery,
  activeImage,
  maxImages,
  loading = false,
  onSwitch,
  onRemove,
  onAddMore,
  lockAdd = false,
  onLockedAdd,
}: EditorGalleryProps) {
  if (gallery.length === 0) return null;

  const atLimit = gallery.length >= maxImages;
  const showOpenAdd = !atLimit && !lockAdd;
  const showLockedAdd = atLimit || lockAdd;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate tabular-nums font-medium text-foreground/80">
          {gallery.length} / {maxImages} images selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {gallery.map((item, i) => (
          <div key={item.id} className="relative h-16 w-16 shrink-0 sm:h-[72px] sm:w-[72px]">
            <button
              type="button"
              onClick={() => onSwitch(i)}
              className={`h-full w-full overflow-hidden rounded-lg border-2 transition-colors ${
                i === activeImage
                  ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/35"
                  : "border-border hover:border-[#FF5A1F]/50"
              }`}
            >
              <img
                src={item.preview}
                alt={`Upload ${i + 1}`}
                className="h-full w-full object-cover protected-image"
                draggable={false}
              />
            </button>
            <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <button
              type="button"
              aria-label={`Remove image ${i + 1}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!loading) onRemove(i);
              }}
              disabled={loading}
              className="absolute -right-1.5 -top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {showOpenAdd && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={loading}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-[#FF5A1F] hover:text-[#FF5A1F] disabled:opacity-50 sm:h-[72px] sm:w-[72px]"
            aria-label="Add more images"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {showLockedAdd && (
          <button
            type="button"
            onClick={() => onLockedAdd?.()}
            disabled={loading}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-dashed border-border/50 text-muted-foreground disabled:opacity-50 sm:h-[72px] sm:w-[72px]"
            aria-label="Image limit reached"
          >
            <Lock className="h-3.5 w-3.5 opacity-70" />
          </button>
        )}
      </div>
    </div>
  );
}
