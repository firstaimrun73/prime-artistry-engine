/**
 * Opt-in "Get free credits" CTA — opens Monetag / direct-link in a new tab.
 * Does NOT grant app credits. Credits only via server (purchase, Christmas RPC, signed callbacks).
 */
import { Gift, ExternalLink } from "lucide-react";
import { DIRECT_LINK_URL } from "@/config/ads";
import { cn } from "@/lib/utils";

type Variant = "card" | "inline" | "button";

const COPY = {
  title: "Claim free credits",
  subtitle: "Visit partner offers · complete simple tasks · unlock extra credits",
  cta: "Get free credits",
  note: "Opens partner site. App credits are added only after partner confirmation — not automatic.",
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
          "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
          className,
        )}
      >
        <Gift className="h-4 w-4" aria-hidden />
        {COPY.cta}
        <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
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
          "inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400",
          className,
        )}
      >
        <Gift className="h-3.5 w-3.5" aria-hidden />
        {COPY.cta}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-violet-500/10 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Gift className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-semibold tracking-tight">{COPY.title}</p>
            <p className="text-sm text-muted-foreground">{COPY.subtitle}</p>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {COPY.cta}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <p className="text-[11px] leading-snug text-muted-foreground">{COPY.note}</p>
        </div>
      </div>
    </div>
  );
}
