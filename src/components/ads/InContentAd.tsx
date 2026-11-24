/**
 * In-content placement — verified Adsterra Direct Link card.
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function InContentAd({
  placement = "in-content",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="default" />;
}
