import { getPlanLimits } from "@/utils/planLimits";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface MultiImageInputProps {
  userPlan: string;
  /** base64 data URIs or URLs */
  images: string[];
  onChange: (imgs: string[]) => void;
  disabled?: boolean;
}

export function MultiImageInput({ userPlan, images, onChange, disabled }: MultiImageInputProps) {
  const limits = getPlanLimits(userPlan);
  const isFree = userPlan === "free" || !userPlan;
  const maxAllowed = isFree ? 1 : limits.maxImages;
  const canAddMore = images.length < maxAllowed;
  const atLimit = images.length >= maxAllowed;

  const notifyFreeLock = () => {
    toast.error("Multi-image editing is available on paid plans. Upgrade your plan to use multiple images.", {
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
      // Free: never accept additional reference images
      if (images.length >= 1 || files.length > 1) {
        notifyFreeLock();
        return;
      }
      // First image only if empty — still single-image workflow
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
        toast.message(`Your plan allows up to ${maxAllowed} images.`);
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
    <div className="space-y-3">
      {isFree && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Multi-image locked on Free</p>
            <p className="mt-0.5 text-muted-foreground">
              Single image only.{" "}
              <Link to="/pricing" className="font-medium text-primary hover:underline">
                Upgrade
              </Link>{" "}
              to edit with multiple images.
            </p>
          </div>
        </div>
      )}

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

        {canAddMore && !disabled && !isFree && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition hover:border-primary">
            <span className="text-2xl text-muted-foreground">+</span>
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
            onClick={isFree ? notifyFreeLock : () => toast.message(`Limit is ${maxAllowed} images on your plan.`)}
            className="relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-center transition hover:border-primary hover:bg-primary/10"
          >
            <Lock className="h-4 w-4 text-primary" />
            <span className="px-1 text-[10px] font-semibold leading-tight text-primary">
              {isFree ? "Upgrade" : "Limit"}
            </span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {isFree ? (
          <>
            Free plan: 1 image{" "}
            <Link to="/pricing" className="ml-1 font-medium text-primary hover:underline">
              Unlock multi-image
            </Link>
          </>
        ) : (
          <>
            {images.length}/{maxAllowed} images
            {atLimit && (
              <Link to="/pricing" className="ml-2 font-medium text-primary hover:underline">
                Higher limits on higher plans
              </Link>
            )}
          </>
        )}
      </p>
    </div>
  );
}
