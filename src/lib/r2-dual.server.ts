/**
 * Dual-account R2 — server only.
 *
 * Account 1 (primary): CLOUDFLARE_* → motio2edit-media (and related)
 * Account 2 (secondary): R2_SECOND_* → motio2edit-assets-2
 *
 * Public delivery hosts (browser):
 *   Account 1 → https://assets.motio2edit.com
 *   Account 2 → https://assets2.motio2edit.com (Worker proxy; enable only after verify)
 *
 * Private user media (users/**) stays on Account 1 / existing private-history paths
 * unless an explicit future policy says otherwise. This module does not put
 * private keys on the public Account 2 Worker.
 *
 * Feature flags default OFF so production behavior is unchanged until you opt in.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  R2_PUBLIC_HOST_1,
  R2_PUBLIC_HOST_2,
  R2_ACCOUNT2_ENABLED,
  r2PublicUrlForKey,
} from "./r2-catalog-hosts";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/** Logical storage location recorded with each new object. */
export type R2AccountId = "account1" | "account2";

/** Maps to generations.storage_provider (and similar) string values. */
export function storageProviderForAccount(account: R2AccountId): "r2" | "r2-a2" {
  return account === "account2" ? "r2-a2" : "r2";
}

export function accountFromStorageProvider(
  provider: string | null | undefined,
): R2AccountId {
  if (provider === "r2-a2") return "account2";
  return "account1";
}

/** Master switch: when false, all dual helpers behave as Account 1 only. */
export function isDualR2UploadEnabled(): boolean {
  return env("R2_DUAL_UPLOAD_ENABLED") === "true" || env("R2_DUAL_UPLOAD_ENABLED") === "1";
}

/**
 * Percent of *new public* puts routed to Account 2 (0–100).
 * Only applies when dual upload is enabled and Account 2 is configured.
 */
