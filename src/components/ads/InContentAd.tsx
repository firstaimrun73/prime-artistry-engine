import { DirectLinkAd } from "./DirectLinkAd";

/** Legacy alias — static Direct Link card for free users. */
export function InContentAd({
  placement = "history",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <DirectLinkAd placement={placement} className={className} variant="compact" />;
}
