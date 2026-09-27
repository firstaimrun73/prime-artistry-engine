/**
 * Private History media storage — server only.
 *
 * FREE/private History → Vercel Blob store `motio2edit-user-history`
 * PAID/private History → Cloudflare R2 bucket `motio2edit-user-media`
 *   (env: CLOUDFLARE_R2_USER_* )
 *
 * Public samples continue to use src/lib/r2.server.ts (motio2edit-media).
 * Never import this module from client code.
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

// ── Private R2 (paid History) ──────────────────────────────────────────────

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
  // Token for store motio2edit-user-history — server-only, never NEXT_PUBLIC
  return !!(env("BLOB_READ_WRITE_TOKEN") || env("VERCEL_BLOB_READ_WRITE_TOKEN"));
}

function blobToken(): string {
  const t = env("BLOB_READ_WRITE_TOKEN") || env("VERCEL_BLOB_READ_WRITE_TOKEN");
  if (!t) throw new Error("Private Blob token is not configured.");
  return t;
}

/**
 * Upload to the existing private Blob store.
 * pathname is the logical key (e.g. users/{uid}/history/{gid}/output.jpg).
 * Returns the Blob URL (private store; access via token / signed patterns).
 */
export async function privateBlobPutObject(opts: {
  pathname: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ url: string; pathname: string }> {
  // Dynamic import so client bundles never pull Blob SDK
  const { put } = await import("@vercel/blob");
  const pathname = opts.pathname.replace(/^\//, "");
  const result = await put(pathname, opts.body, {
    access: "private",
    contentType: opts.contentType,
    token: blobToken(),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: result.url, pathname };
}

export async function privateBlobDeleteObject(urlOrPathname: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(urlOrPathname, { token: blobToken() });
}

/**
 * Upload generation output bytes to the correct private provider.
 * Does not touch public R2 or Supabase Storage.
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
