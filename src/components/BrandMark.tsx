import { cn } from "@/lib/utils";

/**
 * Motio2edit mark — clean image frame + generative spark.
 * White/orange brand treatment; legible at favicon and header sizes.
 */
export function MotioMarkIcon({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animate && "motio-mark-animate", className)}
      aria-hidden
    >
      {/* Soft orange disc — brand presence at small sizes */}
      <circle cx="16" cy="16" r="15" className="fill-primary/15" />
      {/* Image frame */}
      <rect
        x="6"
        y="7"
        width="16"
        height="16"
        rx="3.25"
        className="stroke-primary"
        strokeWidth="2"
        fill="none"
      />
      {/* Crop / precision corner */}
      <path
        d="M10 12h3.5M10 12v3.5"
        className="stroke-primary"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Primary generative spark */}
      <path
        d="M24.5 5 L25.75 8.1 L29 9.25 L25.75 10.4 L24.5 13.5 L23.25 10.4 L20 9.25 L23.25 8.1 Z"
        className="fill-primary"
      />
      {/* Secondary spark */}
      <path
        d="M27 14.5 L27.55 15.95 L29.1 16.5 L27.55 17.05 L27 18.5 L26.45 17.05 L24.9 16.5 L26.45 15.95 Z"
        className="fill-primary"
        fillOpacity="0.8"
      />
    </svg>
  );
}

export function BrandMark({
  className,
  showIcon = true,
  size = "md",
  animateIcon = false,
}: {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  animateIcon?: boolean;
}) {
  const text =
    size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-base sm:text-lg";
  // ~25% larger than previous h-5/h-7 defaults — visible but not oversized
  const icon =
    size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7";

  return (
    <span
      className={cn(
        "notranslate inline-flex min-w-0 items-center gap-2 font-extrabold tracking-tight",
        className,
      )}
      translate="no"
      data-no-translate
    >
      {showIcon && (
        <MotioMarkIcon className={cn(icon, "shrink-0")} animate={animateIcon} />
      )}
      <span className={cn("leading-none whitespace-nowrap", text)}>
        Motio<span className="text-primary">2</span>edit
      </span>
    </span>
  );
}

export const BRAND_NAME = "Motio2edit";
