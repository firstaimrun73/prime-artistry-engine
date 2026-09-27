import { getPlanLimits } from "@/utils/planLimits";
import { Link } from "@tanstack/react-router";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MultiImageInputProps {
  userPlan: string;
  /** base64 data URIs or URLs */
  images: string[];
  onChange: (imgs: string[]) => void;
  disabled?: boolean;
  /** Experience cap (Standard 5 / Premium·Ultra 10). Combined with plan limit. */
  experienceMax?: number;
}

export function MultiImageInput({
  userPlan,
  images,
  onChange,
  disabled,
  experienceMax,
}: MultiImageInputProps) {
  const limits = getPlanLimits(userPlan);
  const isFree = userPlan === "free" || !userPlan;
  const planMax = isFree ? 1 : limits.maxImages;
  const maxAllowed = Math.min(planMax, experienceMax ?? planMax);
  const canAddMore = images.length < maxAllowed;
  const atLimit = images.length >= maxAllowed;

  const notifyFreeLock = () => {
    toast.error("1 image on Free. Upgrade to use multiple references.", {
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "/pricing";
        },
      },
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image"));
    e.target.value = "";

    if (isFree) {
      if (images.length >= 1 || files.length > 1) {
        notifyFreeLock();
        return;
      }
      if (files.length === 1 && images.length === 0) {
        const f = files[0];
        const reader = new FileReader();
        reader.onload = () => onChange([reader.result as string]);
        reader.readAsDataURL(f);
      }
      return;
    }

    const remaining = maxAllowed - images.length;
    const toAdd = files.slice(0, Math.max(0, remaining));
    if (toAdd.length === 0) {
      if (files.length > 0) {
        toast.message(`Up to ${maxAllowed} images on this experience.`);
      }
      return;
    }

    Promise.all(
      toAdd.map(
        (f) =>
          new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(f);
          }),
      ),
    ).then((newImgs) => onChange([...images, ...newImgs].slice(0, maxAllowed)));
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative h-16 w-16 sm:h-20 sm:w-20">
            <img
              src={src}
              alt={`Reference ${i + 1}`}
              className="h-full w-full rounded-lg object-cover ring-1 ring-border"
            />
            <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/65 px-1 text-[10px] font-bold text-white">
              {i + 1}
            </span>
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

        {canAddMore && !disabled && !isFree && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border transition hover:border-primary sm:h-20 sm:w-20">
            <Plus className="h-5 w-5 text-muted-foreground" />
            <input
              type="file"
              accept="image/*"
              multiple={maxAllowed > 1}
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        )}

        {/* No standalone lock tile — gallery + slot is the only add/limit control.
            At paid plan limit, show a quiet disabled + rather than a lock card. */}
        {!isFree && atLimit && (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border/50 text-[10px] font-medium text-muted-foreground sm:h-20 sm:w-20"
            aria-label="Reference limit reached"
          >
            Full
          </div>
        )}
      </div>

      {!isFree && (
        <p className="text-[11px] text-muted-foreground">
          {images.length}/{maxAllowed} references
        </p>
      )}
    </div>
  );
}
