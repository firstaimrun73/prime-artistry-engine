import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";

export function ResponsiveBanner({
  slot,
  placement,
}: {
  slot?: string;
  placement?: AdPlacement;
}) {
  const visible = useAdsVisible(placement);
  if (!visible) return null;
  if (!ADS_CONFIG.placements.topBanner) return null;
  return (
    <div className="mx-auto my-4 flex w-full max-w-[728px] justify-center px-4">
      <AdContainer slot={slot} format="auto" responsive className="w-full" />
    </div>
  );
}
