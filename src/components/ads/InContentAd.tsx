/** In-content: 300×250 rectangle + Direct Link fallback shape */
import { AdsterraBanner } from "./AdsterraBanner";
import { DirectLinkAd } from "./DirectLinkAd";

export function InContentAd({
  placement = "in-content",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={`my-6 flex flex-col items-center gap-4 ${className}`}>
      <AdsterraBanner size="rect300x250" placement={placement} />
      <DirectLinkAd placement={`${placement}-link`} variant="compact" className="w-full" />
    </div>
  );
}
