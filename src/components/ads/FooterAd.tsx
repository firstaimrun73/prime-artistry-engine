/** Footer: responsive Adsterra banner */
import { AdsterraResponsiveBanner } from "./AdsterraBanner";

export function FooterAd({
  placement = "footer",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={`my-4 ${className}`}>
      <AdsterraResponsiveBanner placement={placement} />
    </div>
  );
}
