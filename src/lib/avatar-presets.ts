/**
 * Cartoon animal avatar presets (Dicebear open license) + initials fallback.
 * Uploaded photos still use profiles.avatar_url storage paths.
 */

export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
};

/** Cute animal bots — free Dicebear bottts style, seed-stable URLs. */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "fox", label: "Fox", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Fox&backgroundColor=0E0C0A" },
  { id: "panda", label: "Panda", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Panda&backgroundColor=0E0C0A" },
  { id: "cat", label: "Cat", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Cat&backgroundColor=0E0C0A" },
  { id: "owl", label: "Owl", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Owl&backgroundColor=0E0C0A" },
  { id: "bear", label: "Bear", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Bear&backgroundColor=0E0C0A" },
  { id: "rabbit", label: "Rabbit", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Rabbit&backgroundColor=0E0C0A" },
  { id: "dog", label: "Dog", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Dog&backgroundColor=0E0C0A" },
  { id: "lion", label: "Lion", src: "https://api.dicebear.com/7.x/bottts/svg?seed=Lion&backgroundColor=0E0C0A" },
];

export function isPresetAvatar(avatarUrl: string | null | undefined): boolean {
  return !!avatarUrl && avatarUrl.startsWith("preset:");
}

export function presetIdFromUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith("preset:")) return null;
  return avatarUrl.slice("preset:".length);
}

export function getPresetSrc(id: string): string | null {
  return AVATAR_PRESETS.find((p) => p.id === id)?.src ?? null;
}

function hashHue(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function initialsAvatarDataUrl(
  nameOrEmail: string | null | undefined,
  userId?: string,
): string {
  const raw = (nameOrEmail || "U").trim();
  const parts = raw.split(/[\s@._-]+/).filter(Boolean);
  const initials = (
    parts.length >= 2 ? parts[0][0] + parts[1][0] : raw.slice(0, 2)
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

export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  signedUrl?: string | null,
  opts?: { nameOrEmail?: string | null; userId?: string },
): string | undefined {
  if (avatarUrl?.startsWith("preset:")) {
    return getPresetSrc(avatarUrl.slice("preset:".length)) ?? undefined;
  }
  if (avatarUrl) {
    return signedUrl ?? undefined;
  }
  return initialsAvatarDataUrl(opts?.nameOrEmail, opts?.userId);
}

export function defaultPresetId(userId: string): string {
  const i = Math.abs(
    [...userId].reduce((a, c) => a + c.charCodeAt(0), 0),
  ) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[i]?.id ?? "fox";
}
