import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical product wordmark: Motio2edit
 * Only the digit "2" uses the primary highlight color.
 * The letter "O" is never specially colored.
 */
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
        "inline-flex min-w-0 items-center gap-2 font-extrabold tracking-tight",
        className,
      )}
    >
      {showIcon && <Sparkles className={cn(icon, "shrink-0 text-primary")} />}
      <span className={cn("leading-none whitespace-nowrap", text)}>
        Motio<span className="text-primary">2</span>edit
      </span>
    </span>
  );
}

/** Plain text brand for titles / meta (no icon). */
export const BRAND_NAME = "Motio2edit";
