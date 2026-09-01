/**
 * Circle 2edit asset icon — ALWAYS uses premium filled 3D AssetVisual.
 * Do NOT use platform emoji (user requirement: modern dimensional icons).
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets-types";
import { AssetVisual } from "@/components/circle-edit/asset-visuals";

type Props = {
  asset: CircleAddAsset;
  size?: number;
  isDark?: boolean;
  selected?: boolean;
  className?: string;
  animate?: boolean;
};

export function AssetIcon({
  asset,
  size = 28,
  isDark = false,
  selected = false,
  className,
  animate = true,
}: Props) {
  void isDark;
  return (
    <AssetVisual
      id={asset.id}
      size={size}
      selected={selected}
      animate={animate}
      className={cn("shrink-0", selected && "motion-safe:scale-[1.04]", className)}
      title={asset.name}
    />
  );
}
