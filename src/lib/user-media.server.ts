/**
 * Shared user-media storage + delivery for Motio2edit.
 *
 * PAID / ADMIN → private R2 bucket motio2edit-user-media
 *   env: CLOUDFLARE_R2_USER_ACCESS_KEY_ID, CLOUDFLARE_R2_USER_SECRET_ACCESS_KEY,
 *        CLOUDFLARE_R2_USER_BUCKET_NAME (or CLOUDFLARE_R2_USER_BUCKET)
 *   keys: users/{userId}/outputs|videos|music/{id}.ext
 *   delivery: temporary signed GET only
 *
 * FREE → private Vercel Blob store motio2edit-user-history
 *   keys: users/{userId}/history/{id}/output.ext
 *
 * Public samples stay on primary r2.server.ts (motio2edit-media).
 * Never persist permanent public r2.dev URLs for user media.
 */
import {
  isPrivateR2Configured,
  isPrivateBlobConfigured,
  privateR2PutObject,
  privateR2SignedGetUrl,
  privateBlobPutObject,
  historyObjectKey,
} from "@/lib/private-history-storage.server";

export type UserMediaKind = "image" | "video" | "music" | "other";

export type IngestResult = {
  objectKey: string;
  deliveryUrl: string;
  contentType: string;
  storageProvider: "r2" | "blob";
};

function extFor(kind: UserMediaKind, contentType: string | null, sourceUrl: string): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("mp4") || ct.includes("video")) return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  try {
    const path = new URL(sourceUrl).pathname.toLowerCase();
    for (const e of ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mp3", "wav", "ogg"]) {
      if (path.endsWith("." + e)) return e === "jpeg" ? "jpg" : e;
    }
  } catch {
    /* ignore */
  }
  if (kind === "video") return "mp4";
  if (kind === "music") return "mp3";
  return "jpg";
}

function contentTypeFor(kind: UserMediaKind, ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  return map[ext] || (kind === "video" ? "video/mp4" : kind === "music" ? "audio/mpeg" : "image/jpeg");
}

function isFreePlan(plan: string | null | undefined): boolean {
  const p = (plan ?? "free").toLowerCase();
  return p === "free" || p === "";
}

async function fetchProviderBytes(
  sourceUrl: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  if (!sourceUrl.startsWith("https://")) return null;
  let res: Response;
  try {
    res = await fetch(sourceUrl, { redirect: "follow" });
  } catch (e) {
    console.error("[user-media] fetch provider failed:", e);
    return null;
  }
  if (!res.ok) {
    console.error("[user-media] provider HTTP", res.status);
    return null;
  }
  const ctHeader = res.headers.get("content-type") || "";
  if (ctHeader.includes("text/html")) {
    console.error("[user-media] provider returned HTML, not media");
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) {
    console.error("[user-media] provider body too small");
    return null;
  }
  return { buf, contentType: ctHeader };
}

/**
 * Store provider/CDN media into the correct private store for the user's plan.
 *
 * PAID/ADMIN → private R2 (motio2edit-user-media)
 * FREE → private Vercel Blob (motio2edit-user-history)
 *
 * Returns permanent object key + temporary browser delivery URL.
 */
export async function ingestProviderMediaToUserR2(opts: {
  userId: string;
  sourceUrl: string;
  kind: UserMediaKind;
  generationId?: string | null;
  /** profiles.plan — free uses Blob; paid/admin uses private R2 */
  plan?: string | null;
  /** When true, always prefer private R2 (admin product path) */
  preferPrivateR2?: boolean;
}): Promise<IngestResult | null> {
  const useR2 =
    opts.preferPrivateR2 === true || !isFreePlan(opts.plan)
      ? isPrivateR2Configured()
      : false;
  const useBlob = !useR2 && isPrivateBlobConfigured();

  // Already a private-user key path: re-sign from private R2 when possible
  if (opts.sourceUrl.includes("/users/") || opts.sourceUrl.startsWith("users/")) {
    try {
      const { extractR2ObjectKeyFromUrl } = await import("@/lib/r2.server");
      const existing =
        extractR2ObjectKeyFromUrl(opts.sourceUrl) ||
        (opts.sourceUrl.startsWith("users/") ? opts.sourceUrl.replace(/^\//, "") : null);
      if (existing && existing.startsWith("users/") && isPrivateR2Configured()) {
        const deliveryUrl = await privateR2SignedGetUrl(existing);
        return {
          objectKey: existing,
          deliveryUrl,
          contentType: contentTypeFor(opts.kind, "bin"),
          storageProvider: "r2",
        };
      }
    } catch {
      /* fall through to re-fetch */
    }
  }

  const fetched = await fetchProviderBytes(opts.sourceUrl);
  if (!fetched) return null;
  const ext = extFor(opts.kind, fetched.contentType, opts.sourceUrl);
  const contentType = contentTypeFor(opts.kind, ext);
  const stamp = opts.generationId || `${Date.now()}`;

  if (useR2) {
    const folder =
      opts.kind === "music" ? "music" : opts.kind === "video" ? "videos" : "outputs";
    const objectKey = `users/${opts.userId}/${folder}/${stamp}.${ext}`;
    try {
      await privateR2PutObject({ key: objectKey, body: fetched.buf, contentType });
      const deliveryUrl = await privateR2SignedGetUrl(objectKey);
      return { objectKey, deliveryUrl, contentType, storageProvider: "r2" };
    } catch (e) {
      console.error("[user-media] private R2 put failed:", e);
      return null;
    }
  }

  if (useBlob) {
    const objectKey = historyObjectKey(opts.userId, stamp, "output", ext);
    try {
      const { url } = await privateBlobPutObject({
        pathname: objectKey,
        body: fetched.buf,
        contentType,
      });
      return {
        objectKey,
        deliveryUrl: url,
        contentType,
        storageProvider: "blob",
      };
    } catch (e) {
      console.error("[user-media] private Blob put failed:", e);
      return null;
    }
  }

  console.warn(
    "[user-media] no private store configured (need CLOUDFLARE_R2_USER_* or BLOB_READ_WRITE_TOKEN)",
  );
  return null;
}

/** @deprecated alias — use ingestProviderMediaToUserR2 */
export const ingestProviderMediaToPrivateStore = ingestProviderMediaToUserR2;
