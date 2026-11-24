/**
 * Responsive Adsterra banner — mobile 320×50 / desktop 728×90.
 */
import { AdsterraResponsiveBanner } from "./AdsterraBanner";

export function ResponsiveBanner({
  placement = "responsive-banner",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={`my-4 w-full ${className}`} data-ad-slot="responsive-banner">
      <AdsterraResponsiveBanner placement={placement} />
    </div>
  );
}
