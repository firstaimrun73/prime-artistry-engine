import { cn } from "@/lib/utils";

/**
 * Canonical product wordmark: Motio2edit
 * Only the digit "2" uses the primary highlight color.
 * Original mark: layered frames suggesting image/video/music edit — not a third-party AI logo.
 */
function MotioMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Outer frame */}
      <rect
        x="3"
        y="4"
        width="14"
        height="14"
        rx="2.5"
        className="stroke-primary"
        strokeWidth="1.75"
      />
      {/* Inner frame offset — motion / multi-media depth */}
      <rect
        x="7"
        y="6"
        width="14"
        height="14"
        rx="2.5"
        className="stroke-foreground/70"
        strokeWidth="1.5"
        opacity="0.85"
      />
      {/* Accent pixel */}
      <circle cx="10" cy="11" r="1.35" className="fill-primary" />
    </svg>
  );
}

export function BrandMark({
  className,
  showIcon = true,
  size = "md",
}: {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-base sm:text-lg";
  const icon =
    size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={cn(
        "notranslate inline-flex min-w-0 items-center gap-2 font-extrabold tracking-tight",
        className,
      )}
      translate="no"
      data-no-translate
    >
      {showIcon && <MotioMarkIcon className={cn(icon, "shrink-0")} />}
      <span className={cn("leading-none whitespace-nowrap", text)}>
        Motio<span className="text-primary">2</span>edit
      </span>
    </span>
  );
}

/** Plain text brand for titles / meta (no icon). */
export const BRAND_NAME = "Motio2edit";
