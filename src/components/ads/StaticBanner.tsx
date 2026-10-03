/**
 * Compact static clickable banner for Free users only.
 * Destinations come from ADS_CONFIG — never shown as raw text.
 * Mobile ~320×50, desktop ~468×60. Normal document flow.
 */
import { bannerHref } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";
import { cn } from "@/lib/utils";

type Props = {
  placement?: AdPlacement;
  /** Rotation seed so multiple banners on a page can differ. */
  seed?: string;
  className?: string;
};

export function StaticBanner({ placement, seed = "default", className }: Props) {
  const visible = useAdsVisible(placement);
  if (!visible) return null;

  const href = bannerHref(seed + (placement ?? ""));

  return (
    <div className={cn("mx-auto flex w-full max-w-[728px] justify-center px-3 py-2", className)}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(
          "flex h-[50px] w-full max-w-[320px] items-center justify-center gap-2 rounded-lg border border-border",
          "bg-gradient-to-r from-secondary/80 via-card to-secondary/80 text-center text-xs font-semibold text-foreground",
          "shadow-sm transition-colors hover:border-primary/50 hover:from-secondary hover:to-secondary",
          "sm:h-[60px] sm:max-w-[468px] sm:text-sm",
        )}
        aria-label="Sponsored"
      >
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:text-[11px]">
          Sponsored
        </span>
        <span className="text-muted-foreground">Discover more</span>
      </a>
    </div>
  );
}
