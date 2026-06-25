// Crown / membership badge shown next to usernames across the app.
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTier } from "@/lib/plan-tier";
import type { PlanId } from "@/lib/plans";

type Props = {
  plan: PlanId | null | undefined;
  /** Show the "Basic Member" text label alongside the crown. */
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function CrownBadge({ plan, showLabel = false, size = "sm", className }: Props) {
  const tier = getTier(plan);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const isDiamond = tier.crown === "diamond";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
        size === "md" && "text-xs px-2.5 py-1",
        className,
      )}
      style={{
        backgroundColor: `${tier.badgeColor}1A`,
        color: tier.badgeColor,
        border: `1px solid ${tier.badgeColor}55`,
      }}
      title={tier.memberLabel}
    >
      {tier.crown !== "none" && (
        <Crown
          className={cn(iconSize, isDiamond && "drop-shadow-[0_0_3px_currentColor]")}
          style={{ color: tier.crownColor ?? undefined }}
          fill={tier.crownColor ?? "none"}
        />
      )}
      {(showLabel || tier.crown === "none") && <span>{tier.memberLabel}</span>}
    </span>
  );
}
