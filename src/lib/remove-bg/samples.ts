/**
 * Remove BG homepage sample cards.
 * Prefer non-person subjects (flowers, products, pets) per product direction.
 */

export type RemoveBgSample = {
  id: string;
  title: string;
  subtitle: string;
  /** CSS gradient fallback when no remote asset */
  gradient: string;
  emoji: string;
};

export const REMOVE_BG_SAMPLES: RemoveBgSample[] = [
  {
    id: "flower-noise",
    title: "Flower · clean cut",
    subtitle: "Busy background → transparent",
    gradient: "from-rose-200 via-pink-100 to-amber-50",
    emoji: "🌸",
  },
  {
    id: "product-shelf",
    title: "Product shot",
    subtitle: "Shelf clutter → pure subject",
    gradient: "from-sky-200 via-cyan-50 to-white",
    emoji: "📦",
  },
  {
    id: "plant-desk",
    title: "Plant on desk",
    subtitle: "Messy desk → cutout",
    gradient: "from-emerald-200 via-lime-50 to-white",
    emoji: "🌿",
  },
  {
    id: "mug-cafe",
    title: "Mug · café",
    subtitle: "Busy café → subject only",
    gradient: "from-orange-200 via-amber-50 to-white",
    emoji: "☕",
  },
];
