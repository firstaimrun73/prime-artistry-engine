import { StaticBanner } from "./StaticBanner";
import type { AdPlacement } from "@/lib/admin-control.functions";

/** Footer static banner — Free users only; never on pricing/security/auth/chat. */
export function FooterAd({
  placement,
  seed = "footer",
}: {
  slot?: string;
  placement?: AdPlacement;
  seed?: string;
}) {
  return <StaticBanner placement={placement} seed={seed} className="my-4" />;
}
