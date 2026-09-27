/**
 * Remove BG sample media (R2) + gallery cards.
 * User-provided rose pair; gallery uses before/after only (no info buttons).
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
  aspect: "1:1" | "4:5" | "3:4";
};

/** Before/after pairs for the editor bottom gallery (interactive sliders). */
export const REMOVE_BG_GALLERY: RemoveBgGalleryItem[] = [
  {
    id: "rose",
    title: "Rose",
    before: REMOVE_BG_ROSE_BEFORE,
    after: REMOVE_BG_ROSE_AFTER,
    aspect: "1:1",
  },
  {
    id: "rose-2",
    title: "Rose cutout",
    before: REMOVE_BG_ROSE_BEFORE,
    after: REMOVE_BG_ROSE_AFTER,
    aspect: "1:1",
  },
];
