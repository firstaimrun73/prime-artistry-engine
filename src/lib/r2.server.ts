/**
 * Cloudflare R2 — server-only object storage (S3-compatible).
 * Secrets never leave the server.
 *
 * Delivery rules:
 * - Public sample prefixes may use VITE_R2_PUBLIC_URL / CLOUDFLARE_R2_PUBLIC_URL.
 * - Private user media under users/** MUST use signed GET URLs.
 *   Never return a public r2.dev URL for private outputs (causes 401 on private buckets).
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
 * Public delivery base for SAMPLE assets only (custom domain or r2.dev).
 * Do NOT use this for private users/** objects.
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

/** True for private per-user output/history keys. */
export function isPrivateUserObjectKey(key: string): boolean {
  const k = key.replace(/^\//, "");
  return k.startsWith("users/");
}

/** True for marketing / sample keys that may be served via public base URL. */
export function isPublicSampleObjectKey(key: string): boolean {
  const k = key.replace(/^\//, "");
  return (
    k.startsWith("circle/samples") ||
    k.startsWith("image/samples") ||
    k.startsWith("video/samples") ||
    k.startsWith("music/samples") ||
    k.startsWith("samples/")
  );
}

/**
 * Extract object key from a public r2.dev / custom-domain URL when possible.
 * Used to recover delivery for rows that stored a broken public URL.
 */
export function extractR2ObjectKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (
      host.endsWith(".r2.dev") ||
      host.includes("r2.cloudflarestorage.com") ||
      (r2PublicBaseUrl() && host === new URL(r2PublicBaseUrl()!).hostname)
    ) {
      const key = u.pathname.replace(/^\//, "");
      return key.length > 0 ? key : null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function r2PutObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string }> {
  const client = getClient();
  const key = opts.key.replace(/^\//, "");
  const defaultCache = isPrivateUserObjectKey(key)
    ? "private, max-age=31536000"
    : "public, max-age=31536000, immutable";
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl ?? defaultCache,
    }),
  );
  return { key };
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

/**
 * Resolve a browser-loadable delivery URL for an R2 object key.
 *
 * Private user media (users/**) ALWAYS uses signed GET — never public r2.dev.
 * Public sample prefixes may use the configured public base URL.
 *
 * Root cause of 401 on *.r2.dev: public base was preferred for private user
 * outputs while the bucket has no public access on that hostname.
 */
export async function r2ResolveDeliveryUrl(
  key: string,
  opts?: { preferSigned?: boolean; expiresInSec?: number },
): Promise<string | null> {
  const k = key.replace(/^\//, "");
  const forceSigned = opts?.preferSigned === true || isPrivateUserObjectKey(k);
  const expiresInSec = opts?.expiresInSec ?? 3600 * 24 * 7;

  if (!forceSigned && isPublicSampleObjectKey(k)) {
    const pub = r2PublicObjectUrl(k);
    if (pub) return pub;
  }

  if (isR2Configured()) {
    try {
      return await r2SignedGetUrl(k, expiresInSec);
    } catch (e) {
      console.error("[r2] signed GET failed for key:", k, e);
    }
  }

  // Last resort for public samples only — never for users/**
  if (!forceSigned) {
    const pub = r2PublicObjectUrl(k);
    if (pub) return pub;
  }
  return null;
}

/**
 * Resolve delivery for a stored generations.output_url / r2_object_key pair.
 * Prefers permanent key; falls back to extracting key from a broken public URL.
 */
export async function r2ResolveStoredOutput(opts: {
  r2ObjectKey?: string | null;
  outputUrl?: string | null;
  expiresInSec?: number;
}): Promise<string | null> {
  const key =
    (opts.r2ObjectKey && opts.r2ObjectKey.replace(/^\//, "")) ||
    (opts.outputUrl ? extractR2ObjectKeyFromUrl(opts.outputUrl) : null);
  if (key) {
    const signed = await r2ResolveDeliveryUrl(key, {
      preferSigned: isPrivateUserObjectKey(key),
      expiresInSec: opts.expiresInSec,
    });
    if (signed) return signed;
  }
  // Already a usable https URL (e.g. supabase signed, fal temporary) — pass through
  if (opts.outputUrl && opts.outputUrl.startsWith("https://")) {
    // Never pass through unauthorized public r2.dev user paths
    const extracted = extractR2ObjectKeyFromUrl(opts.outputUrl);
    if (extracted && isPrivateUserObjectKey(extracted)) return null;
    return opts.outputUrl;
  }
  return null;
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
