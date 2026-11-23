/**
 * Partner exploration CTA — opens approved partner link in a new tab.
 * Does NOT grant Motio2edit credits. Credits only via server (purchase, signed callbacks).
 */
import { ExternalLink, Sparkles } from "lucide-react";
import { DIRECT_LINK_URL, SPONSOR_DISPLAY_NAME } from "@/config/ads";
import { cn } from "@/lib/utils";

type Variant = "card" | "inline" | "button";

const COPY = {
  title: "Explore partner offers",
  subtitle: "Discover tools and opportunities from our partners",
  cta: "Explore Offer",
  note: "Sponsored \u00b7 Opens partner site in a new tab \u00b7 Does not add credits automatically",
} as const;

export function FreeCreditOffer({
  variant = "card",
  className,
  compact,
}: {
  variant?: Variant;
  className?: string;
  compact?: boolean;
}) {
  const href = DIRECT_LINK_URL;

  if (variant === "button" || compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {COPY.cta}
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(
          "inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline",
          className,
        )}
      >
        {COPY.title}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm transition hover:border-primary/40 hover:bg-card",
        className,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Sponsored \u00b7 {SPONSOR_DISPLAY_NAME}
        </p>
        <p className="text-sm font-bold text-foreground">{COPY.title}</p>
        <p className="text-xs text-muted-foreground">{COPY.note}</p>
      </div>
      <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        {COPY.cta}
      </span>
    </a>
  );
}
