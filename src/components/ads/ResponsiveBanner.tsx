import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";

export function ResponsiveBanner({ slot }: { slot?: string }) {
  if (!ADS_CONFIG.placements.topBanner) return null;
  return (
    <div className="mx-auto my-4 flex w-full max-w-[728px] justify-center px-4">
      <AdContainer slot={slot} format="auto" responsive className="w-full" />
    </div>
  );
}
