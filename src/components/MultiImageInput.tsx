import { getPlanLimits } from "@/utils/planLimits";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

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
  const atLimit = images.length >= limits.maxImages;
  const isFree = userPlan === "free" || !userPlan;
  const upgradeHint =
    isFree
      ? "Multi-image editing starts with Lite"
      : userPlan === "lite"
        ? "Upgrade to Plus for up to 4 images"
        : "Upgrade for higher multi-image limits";

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
    ).then((newImgs) => onChange([...images, ...newImgs].slice(0, limits.maxImages)));
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
            <input type="file" accept="image/*" multiple={limits.maxImages > 1} className="hidden" onChange={handleUpload} />
          </label>
        )}

        {atLimit && isFree && (
          <Link
            to="/pricing"
            className="relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-center transition hover:border-primary hover:bg-primary/10"
          >
            <Lock className="h-4 w-4 text-primary" />
            <span className="px-1 text-[10px] font-semibold leading-tight text-primary">Upgrade</span>
          </Link>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length}/{limits.maxImages} images
        {atLimit && (
          <Link to="/pricing" className="ml-2 font-medium text-primary hover:underline">
            ↑ {upgradeHint}
          </Link>
        )}
      </p>
    </div>
  );
}
