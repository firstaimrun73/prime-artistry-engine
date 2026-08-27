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

        {(isFree || atLimit) && (
          <button
            type="button"
            onClick={isFree ? notifyFreeLock : () => toast.message(`Limit is ${maxAllowed} images.`)}
            className={cn(
              "relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-primary/35 bg-primary/5 text-center transition hover:border-primary/60 sm:h-20 sm:w-20",
              isFree && "animate-[lock-pulse_2.4s_ease-in-out_infinite]",
            )}
            aria-label={isFree ? "Upgrade for multiple references" : "Limit reached"}
          >
            <Lock className="h-4 w-4 text-primary" />
            <span className="px-0.5 text-[9px] font-semibold leading-tight text-primary sm:text-[10px]">
              {isFree ? "1 max" : "Limit"}
            </span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {isFree ? (
          <>
            1 image limit.{" "}
            <Link to="/pricing" className="font-medium text-primary hover:underline">
              Upgrade for multiple references
            </Link>
          </>
        ) : (
          <>
            {images.length}/{maxAllowed} references
          </>
        )}
      </p>

      <style>{`@keyframes lock-pulse { 0%,100%{ opacity:1; transform:scale(1)} 50%{ opacity:0.72; transform:scale(0.97)} }`}</style>
    </div>
  );
}