export function account2UploadPercent(): number {
  const raw = env("R2_ACCOUNT2_UPLOAD_PERCENT");
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

export function isAccount1Configured(): boolean {
  return !!(
    env("CLOUDFLARE_ACCOUNT_ID") &&
    env("CLOUDFLARE_R2_ACCESS_KEY_ID") &&
    env("CLOUDFLARE_R2_SECRET_ACCESS_KEY") &&
    env("CLOUDFLARE_R2_BUCKET_NAME")
  );
}

export function isAccount2Configured(): boolean {
  return !!(
    env("R2_SECOND_ACCOUNT_ID") &&
    env("R2_SECOND_ACCESS_KEY_ID") &&
    env("R2_SECOND_SECRET_ACCESS_KEY") &&
    (env("R2_SECOND_BUCKET_NAME") || env("R2_SECOND_BUCKET"))
  );
}

let client1: S3Client | null = null;
let client2: S3Client | null = null;

function getAccount1Client(): S3Client {
  if (client1) return client1;
  const accountId = env("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = env("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = env("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Account 1 R2 is not configured.");
  }
  client1 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client1;
}

function getAccount2Client(): S3Client {
  if (client2) return client2;
  const accountId = env("R2_SECOND_ACCOUNT_ID");
  const accessKeyId = env("R2_SECOND_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECOND_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Account 2 R2 is not configured.");
  }
  const endpoint =
    env("R2_SECOND_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;
  client2 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client2;
}

function bucket1(): string {
  const b = env("CLOUDFLARE_R2_BUCKET_NAME");
  if (!b) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set.");
  return b;
}

function bucket2(): string {
  const b = env("R2_SECOND_BUCKET_NAME") || env("R2_SECOND_BUCKET");
  if (!b) throw new Error("R2_SECOND_BUCKET_NAME is not set.");
  return b;
}

function clientAndBucket(account: R2AccountId): { client: S3Client; bucket: string } {
  if (account === "account2") {
    return { client: getAccount2Client(), bucket: bucket2() };
  }
  return { client: getAccount1Client(), bucket: bucket1() };
}

/**
 * Capacity-aware routing for NEW public objects only.
 * Deterministic per key when seedKey is provided (same key → same account).
 * Falls back to Account 1 if dual is off or Account 2 is not configured.
 */
export function chooseUploadAccount(opts?: {
  /** Prefer a fixed account (e.g. migration / admin). */
  force?: R2AccountId;
  /** Object key used for stable hashing. */
  seedKey?: string;
  /** If true, never select Account 2 (private user media). */
  privateObject?: boolean;
}): R2AccountId {
  if (opts?.force) {
    if (opts.force === "account2" && !isAccount2Configured()) return "account1";
    return opts.force;
  }
  if (opts?.privateObject) return "account1";
  if (!isDualR2UploadEnabled() || !isAccount2Configured()) return "account1";

  const pct = account2UploadPercent();
  if (pct <= 0) return "account1";
  if (pct >= 100) return "account2";

  const seed = opts?.seedKey || `${Date.now()}-${Math.random()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 100 < pct ? "account2" : "account1";
}

export type DualPutResult = {
  key: string;
  account: R2AccountId;
  storage_provider: "r2" | "r2-a2";
  /** Public URL when the object is a public sample and host is known; else null. */
  public_url: string | null;
};

/**
 * Put object to the chosen account. On Account 2 failure, optionally falls back to Account 1.
 * Never overwrites policy: callers must use unique keys (no silent clobber of existing production keys).
 */
export async function dualR2PutObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  forceAccount?: R2AccountId;
  privateObject?: boolean;
  /** When true (default), Account 2 errors fall back to Account 1. */
  fallbackToAccount1?: boolean;
}): Promise<DualPutResult> {
  const key = opts.key.replace(/^\//, "");
  const account = chooseUploadAccount({
    force: opts.forceAccount,
    seedKey: key,
    privateObject: opts.privateObject,
  });
  const defaultCache = opts.privateObject
    ? "private, max-age=31536000"
    : "public, max-age=31536000, immutable";

  const tryPut = async (acc: R2AccountId) => {
    const { client, bucket } = clientAndBucket(acc);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: opts.body,
        ContentType: opts.contentType,
        CacheControl: opts.cacheControl ?? defaultCache,
      }),
    );
    return acc;
  };

  let used = account;
  try {
    used = await tryPut(account);
  } catch (err) {
    const allowFallback = opts.fallbackToAccount1 !== false && account === "account2";
    if (!allowFallback) throw err;
    console.error("[r2-dual] Account 2 put failed; falling back to Account 1", err);
    used = await tryPut("account1");
  }

  const public_url =
    !opts.privateObject && used === "account2" && R2_ACCOUNT2_ENABLED
      ? r2PublicUrlForKey(key)
      : !opts.privateObject
        ? `${R2_PUBLIC_HOST_1}/${key
            .split("/")
            .map((s) => encodeURIComponent(s))
            .join("/")}`
        : null;

  return {
    key,
    account: used,
    storage_provider: storageProviderForAccount(used),
    public_url,
  };
}

export async function dualR2ObjectExists(
  key: string,
  account: R2AccountId,
): Promise<boolean> {
  try {
    const { client, bucket } = clientAndBucket(account);
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key.replace(/^\//, "") }));
    return true;
  } catch {
    return false;
  }
}

export async function dualR2SignedGetUrl(
  key: string,
  account: R2AccountId,
  expiresInSec = 3600 * 24 * 7,
): Promise<string> {
  const { client, bucket } = clientAndBucket(account);
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key.replace(/^\//, "") });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSec });
}

/**
 * Resolve browser delivery for a registered object.
 * Public Account 2 objects use assets2 host only when R2_ACCOUNT2_ENABLED is true;
 * otherwise signed GET against Account 2 (server-side) or Account 1 public host.
 */
export async function dualR2ResolveDelivery(opts: {
  key: string;
  account?: R2AccountId;
  storage_provider?: string | null;
  privateObject?: boolean;
  expiresInSec?: number;
}): Promise<string | null> {
  const key = opts.key.replace(/^\//, "");
  const account =
    opts.account ?? accountFromStorageProvider(opts.storage_provider);

  if (opts.privateObject || key.startsWith("users/")) {
    if (account === "account2" && isAccount2Configured()) {
      return dualR2SignedGetUrl(key, "account2", opts.expiresInSec);
    }
    if (isAccount1Configured()) {
      return dualR2SignedGetUrl(key, "account1", opts.expiresInSec);
    }
    return null;
  }

  // Public samples
  if (account === "account2") {
    if (R2_ACCOUNT2_ENABLED) {
      return `${R2_PUBLIC_HOST_2}/${key
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/")}`;
    }
    // Worker not production-enabled yet — signed read from Account 2 if configured
    if (isAccount2Configured()) {
      try {
        return await dualR2SignedGetUrl(key, "account2", opts.expiresInSec);
      } catch (e) {
        console.error("[r2-dual] Account 2 signed GET failed", e);
      }
    }
  }

  return `${R2_PUBLIC_HOST_1}/${key
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}

export async function dualR2DeleteObject(
  key: string,
  account: R2AccountId,
): Promise<void> {
  const { client, bucket } = clientAndBucket(account);
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key.replace(/^\//, "") }),
  );
}

/** Health snapshot for admin / monitoring (no secrets). */
export function dualR2Status(): {
  account1: boolean;
  account2: boolean;
  dualUploadEnabled: boolean;
  account2UploadPercent: number;
  publicAccount2HostEnabled: boolean;
} {
  return {
    account1: isAccount1Configured(),
    account2: isAccount2Configured(),
    dualUploadEnabled: isDualR2UploadEnabled(),
    account2UploadPercent: account2UploadPercent(),
    publicAccount2HostEnabled: R2_ACCOUNT2_ENABLED,
  };
}
