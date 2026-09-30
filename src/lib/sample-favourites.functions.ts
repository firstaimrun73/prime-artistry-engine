/**
 * Sample likes — DISABLED (no Supabase dependency).
 *
 * Homepage Like is local UI state only (VisualDiscoveryGallery).
 * No sample_favourites table, no persistent counts, no DB writes.
 */
import { createServerFn } from "@tanstack/react-start";

/** @deprecated No-op — local UI only. */
export const toggleSampleFavourite = createServerFn({ method: "POST" }).handler(async () => {
  return { liked: false as const, sampleId: "" as string, disabled: true as const };
});

/** @deprecated No-op — local UI only. */
export const listMySampleFavourites = createServerFn({ method: "GET" }).handler(async () => {
  return { items: [] as const };
});

/** @deprecated No-op — local UI only. */
export const getMyFavouriteIds = createServerFn({ method: "GET" }).handler(async () => {
  return { ids: [] as string[] };
});

/** @deprecated No-op — local UI only. */
export const getAdminFavouriteStats = createServerFn({ method: "GET" }).handler(async () => {
  return {
    isAdmin: false as const,
    total: 0,
    top: [] as { sampleId: string; count: number; title: string | null }[],
    disabled: true as const,
  };
});
