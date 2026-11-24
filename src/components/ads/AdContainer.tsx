/** Generic container → responsive Adsterra banner */
import { AdsterraResponsiveBanner } from "./AdsterraBanner";

export function AdContainer({
  placement = "container",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <AdsterraResponsiveBanner placement={placement} />
    </div>
  );
}
