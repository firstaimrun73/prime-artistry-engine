import { cn } from "@/lib/utils";

/**
 * Motio2edit mark — geometric image-frame + generative spark.
 * Minimal, premium, legible at favicon size. Not a food/gem/biscuit icon.
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
      {/* Image frame — AI image editor identity */}
      <rect
        x="5"
        y="6"
        width="18"
        height="18"
        rx="3.5"
        className="stroke-primary"
        strokeWidth="1.75"
        fill="none"
      />
      {/* Inner crop mark / precision */}
      <path
        d="M9 11.5h4M9 11.5v4"
        className="stroke-primary"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Generative four-point spark (upper-right, outside frame) */}
      <path
        d="M24 5.5 L25.1 8.2 L28 9.2 L25.1 10.2 L24 12.9 L22.9 10.2 L20 9.2 L22.9 8.2 Z"
        className="fill-primary"
      />
      {/* Small secondary spark — motion / AI */}
      <path
        d="M26.5 14 L27 15.3 L28.4 15.8 L27 16.3 L26.5 17.6 L26 16.3 L24.6 15.8 L26 15.3 Z"
        className="fill-primary"
        fillOpacity="0.75"
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
  const icon =
    size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

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

/** Plain text brand for titles / meta (no icon). */
export const BRAND_NAME = "Motio2edit";
