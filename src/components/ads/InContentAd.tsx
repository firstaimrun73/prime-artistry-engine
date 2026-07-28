import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";

export function InContentAd({ slot }: { slot?: string }) {
  if (!ADS_CONFIG.placements.inContent) return null;
  return (
    <div className="my-8 flex w-full justify-center px-4">
      <div className="w-full max-w-[336px]">
        <AdContainer slot={slot} format="fluid" layoutKey="-gw-3+1f-3d+2z" />
      </div>
    </div>
  );
}
