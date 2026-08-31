/**
 * Diagram-first icon for Circle Add assets (PDF §3).
 * NEVER uses emoji. Prefers unique per-asset SVG path (iconPath).
 * Selected state changes treatment only, not the silhouette.
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets";

type Props = {
  asset: Pick<CircleAddAsset, "iconPath" | "mark" | "name" | "category">;
  className?: string;
  size?: number;
  isDark?: boolean;
  selected?: boolean;
};

export function AssetIcon({ asset, className, size = 28, isDark, selected }: Props) {
  const stroke = isDark ? "rgba(242,242,245,0.92)" : "rgba(26,28,36,0.88)";
  const strokeSelected = isDark ? "rgba(200,190,255,0.98)" : "rgba(90,78,200,0.95)";
  const fill = isDark ? "rgba(123,111,224,0.18)" : "rgba(123,111,224,0.12)";
  const fillSelected = isDark ? "rgba(123,111,224,0.32)" : "rgba(123,111,224,0.22)";
  const path = asset.iconPath?.trim() || "";

  if (path) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn(
          "shrink-0 transition-[filter,transform] duration-200",
          selected && "motion-safe:scale-[1.04]",
          className,
        )}
        style={
          selected
            ? {
                filter: isDark
                  ? "drop-shadow(0 0 4px rgba(123,111,224,0.55))"
                  : "drop-shadow(0 1px 3px rgba(90,78,200,0.35))",
              }
            : undefined
        }
        aria-hidden
        role="img"
      >
        <title>{asset.name}</title>
        <circle cx="32" cy="32" r="30" fill={selected ? fillSelected : fill} />
        <path
          d={path}
          fill="none"
          stroke={selected ? strokeSelected : stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Last resort only — PDF requires unique paths for the 21; mark should not appear for them
  const mark = (asset.mark || asset.name.slice(0, 2)).slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full font-semibold tabular-nums",
        isDark ? "bg-white/10 text-[#F2F2F5]" : "bg-black/5 text-[#1A1C24]",
        selected && (isDark ? "ring-1 ring-violet-400/50" : "ring-1 ring-violet-500/40"),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      aria-hidden
      title={asset.name}
    >
      {mark}
    </span>
  );
}
