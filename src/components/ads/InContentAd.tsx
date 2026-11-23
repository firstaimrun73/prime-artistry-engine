/**
 * In-content Direct Link — natural break between sections.
 * Does not grant Motio2edit credits.
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function InContentAd({
  placement = "in-content",
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
      title="Recommended for creators"
      subtitle="Sponsored partner offer · Opens in a new tab"
      cta="Explore"
    />
  );
}
