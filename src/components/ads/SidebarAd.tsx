import { useEffect, useState } from "react";
import { AdContainer } from "./AdContainer";
import { ADS_CONFIG } from "@/config/ads";
import { useAdsVisible } from "@/lib/site-settings";
import type { AdPlacement } from "@/lib/admin-control.functions";

/** 160x600 sidebar; desktop-only (>=1280px). */
export function SidebarAd({
  slot,
  placement,
}: {
  slot?: string;
  placement?: AdPlacement;
}) {
  const visible = useAdsVisible(placement);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const on = () => setOk(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  if (!visible) return null;
  if (!ok) return null;
  if (!ADS_CONFIG.placements.leftSidebar && !ADS_CONFIG.placements.rightSidebar)
    return null;
  return (
    <div className="hidden xl:block">
      <AdContainer slot={slot} width={160} height={600} responsive={false} />
    </div>
  );
}
