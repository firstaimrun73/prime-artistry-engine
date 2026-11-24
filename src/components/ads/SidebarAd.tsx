/**
 * Sidebar placement — verified Adsterra Direct Link card (compact).
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function SidebarAd({
  placement = "sidebar",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="compact" />;
}
