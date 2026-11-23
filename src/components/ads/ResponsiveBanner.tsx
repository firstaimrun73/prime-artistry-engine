/** Responsive Adsterra shell (replaces prior no-op). */
import { AdsterraResponsive } from "./AdsterraBanner";

export function ResponsiveBanner({
  placement = "responsive-banner",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return <AdsterraResponsive placement={placement} className={className} includeRect />;
}
