/**
 * Circle 2edit asset icon — modern 3D-style emoji for instant recognition.
 * Falls back to AssetVisual SVG if no emoji mapping.
 */
import { cn } from "@/lib/utils";
import type { CircleAddAsset } from "@/lib/circle-edit/add-assets-types";
import { AssetVisual } from "@/components/circle-edit/asset-visuals";

/** Modern colorful emoji mapping — recognizable at small sizes on all platforms */
const EMOJI: Record<string, string> = {
  obj_shoe: "👟",
  obj_vase: "🏺",
  obj_cake: "🎂",
  obj_glasses: "👓",
  obj_hat: "🎩",
  animal_cat: "🐱",
  animal_dog: "🐶",
  animal_deer: "🦌",
  animal_horse: "🐴",
  animal_bird: "🐦",
  animal_rabbit: "🐰",
  animal_owl: "🦉",
  animal_fox: "🦊",
  animal_squirrel: "🐿️",
  animal_swan: "🦢",
  vehicle_car: "🚗",
  vehicle_motorcycle: "🏍️",
  vehicle_bus: "🚌",
  vehicle_scooter: "🛴",
  vehicle_bicycle: "🚲",
  nature_tree: "🌳",
  obj_flower: "🌸",
  obj_camera: "📷",
  obj_phone: "📱",
  obj_watch: "⌚",
  obj_backpack: "🎒",
  obj_chair: "🪑",
  obj_lamp: "💡",
  obj_plant: "🪴",
  obj_book: "📚",
  obj_umbrella: "☂️",
  food_coffee: "☕",
  food_pizza: "🍕",
  food_burger: "🍔",
  food_icecream: "🍦",
  nature_cloud: "☁️",
  nature_sun: "☀️",
  nature_moon: "🌙",
  animal_panda: "🐼",
  animal_penguin: "🐧",
  vehicle_truck: "🚚",
  vehicle_van: "🚐",
};

type Props = {
  asset: CircleAddAsset;
  size?: number;
  isDark?: boolean;
  selected?: boolean;
  className?: string;
  animate?: boolean;
};

export function AssetIcon({ asset, size = 28, isDark = false, selected = false, className, animate = true }: Props) {
  void isDark;
  const emoji = EMOJI[asset.id] || asset.emoji;
  if (emoji) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center leading-none select-none",
          selected && "motion-safe:scale-105",
          className,
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.82),
          lineHeight: 1,
        }}
        role="img"
        aria-label={asset.name}
        title={asset.name}
      >
        {emoji}
      </span>
    );
  }
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
