/**
 * Remove BG sample media (R2) + gallery cards.
 * Real before/after pairs only — no placeholder duplicates.
 */

export const REMOVE_BG_ROSE_BEFORE =
  "https://assets.motio2edit.com/samples/circle-2edit/file_000000001b80821091ce891b23fc036f.png";

export const REMOVE_BG_ROSE_AFTER =
  "https://assets.motio2edit.com/samples/circle-2edit/file_000000008dc481f4b1f73107c3caa1c1.png";

export const REMOVE_BG_CAR_BEFORE =
  "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0003.jpg";

export const REMOVE_BG_CAR_AFTER =
  "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0000.jpg";

// Fixed mapping: Before = original, After = bg-removed
export const REMOVE_BG_PORTRAIT_BEFORE =
  "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0001.jpg";

export const REMOVE_BG_PORTRAIT_AFTER =
  "https://assets.motio2edit.com/samples/circle-2edit/IMG-20260927-WA0002.jpg";

export type RemoveBgGalleryItem = {
  id: string;
  title: string;
  before: string;
  after: string;
  /** Layout hint: square cards share a row; wide uses full width */
  aspect: "1:1" | "16:9" | "3:4" | "4:5";
};

/**
 * Gallery — interactive CompareSlider cards.
 * Rose + Portrait (1:1) share a row on desktop; Car (wide) spans full width at correct 16:9.
 */
export const REMOVE_BG_GALLERY: RemoveBgGalleryItem[] = [
  {
    id: "rose",
    title: "Rose",
    before: REMOVE_BG_ROSE_BEFORE,
    after: REMOVE_BG_ROSE_AFTER,
    aspect: "1:1",
  },
  {
    id: "portrait",
    title: "Portrait",
    before: REMOVE_BG_PORTRAIT_BEFORE,
    after: REMOVE_BG_PORTRAIT_AFTER,
    aspect: "1:1",
  },
  {
    id: "car",
    title: "Car",
    before: REMOVE_BG_CAR_BEFORE,
    after: REMOVE_BG_CAR_AFTER,
    aspect: "16:9",
  },
];

/** Info page — animated before→after using real rose pair */
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
