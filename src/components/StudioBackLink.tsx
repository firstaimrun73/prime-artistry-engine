import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Back to homepage — focused studio pages exit to Home. Icon-only circular glass control. */
export function StudioBackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Back to Home"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        "border border-border/60 bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md",
        "transition-colors hover:border-[#FF5A1F]/40 hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
    </Link>
  );
}
