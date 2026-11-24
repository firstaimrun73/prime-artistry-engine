/**
 * Responsive in-page banner placement.
 * Uses the verified Adsterra Direct Link (only approved Adsterra credential in repo).
 * No third-party banner zone IDs are present in source; do not invent any.
 */
import { DirectLinkAd } from "./DirectLinkAd";

export function ResponsiveBanner({
  placement = "responsive-banner",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`} data-ad-slot="responsive-banner">
      <DirectLinkAd placement={placement} variant="default" />
    </div>
  );
}
