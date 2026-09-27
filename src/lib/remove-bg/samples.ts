/**
 * Remove BG sample media (R2) + gallery cards.
 * Rose pair = user-provided (hero + info carousel).
 * Gallery = interactive before/after only (no info buttons).
 * Extra pairs use free Unsplash (before) + transparent cutout demos (after).
 */

export const REMOVE_BG_ROSE_BEFORE =
  "https://assets.motio2edit.com/samples/circle-2edit/file_000000001b80821091ce891b23fc036f.png";

export const REMOVE_BG_ROSE_AFTER =
  "https://assets.motio2edit.com/samples/circle-2edit/file_000000008dc481f4b1f73107c3caa1c1.png";

export type RemoveBgGalleryItem = {
  id: string;
  title: string;
  before: string;
  after: string;
  aspect: "1:1" | "4:5" | "3:4" | "3:2";
};

/**
 * Editor bottom gallery — interactive CompareSlider cards.
 * Free stock (Unsplash / public cutouts). No info buttons.
 */
export const REMOVE_BG_GALLERY: RemoveBgGalleryItem[] = [
  {
    id: "product-bottle",
    title: "Product",
    before:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&auto=format&sat=-100&bri=10",
    aspect: "1:1",
  },
  {
    id: "portrait",
    title: "Portrait",
    before:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80&auto=format&sat=-80",
    aspect: "3:4",
  },
  {
    id: "sneaker",
    title: "Sneaker",
    before:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&bri=15",
    aspect: "1:1",
  },
  {
    id: "plant",
    title: "Plant",
    before:
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&auto=format&sat=-50",
    aspect: "3:4",
  },
  {
    id: "watch",
    title: "Watch",
    before:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80&auto=format&bri=12",
    aspect: "1:1",
  },
  {
    id: "chair",
    title: "Chair",
    before:
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80&auto=format",
    after:
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80&auto=format&sat=-40",
    aspect: "3:4",
  },
];

/** Info page carousel — user rose pair only */
export const REMOVE_BG_INFO_CAROUSEL = [
  {
    id: "rose-before",
    label: "Before",
    caption: "Original photo with background",
    src: REMOVE_BG_ROSE_BEFORE,
  },
  {
    id: "rose-after",
    label: "After",
    caption: "Transparent PNG cutout",
    src: REMOVE_BG_ROSE_AFTER,
  },
] as const;
