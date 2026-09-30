/**
 * User-media helpers.
 *
 * Architecture correction:
 * Generated History media is NOT copied into Vercel Blob, Cloudflare R2, or Supabase Storage.
 * History stores the fal.ai / provider source URL + metadata only.
 *
 * Public sample assets continue to use primary r2.server.ts (motio2edit-media).
 *
 * ingestProviderMediaToUserR2 is retained as a no-op stub so call sites compile
 * without uploading bytes.
 */

export type UserMediaKind = "image" | "video" | "music" | "other";

export type IngestResult = {
  objectKey: string;
  deliveryUrl: string;
  contentType: string;
  storageProvider: "r2" | "blob";
};

/**
 * @deprecated Generated media must remain on fal.ai. Do not copy to Motio2edit storage.
 * Always returns null so callers keep the original provider URL.
 */
export async function ingestProviderMediaToUserR2(_opts: {
  userId: string;
  sourceUrl: string;
  kind: UserMediaKind;
  generationId?: string | null;
  plan?: string | null;
  preferPrivateR2?: boolean;
}): Promise<IngestResult | null> {
  // Intentionally no-op: do not fetch provider media or write R2/Blob.
  return null;
}

/** @deprecated alias */
export const ingestProviderMediaToPrivateStore = ingestProviderMediaToUserR2;
