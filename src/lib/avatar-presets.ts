/**
 * Cartoon animal avatar presets (Dicebear) + random preset default (no letter initials in UI).
 */

export type AvatarPreset = {
  id: string;
  label: string;
  src: string;
};

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

export function defaultPresetId(userId: string): string {
  const i = Math.abs([...userId].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[i]?.id ?? "fox";
}

/** Always prefer a cute bot avatar over letter initials. */
export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  signedUrl?: string | null,
  opts?: { nameOrEmail?: string | null; userId?: string },
): string | undefined {
  if (avatarUrl?.startsWith("preset:")) {
    return getPresetSrc(avatarUrl.slice("preset:".length)) ?? undefined;
  }
  if (avatarUrl && signedUrl) {
    return signedUrl;
  }
  if (avatarUrl && !avatarUrl.startsWith("preset:") && !signedUrl) {
    // storage path without signed url yet — still fall back to preset so UI is never letter-only
  }
  const seed = opts?.userId || opts?.nameOrEmail || "guest";
  const id = defaultPresetId(String(seed));
  return getPresetSrc(id) ?? AVATAR_PRESETS[0].src;
}
