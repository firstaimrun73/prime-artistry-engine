/**
 * Circle 2edit asset icon — ALWAYS uses premium filled 3D AssetVisual.
 * Dark-mode contrast: soft neutral halo behind dark assets so they stay visible.
 * Do NOT use platform emoji.
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets-types";
import { AssetVisual } from "@/components/circle-edit/asset-visuals";

/** Asset IDs that are predominantly dark and need a light halo in dark mode */
const DARK_ASSET_IDS = new Set([
  "obj_glasses",
  "obj_phone",
  "obj_camera",
  "obj_watch",
  "obj_headphones",
  "vehicle_motorcycle",
  "vehicle_bicycle",
  "vehicle_scooter",
  "animal_penguin",
  "cloth_jacket",
  "cloth_suit",
  "cloth_boots",
  "nature_tree",
  "obj_plant",
]);

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
  const needsHalo = isDark && DARK_ASSET_IDS.has(asset.id);

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        needsHalo && "rounded-full",
        className,
      )}
      style={
        needsHalo
          ? {
              background:
                "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 55%, transparent 75%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
            }
          : undefined
      }
    >
      <AssetVisual
        id={asset.id}
        size={size}
        selected={selected}
        animate={animate}
        className={cn(selected && "motion-safe:scale-[1.04]")}
        title={asset.name}
      />
    </span>
  );
}
