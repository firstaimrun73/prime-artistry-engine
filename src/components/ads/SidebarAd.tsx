/** Sidebar: 300×250 rectangle */
import { AdsterraBanner } from "./AdsterraBanner";

export function SidebarAd({
  placement = "sidebar",
  className = "",
}: {
  placement?: string;
  className?: string;
}) {
  return (
    <div className={`my-3 ${className}`}>
      <AdsterraBanner size="rect300x250" placement={placement} />
    </div>
  );
}
