import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Back to Studio hub — use on focused Image / Video / Music pages. */
export function StudioBackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/studio"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      Studio
    </Link>
  );
}
