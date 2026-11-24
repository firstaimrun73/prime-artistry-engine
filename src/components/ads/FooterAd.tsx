/**
 * Footer placement — verified Adsterra Direct Link card (compact).
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function FooterAd({
  placement = "footer",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="compact" />;
}
