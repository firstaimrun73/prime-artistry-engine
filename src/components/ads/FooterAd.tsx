import { DirectLinkAd } from "./DirectLinkAd";

/** Footer placement — free users only via DirectLinkAd policy. */
export function FooterAd({ placement = "footer" }: { placement?: string }) {
  return <DirectLinkAd placement={placement} />;
}
