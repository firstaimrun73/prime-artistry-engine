/**
 * Neutral Motio2edit static banner — Free users only.
 * Dotted border + Ad label. No third-party logos. No credits for clicks.
 */
import { ADS_CONFIG, bannerHref } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";
import { cn } from "@/lib/utils";

type Props = {
  placement?: AdPlacement;
  seed?: string;
  className?: string;
};

export function StaticBanner({ placement, seed = "default", className }: Props) {
  const visible = useAdsVisible(placement);
  if (!visible) return null;

  const href = bannerHref(seed + (placement ?? ""));
  const heading = ADS_CONFIG.heading;
  const sub = ADS_CONFIG.subline;
  const cta = ADS_CONFIG.buttonText;

  return (
    <div className={cn("mx-auto w-full max-w-[728px] px-3 py-2", className)}>
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={cn(
          "relative flex min-h-[56px] w-full flex-col items-stretch justify-center gap-1 overflow-hidden rounded-xl",
          "border-2 border-dotted border-white/40 px-4 py-3 sm:min-h-[64px] sm:flex-row sm:items-center sm:justify-between sm:gap-4",
          "bg-gradient-to-r from-[#0b1220] via-[#132238] to-[#1a3a6b] text-white shadow-sm",
          "transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]",
        )}
        aria-label="Advertisement"
      >
        <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">
          Ad
        </span>
        <div className="min-w-0 pl-8 sm:pl-10">
          <p className="text-sm font-bold leading-snug sm:text-base">{heading}</p>
          <p className="mt-0.5 text-xs text-white/75 sm:text-sm">{sub}</p>
        </div>
        <span
          className={cn(
            "mt-2 inline-flex shrink-0 items-center justify-center self-start rounded-full bg-[#FF5A1F] px-4 py-2 text-sm font-bold text-white sm:mt-0 sm:self-center",
            "motion-safe:shadow-[0_0_20px_rgba(255,90,31,0.35)] motion-safe:transition motion-safe:hover:brightness-110",
          )}
        >
          {cta}
        </span>
      </a>
    </div>
  );
}
