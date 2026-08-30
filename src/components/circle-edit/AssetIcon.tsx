/**
 * Diagram-first icon for Circle Add assets.
 * NEVER uses emoji. Prefers SVG path (iconPath), else monoline mark letters.
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets";

/** Category fallback monoline paths (viewBox 0 0 64 64) when asset.iconPath is empty. */
const CATEGORY_PATHS: Record<string, string> = {
  animals:
    "M20 36c0-8 6-14 14-14h4c6 0 10 4 12 8l6-4 3 4-4 5v8c0 8-6 16-14 16s-14-6-16-14v-9z",
  nature:
    "M32 12c-2 8-10 14-18 16 8 2 14 10 16 18 2-8 10-14 18-16-8-2-14-10-16-18z M32 28v24",
  vehicles:
    "M10 36l8-14h28l8 14v10H10V36zm10 12a5 5 0 110-10 5 5 0 010 10zm24 0a5 5 0 110-10 5 5 0 010 10z",
  food:
    "M18 40c0-10 6-18 14-18s14 8 14 18v4H18v-4z M22 24c2-6 6-10 10-10s8 4 10 10",
  fashion:
    "M24 14l8 6 8-6 4 8-6 4v22H26V26l-6-4 4-8z",
  objects:
    "M20 20h24v24H20z M28 28h8v8h-8z",
  people:
    "M32 14a8 8 0 110 16 8 8 0 010-16z M16 54c2-10 10-16 16-16s14 6 16 16",
  architecture:
    "M12 52V28l20-14 20 14v24H12zm12-4h8V36h-8v12z",
};

type Props = {
  asset: Pick<CircleAddAsset, "iconPath" | "mark" | "name" | "category">;
  className?: string;
  size?: number;
  isDark?: boolean;
};

export function AssetIcon({ asset, className, size = 28, isDark }: Props) {
  const stroke = isDark ? "rgba(242,242,245,0.92)" : "rgba(26,28,36,0.88)";
  const fill = isDark ? "rgba(123,111,224,0.18)" : "rgba(123,111,224,0.12)";
  const path =
    (asset.iconPath && asset.iconPath.trim()) ||
    CATEGORY_PATHS[asset.category] ||
    CATEGORY_PATHS.objects;

  if (path) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        aria-hidden
        role="img"
      >
        <title>{asset.name}</title>
        <circle cx="32" cy="32" r="30" fill={fill} />
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Final fallback: 1–2 letter mark (never emoji)
  const mark = (asset.mark || asset.name.slice(0, 2)).slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full font-semibold tabular-nums",
        isDark ? "bg-white/10 text-[#F2F2F5]" : "bg-black/5 text-[#1A1C24]",
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
