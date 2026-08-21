import { AdContainer } from "./AdContainer";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";

export function FooterAd({
  slot,
  placement,
}: {
  slot?: string;
  placement?: AdPlacement;
}) {
  const visible = useAdsVisible(placement);
  if (!visible) return null;
  return (
    <div className="mx-auto my-6 flex w-full max-w-[728px] justify-center px-4">
      <AdContainer slot={slot} format="auto" responsive className="w-full" />
    </div>
  );
}
