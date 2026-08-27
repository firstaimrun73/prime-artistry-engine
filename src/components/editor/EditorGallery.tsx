import { Lock, Plus, X } from "lucide-react";
import type { GalleryItem } from "@/lib/editor/editor.types";

interface EditorGalleryProps {
  gallery: GalleryItem[];
  activeImage: number;
  maxImages: number;
  loading: boolean;
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
  loading,
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
        <span className="min-w-0 truncate">
          {gallery.length} image{gallery.length === 1 ? "" : "s"} selected
        </span>
        <span className="shrink-0 tabular-nums">
          Limit {maxImages} · active {activeImage + 1}/{gallery.length}
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
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-border hover:border-primary/50"
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

        {showOpenAdd && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={loading}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 sm:h-[72px] sm:w-[72px]"
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
            className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition hover:border-primary/60 disabled:opacity-50 sm:h-[72px] sm:w-[72px]"
            aria-label={lockAdd || maxImages <= 1 ? "Upgrade for more images" : "Image limit reached"}
          >
            <Lock className="h-4 w-4" />
            <span className="text-[9px] font-semibold leading-none sm:text-[10px]">
              {lockAdd || maxImages <= 1 ? "1 max" : "Limit"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
