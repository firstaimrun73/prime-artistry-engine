import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicFeedback } from "@/lib/feedback.functions";

export function FeedbackCard({ f }: { f: PublicFeedback }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm",
      )}
    >
      <div className="flex items-center gap-1 text-primary">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn("h-3.5 w-3.5", i < f.rating ? "fill-current" : "opacity-25")}
          />
        ))}
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        &ldquo;{f.message}&rdquo;
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold">{f.userName || "Creator"}</p>
        <p className="shrink-0 text-[10px] text-muted-foreground">{f.category}</p>
      </div>
    </article>
  );
}
