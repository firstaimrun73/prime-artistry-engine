import { DirectLinkAd } from "./DirectLinkAd";

export function InContentAd({ placement = "in-content" }: { placement?: string }) {
  return <DirectLinkAd placement={placement} />;
}
