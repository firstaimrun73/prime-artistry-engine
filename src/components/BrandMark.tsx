import { cn } from "@/lib/utils";

/**
 * Motio2edit mark — original product identity.
 * Diagonal twin-star composition (motion + edit precision).
 * Separate SVG groups so Cloudy can animate later (~10–15s icon / ~60s wordmark).
 * Not derived from Gemini or any third-party AI mark.
 */
export function MotioMarkIcon({
  className,
  animate = false,
}: {
  className?: string;
  /** Soft optional pulse for generation screens only */
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Soft disc base — keeps legibility at favicon size */}
      <circle
        cx="16"
        cy="16"
        r="14"
        className="fill-primary/12 stroke-primary/40"
        strokeWidth="1.25"
      />
      {/* Diagonal axis — motion path (animatable) */}
      <g
        className={cn(animate && "origin-center")}
        style={animate ? { animation: "motio-mark-spin 12s ease-in-out infinite" } : undefined}
      >
        <line
          x1="9"
          y1="23"
          x2="23"
          y2="9"
          className="stroke-primary/55"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      {/* Upper-right spark */}
      <g className="motio-star-a">
        <path
          d="M22.5 7.5 L23.35 10.1 L26 11 L23.35 11.9 L22.5 14.5 L21.65 11.9 L19 11 L21.65 10.1 Z"
          className="fill-primary"
        />
        <circle cx="22.5" cy="11" r="1.1" className="fill-primary/90" />
      </g>
      {/* Lower-left spark */}
      <g className="motio-star-b">
        <path
          d="M9.5 17.5 L10.2 19.6 L12.4 20.3 L10.2 21 L9.5 23.1 L8.8 21 L6.6 20.3 L8.8 19.6 Z"
          className="fill-foreground/80"
        />
      </g>
      {/* Center focus pixel — edit precision */}
      <circle cx="16" cy="16" r="2.1" className="fill-primary" />
      <circle cx="16" cy="16" r="0.85" className="fill-background" />
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
