import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";

export function FooterAd({ slot }: { slot?: string }) {
  if (!ADS_CONFIG.placements.footer) return null;
  return (
    <div className="mx-auto my-6 flex w-full max-w-[728px] justify-center px-4">
      <AdContainer slot={slot} format="auto" responsive className="w-full" />
    </div>
  );
}
