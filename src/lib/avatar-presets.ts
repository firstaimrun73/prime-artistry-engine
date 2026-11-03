/**
 * Simple initials-based avatars. No cartoon gallery.
 * Uploaded profile photos remain in profiles.avatar_url as storage paths.
 * When no photo: render initials circle via initialsAvatarDataUrl().
 */

export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
};

/** Empty list — gallery removed. Keep type for compile compatibility. */
export const AVATAR_PRESETS: AvatarPreset[] = [];

export function isPresetAvatar(avatarUrl: string | null | undefined): boolean {
  return !!avatarUrl && avatarUrl.startsWith("preset:");
}

export function presetIdFromUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith("preset:")) return null;
  return avatarUrl.slice("preset:".length);
}

export function getPresetSrc(_id: string): string | null {
  return null;
}

/** Deterministic initials color from user id. */
function hashHue(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** SVG data URL: circular initials on Motio-friendly dark background. */
export function initialsAvatarDataUrl(
  nameOrEmail: string | null | undefined,
  userId?: string,
): string {
  const raw = (nameOrEmail || "U").trim();
  const parts = raw.split(/[\s@._-]+/).filter(Boolean);
  const initials = (
    parts.length >= 2
      ? (parts[0][0] + parts[1][0])
      : raw.slice(0, 2)
  ).toUpperCase();
  const hue = hashHue(userId || raw);
  const bg = `hsl(${hue} 42% 28%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="48" fill="${bg}"/>
  <text x="48" y="48" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="#F5F1EC">${initials}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Resolve display src: uploaded signed URL, or initials. Never cartoon presets. */
export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  signedUrl?: string | null,
  opts?: { nameOrEmail?: string | null; userId?: string },
): string | undefined {
  if (avatarUrl && !avatarUrl.startsWith("preset:")) {
    return signedUrl ?? undefined;
  }
  return initialsAvatarDataUrl(opts?.nameOrEmail, opts?.userId);
}

/** @deprecated Prefer initialsAvatarDataUrl. Kept for compile compat. */
export function defaultPresetId(_userId: string): string {
  return "initials";
}
