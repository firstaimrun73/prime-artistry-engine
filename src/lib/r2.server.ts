/**
 * Cloudflare R2 — server-only object storage (S3-compatible).
 * Secrets never leave the server. Browser loads media via public base URL or signed GET.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function isR2Configured(): boolean {
  return !!(env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_R2_ACCESS_KEY_ID") && env("CLOUDFLARE_R2_SECRET_ACCESS_KEY") && env("CLOUDFLARE_R2_BUCKET_NAME"));
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = env("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured.");
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucket(): string {
  const b = env("CLOUDFLARE_R2_BUCKET_NAME");
  if (!b) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set.");
  return b;
}

/**
 * Public delivery base (custom domain or r2.dev). No trailing slash.
 * Production architecture (one system):
 *   Browser samples: VITE_R2_PUBLIC_URL + key  (Vite inlines at build)
 *   Server outputs:  VITE_R2_PUBLIC_URL || CLOUDFLARE_R2_PUBLIC_URL || R2_PUBLIC_BASE_URL
 * Secrets (CLOUDFLARE_R2_ACCESS_KEY_ID / SECRET) never leave the server.
 */
export function r2PublicBaseUrl(): string | null {
  const u = env("VITE_R2_PUBLIC_URL") || env("CLOUDFLARE_R2_PUBLIC_URL") || env("R2_PUBLIC_BASE_URL");
  if (!u) return null;
  return u.replace(/\/$/, "");
}

export function r2PublicObjectUrl(key: string): string | null {
  const base = r2PublicBaseUrl();
  if (!base) return null;
  const k = key.replace(/^\//, "");
  return `${base}/${k}`;
}

export async function r2PutObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string }> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: opts.key.replace(/^\//, ""),
      Body: opts.body,
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );
  return { key: opts.key.replace(/^\//, "") };
}

export async function r2SignedGetUrl(key: string, expiresInSec = 3600 * 24 * 7): Promise<string> {
  const client = getClient();
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key.replace(/^\//, "") });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSec });
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key.replace(/^\//, "") }));
    return true;
  } catch {
    return false;
  }
}

/** Prefer public URL; fall back to signed GET when R2 is configured. */
export async function r2ResolveDeliveryUrl(key: string): Promise<string | null> {
  const k = key.replace(/^\//, "");
  const pub = r2PublicObjectUrl(k);
  if (pub) return pub;
  if (!isR2Configured()) return null;
  try {
    return await r2SignedGetUrl(k);
  } catch {
    return null;
  }
}

export const R2_PREFIX = {
  circleSamples: "circle/samples",
  circleSamplesAdd: "circle/samples/add",
  circleSamplesRemove: "circle/samples/remove",
  circleSamplesInfo: "circle/samples/info",
  imageSamples: "image/samples",
  videoSamples: "video/samples",
  musicSamples: "music/samples",
  userHistory: (userId: string) => `users/${userId}/history`,
  userOutputs: (userId: string) => `users/${userId}/outputs`,
} as const;
