/**
 * Dual-account public asset host mapping (Account 1 + Account 2).
 *
 * - assets.motio2edit.com  → Account 1 bucket motio2edit-media (existing)
 * - assets2.motio2edit.com → Account 2 bucket motio2edit-assets-2 (Worker proxy)
 *
 * Mapping is persistent and explicit (by exact key or prefix). Never random per request.
 * Until objects are copied to Account 2 and the Worker is production-verified,
 * every key resolves to Account 1 so the live homepage is unchanged.
 *
 * Private user media (users/**), signed URLs, uploads, AI outputs, credits,
 * payments — not handled here. Those stay on Account 1 / existing r2.server.ts.
 */

export const R2_PUBLIC_HOST_1 = "https://assets.motio2edit.com" as const;
export const R2_PUBLIC_HOST_2 = "https://assets2.motio2edit.com" as const;

export type R2PublicHost = typeof R2_PUBLIC_HOST_1 | typeof R2_PUBLIC_HOST_2;

/**
 * Keys (or prefixes ending with /) that must be served from Account 2 once
 * the Worker + objects are live. Empty = everything still on Account 1.
 *
 * Example after migration of media_6 samples:
 *   "samples/media_6/"
 *   "samples/media_1/Alone-sail_standard.mp4"
 */
export const R2_ACCOUNT2_KEYS: readonly string[] = [
  // Intentionally empty until staging Worker passes and objects are copied.
  // Add stable keys/prefixes only — never alternate randomly.
];

/**
 * Feature flag: when false, always return Account 1 host even if a key is listed.
 * Flip to true only after `assets2.motio2edit.com` is deployed and verified.
 */
export const R2_ACCOUNT2_ENABLED = false;

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "").replace(/^https?:\/\/[^/]+\//i, "");
}

/**
 * Resolve public CDN base for a sample object key.
 * Deterministic: same key → same host every request.
 */
export function r2PublicHostForKey(key: string): R2PublicHost {
  if (!R2_ACCOUNT2_ENABLED || R2_ACCOUNT2_KEYS.length === 0) {
    return R2_PUBLIC_HOST_1;
  }
  const k = normalizeKey(key);
  for (const entry of R2_ACCOUNT2_KEYS) {
    const e = entry.replace(/^\/+/, "");
    if (e.endsWith("/")) {
      if (k.startsWith(e) || k === e.slice(0, -1)) return R2_PUBLIC_HOST_2;
    } else if (k === e) {
      return R2_PUBLIC_HOST_2;
    }
  }
  return R2_PUBLIC_HOST_1;
}

/** Build full public URL for a sample key using the persistent host map. */
export function r2PublicUrlForKey(key: string): string {
  const host = r2PublicHostForKey(key);
  const k = normalizeKey(key)
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `${host}/${k}`;
}
