/**
 * Compact static clickable banner for Free users only.
 * Destinations come from ADS_CONFIG — never shown as raw text.
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
          "flex h-[50px] w-full max-w-[320px] items-center justify-center rounded-lg border border-border/60",
          "bg-secondary/40 text-center text-xs font-medium text-muted-foreground",
          "transition-colors hover:border-primary/40 hover:text-foreground",
          "sm:h-[60px] sm:max-w-[468px] sm:text-sm",
        )}
        aria-label="Sponsored"
      >
        <span className="px-3">Sponsored</span>
      </a>
    </div>
  );
}
