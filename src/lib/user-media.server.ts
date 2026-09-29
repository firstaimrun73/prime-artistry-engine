/**
 * Shared user-media storage + delivery for Motio2edit.
 *
 * USER MEDIA (private): users/{userId}/...
 *   → permanent r2_object_key
 *   → ownership check
 *   → temporary signed GET for browser
 *
 * SAMPLES (public): samples/, frames/, assets/, image/samples/, etc.
 *   → public base URL when configured
 *
 * Never persist permanent public r2.dev URLs for users/**.
 * Never expose R2 credentials to the browser.
 */
import {
  isR2Configured,
  r2PutObject,
  r2ResolveDeliveryUrl,
  isPrivateUserObjectKey,
  extractR2ObjectKeyFromUrl,
  R2_PREFIX,
} from "@/lib/r2.server";

export type UserMediaKind = "image" | "video" | "music" | "other";

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

/**
 * Download provider/CDN bytes and store under users/{userId}/...
 * Returns permanent object key + temporary signed delivery URL.
 */
export async function ingestProviderMediaToUserR2(opts: {
  userId: string;
  sourceUrl: string;
  kind: UserMediaKind;
  /** Optional stable id for key path */
  generationId?: string | null;
}): Promise<{ objectKey: string; deliveryUrl: string; contentType: string } | null> {
  if (!isR2Configured()) return null;
  if (!opts.sourceUrl.startsWith("https://")) return null;
  // Already our private user object — just re-sign
  const existing = extractR2ObjectKeyFromUrl(opts.sourceUrl);
  if (existing && isPrivateUserObjectKey(existing)) {
    const deliveryUrl = await r2ResolveDeliveryUrl(existing, { preferSigned: true });
    if (deliveryUrl) {
      return { objectKey: existing, deliveryUrl, contentType: contentTypeFor(opts.kind, "bin") };
    }
  }

  let res: Response;
  try {
    res = await fetch(opts.sourceUrl, { redirect: "follow" });
  } catch (e) {
    console.error("[user-media] fetch provider failed:", e);
    return null;
  }
  if (!res.ok) {
    console.error("[user-media] provider HTTP", res.status);
    return null;
  }
  // Reject HTML error pages
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
  const ext = extFor(opts.kind, ctHeader, opts.sourceUrl);
  const contentType = contentTypeFor(opts.kind, ext);
  const stamp = opts.generationId || `${Date.now()}`;
  const folder =
    opts.kind === "music" ? "music" : opts.kind === "video" ? "videos" : "outputs";
  const objectKey = `users/${opts.userId}/${folder}/${stamp}.${ext}`;

  try {
    await r2PutObject({ key: objectKey, body: buf, contentType });
    const deliveryUrl = await r2ResolveDeliveryUrl(objectKey, { preferSigned: true });
    if (!deliveryUrl) return null;
    return { objectKey, deliveryUrl, contentType };
  } catch (e) {
    console.error("[user-media] R2 put failed:", e);
    return null;
  }
}

export { R2_PREFIX };
