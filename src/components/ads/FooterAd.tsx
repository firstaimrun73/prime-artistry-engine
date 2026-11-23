/**
 * Footer Direct Link — compact sponsored partner card.
 * Does not grant Motio2edit credits.
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function FooterAd({
  placement = "footer",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <DirectLinkAd
      placement={placement}
      variant="compact"
      className={className}
      title="Explore partner tools"
      subtitle="Sponsored · Opens in a new tab"
      cta="Visit Offer"
    />
  );
}
