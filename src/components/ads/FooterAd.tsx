import { DirectLinkAd } from "./DirectLinkAd";

/**
 * Footer / page-bottom static Direct Link ad for free users only.
 * Limited placement — used sparingly (e.g. pricing).
 */
export function FooterAd({
  placement = "pricing",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="compact" />;
}
