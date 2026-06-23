import { getPlanLimits } from "@/utils/planLimits";
import { Link } from "@tanstack/react-router";

interface MultiImageInputProps {
  userPlan: string;
  /** base64 data URIs or URLs */
  images: string[];
  onChange: (imgs: string[]) => void;
  disabled?: boolean;
}

export function MultiImageInput({ userPlan, images, onChange, disabled }: MultiImageInputProps) {
  const limits = getPlanLimits(userPlan);
  const canAddMore = images.length < limits.maxImages;
  const atFreeLimit = !canAddMore && userPlan === "free";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image"));
    const remaining = limits.maxImages - images.length;
    const toAdd = files.slice(0, Math.max(0, remaining));
    if (toAdd.length === 0) return;

    Promise.all(
      toAdd.map(
        (f) =>
          new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    ).then((newImgs) => onChange([...images, ...newImgs]));
    // reset so picking the same file again re-triggers change
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative h-20 w-20">
            <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full rounded-lg object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Remove image"
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-[11px] text-destructive-foreground"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {canAddMore && !disabled && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition hover:border-primary">
            <span className="text-2xl text-muted-foreground">+</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length}/{limits.maxImages} images
        {atFreeLimit && (
          <Link to="/pricing" className="ml-2 font-medium text-primary hover:underline">
            ↑ Upgrade for more
          </Link>
        )}
      </p>
    </div>
  );
}
