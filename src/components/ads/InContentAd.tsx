import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";

export function InContentAd({
  slot,
  placement,
}: {
  slot?: string;
  placement?: AdPlacement;
}) {
  const visible = useAdsVisible(placement);
  if (!visible) return null;
  if (!ADS_CONFIG.placements.inContent) return null;
  return (
    <div className="my-8 flex w-full justify-center px-4">
      <div className="w-full max-w-[336px]">
        <AdContainer slot={slot} format="fluid" layoutKey="-gw-3+1f-3d+2z" />
      </div>
    </div>
  );
}
