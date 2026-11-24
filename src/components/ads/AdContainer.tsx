/**
 * Generic ad container — routes to Direct Link (verified Adsterra).
 * AdSense permanently disabled; this is not an AdSense slot.
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function AdContainer({
  placement = "container",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="default" />;
}
