import { cn } from "@/lib/utils";

/**
 * Motio2edit mark — rounded app tile + generative spark (star + plus).
 * Brand primary orange (matches site CTAs / Generate button).
 * Header size kept large enough to read at a glance on mobile.
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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animate && "motio-mark-animate", className)}
      aria-hidden
    >
      {/* Rounded square tile */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11"
        className="fill-primary/15 stroke-primary"
        strokeWidth="2.25"
      />

      {/* Main 4-point spark */}
      <path
        d="M24 11.5 L26.35 20.15 L35 22.5 L26.35 24.85 L24 33.5 L21.65 24.85 L13 22.5 L21.65 20.15 Z"
        className="fill-primary"
      />

      {/* Soft plus through the spark (reference detail) */}
      <path
        d="M24 15.2v14.6M16.7 22.5h14.6"
        className="stroke-primary"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* Secondary small spark (upper-right) */}
      <path
        d="M34.2 13.2 L35.05 15.35 L37.3 16.2 L35.05 17.05 L34.2 19.2 L33.35 17.05 L31.1 16.2 L33.35 15.35 Z"
        className="fill-primary"
      />

      {/* Tiny accent dot (lower-left) */}
      <circle cx="16.2" cy="30.8" r="1.55" className="fill-primary" opacity="0.9" />
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
  // Easy to see in sticky header
  const icon =
    size === "lg"
      ? "h-9 w-9 sm:h-10 sm:w-10"
      : size === "sm"
        ? "h-6 w-6"
        : "h-8 w-8 sm:h-9 sm:w-9";

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
