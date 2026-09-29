/**
 * Private History media storage — server only.
 *
 * FREE History → Vercel Blob (BLOB_READ_WRITE_TOKEN), access: private
 * PAID/ADMIN History → Cloudflare R2 motio2edit-user-media (CLOUDFLARE_R2_USER_*)
 *
 * Public samples: src/lib/r2.server.ts (motio2edit-media) — never use here for user media.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export type HistoryStorageProvider = "blob" | "r2" | "supabase";

/** Object key layout for private History. */
export function historyObjectKey(
  userId: string,
  generationId: string,
  kind: "original" | "output" | "thumb",
  ext: string,
): string {
  const e = ext.replace(/^\./, "").toLowerCase() || "bin";
  return `users/${userId}/history/${generationId}/${kind}.${e}`;
}

// ── Private R2 (paid/admin History) ─────────────────────────────────────────

export function isPrivateR2Configured(): boolean {
  return !!(
    env("CLOUDFLARE_ACCOUNT_ID") &&
    env("CLOUDFLARE_R2_USER_ACCESS_KEY_ID") &&
    env("CLOUDFLARE_R2_USER_SECRET_ACCESS_KEY") &&
    (env("CLOUDFLARE_R2_USER_BUCKET_NAME") || env("CLOUDFLARE_R2_USER_BUCKET"))
  );
}

let privateR2Client: S3Client | null = null;

function getPrivateR2Client(): S3Client {
  if (privateR2Client) return privateR2Client;
  const accountId = env("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = env("CLOUDFLARE_R2_USER_ACCESS_KEY_ID");
  const secretAccessKey = env("CLOUDFLARE_R2_USER_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Private R2 is not configured.");
  }
  privateR2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return privateR2Client;
}

function privateR2Bucket(): string {
  const b = env("CLOUDFLARE_R2_USER_BUCKET_NAME") || env("CLOUDFLARE_R2_USER_BUCKET");
  if (!b) throw new Error("CLOUDFLARE_R2_USER_BUCKET_NAME is not set.");
  return b;
}

export async function privateR2PutObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string }> {
  const key = opts.key.replace(/^\//, "");
  await getPrivateR2Client().send(
    new PutObjectCommand({
      Bucket: privateR2Bucket(),
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType,
      CacheControl: "private, max-age=31536000",
    }),
  );
  return { key };
}

export async function privateR2DeleteObject(key: string): Promise<void> {
  const k = key.replace(/^\//, "");
  await getPrivateR2Client().send(
    new DeleteObjectCommand({ Bucket: privateR2Bucket(), Key: k }),
  );
}

/** Signed GET for private History (never use r2.dev public URLs). */
export async function privateR2SignedGetUrl(
  key: string,
  expiresInSec = 3600 * 24,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: privateR2Bucket(),
    Key: key.replace(/^\//, ""),
  });
  return getSignedUrl(getPrivateR2Client(), cmd, { expiresIn: expiresInSec });
}

// ── Private Vercel Blob (free History) ─────────────────────────────────────

export function isPrivateBlobConfigured(): boolean {
  return !!(env("BLOB_READ_WRITE_TOKEN") || env("VERCEL_BLOB_READ_WRITE_TOKEN"));
}

function blobToken(): string {
  const t = env("BLOB_READ_WRITE_TOKEN") || env("VERCEL_BLOB_READ_WRITE_TOKEN");
  if (!t) throw new Error("Private Blob token is not configured.");
  return t;
}

/**
 * Upload to private Vercel Blob.
 * pathname is the permanent logical key (store in r2_object_key).
 * Returns pathname + URL string (URL may be private; resolve for browser via privateBlobResolveDelivery).
 */
export async function privateBlobPutObject(opts: {
  pathname: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string; pathname: string }> {
  const { put } = await import("@vercel/blob");
  const pathname = opts.pathname.replace(/^\//, "");
  const result = await put(pathname, opts.body, {
    access: "private",
    contentType: opts.contentType,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
  } as Parameters<typeof put>[2]);
  return { url: result.url, pathname };
}

export async function privateBlobDeleteObject(urlOrPathname: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(urlOrPathname, { token: blobToken() });
}

/**
 * Resolve a browser-usable delivery reference for a private Blob object.
 * Prefer permanent pathname (r2_object_key). Falls back to stored URL.
 *
 * Private Blob URLs are not world-readable; callers that need bytes should
 * use privateBlobFetchBytes. For History UI we return the store URL only when
 * the authenticated owner already passed ownership checks (server function).
 */
export async function privateBlobResolveDelivery(
  pathnameOrUrl: string | null | undefined,
): Promise<string | null> {
  if (!pathnameOrUrl) return null;
  const token = blobToken();
  try {
    // Prefer head/get when available to validate the object still exists
    const blobMod = await import("@vercel/blob");
    const head = (blobMod as { head?: (url: string, opts: { token: string }) => Promise<{ url: string }> }).head;
    if (typeof head === "function" && pathnameOrUrl.startsWith("https://")) {
      const meta = await head(pathnameOrUrl, { token });
      if (meta?.url) return meta.url;
    }
  } catch (e) {
    console.warn("[private-blob] head failed:", e);
  }
  // Return stored URL for owner-scoped server responses only (never public listing)
  if (pathnameOrUrl.startsWith("https://")) return pathnameOrUrl;
  return null;
}

/** Fetch private Blob bytes server-side (download / proxy). */
export async function privateBlobFetchBytes(
  urlOrPathname: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const blobMod = await import("@vercel/blob");
    const get = (blobMod as {
      get?: (
        url: string,
        opts: { access: "private"; token: string },
      ) => Promise<{ stream?: ReadableStream; blob?: Blob } | null>;
    }).get;
    if (typeof get === "function" && urlOrPathname.startsWith("https://")) {
      const result = await get(urlOrPathname, { access: "private", token: blobToken() });
      if (result?.stream) {
        const ab = await new Response(result.stream).arrayBuffer();
        return { body: Buffer.from(ab), contentType: "application/octet-stream" };
      }
    }
  } catch (e) {
    console.warn("[private-blob] get failed:", e);
  }
  return null;
}

/**
 * Upload generation output bytes to the correct private provider.
 */
export async function uploadPrivateHistoryMedia(opts: {
  provider: "blob" | "r2";
  userId: string;
  generationId: string;
  kind: "original" | "output" | "thumb";
  ext: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ storage_provider: "blob" | "r2"; object_key: string; delivery_url: string | null }> {
  const key = historyObjectKey(opts.userId, opts.generationId, opts.kind, opts.ext);
  if (opts.provider === "r2") {
    await privateR2PutObject({ key, body: opts.body, contentType: opts.contentType });
    const delivery_url = await privateR2SignedGetUrl(key).catch(() => null);
    return { storage_provider: "r2", object_key: key, delivery_url };
  }
  const { url } = await privateBlobPutObject({
    pathname: key,
    body: opts.body,
    contentType: opts.contentType,
  });
  return { storage_provider: "blob", object_key: key, delivery_url: url };
}
