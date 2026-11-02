/**
 * Curated preset avatars — no per-user AI generation cost.
 * Stored in profiles.avatar_url as "preset:<id>".
 * Render via resolveAvatarSrc().
 */

export type AvatarPreset = {
  id: string;
  label: string;
  /** Inline SVG data URL — works offline, no external dependency */
  src: string;
};

function svgAvatar(bg: string, accent: string, face: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="48" fill="${bg}"/>
  ${face}
  <circle cx="48" cy="48" r="46" fill="none" stroke="${accent}" stroke-width="2" opacity="0.35"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Simple friendly faces — diverse colors, not one generic initial circle. */
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "ember",
    label: "Ember",
    src: svgAvatar(
      "#FF6A1A",
      "#FFD4B8",
      `<circle cx="48" cy="40" r="18" fill="#FFE8D6"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#FFE8D6"/><circle cx="41" cy="38" r="2.5" fill="#3D2B1F"/><circle cx="55" cy="38" r="2.5" fill="#3D2B1F"/><path d="M42 46 Q48 52 54 46" stroke="#3D2B1F" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "ocean",
    label: "Ocean",
    src: svgAvatar(
      "#0EA5E9",
      "#BAE6FD",
      `<circle cx="48" cy="40" r="18" fill="#E0F2FE"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#E0F2FE"/><circle cx="41" cy="38" r="2.5" fill="#0C4A6E"/><circle cx="55" cy="38" r="2.5" fill="#0C4A6E"/><path d="M42 47 Q48 51 54 47" stroke="#0C4A6E" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "forest",
    label: "Forest",
    src: svgAvatar(
      "#16A34A",
      "#BBF7D0",
      `<circle cx="48" cy="40" r="18" fill="#DCFCE7"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#DCFCE7"/><circle cx="41" cy="38" r="2.5" fill="#14532D"/><circle cx="55" cy="38" r="2.5" fill="#14532D"/><path d="M42 46 Q48 52 54 46" stroke="#14532D" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "violet",
    label: "Violet",
    src: svgAvatar(
      "#7C3AED",
      "#DDD6FE",
      `<circle cx="48" cy="40" r="18" fill="#EDE9FE"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#EDE9FE"/><circle cx="41" cy="38" r="2.5" fill="#4C1D95"/><circle cx="55" cy="38" r="2.5" fill="#4C1D95"/><path d="M42 47 Q48 50 54 47" stroke="#4C1D95" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "slate",
    label: "Slate",
    src: svgAvatar(
      "#475569",
      "#CBD5E1",
      `<circle cx="48" cy="40" r="18" fill="#F1F5F9"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#F1F5F9"/><circle cx="41" cy="38" r="2.5" fill="#1E293B"/><circle cx="55" cy="38" r="2.5" fill="#1E293B"/><path d="M42 46 Q48 51 54 46" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "rose",
    label: "Rose",
    src: svgAvatar(
      "#E11D48",
      "#FECDD3",
      `<circle cx="48" cy="40" r="18" fill="#FFE4E6"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#FFE4E6"/><circle cx="41" cy="38" r="2.5" fill="#881337"/><circle cx="55" cy="38" r="2.5" fill="#881337"/><path d="M42 46 Q48 52 54 46" stroke="#881337" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "amber",
    label: "Amber",
    src: svgAvatar(
      "#D97706",
      "#FDE68A",
      `<circle cx="48" cy="40" r="18" fill="#FEF3C7"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#FEF3C7"/><circle cx="41" cy="38" r="2.5" fill="#78350F"/><circle cx="55" cy="38" r="2.5" fill="#78350F"/><path d="M42 47 Q48 51 54 47" stroke="#78350F" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: "mint",
    label: "Mint",
    src: svgAvatar(
      "#0D9488",
      "#99F6E4",
      `<circle cx="48" cy="40" r="18" fill="#CCFBF1"/><ellipse cx="48" cy="78" rx="28" ry="22" fill="#CCFBF1"/><circle cx="41" cy="38" r="2.5" fill="#134E4A"/><circle cx="55" cy="38" r="2.5" fill="#134E4A"/><path d="M42 46 Q48 52 54 46" stroke="#134E4A" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    ),
  },
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

/** Resolve display src for avatar (preset data URL, signed URL, or null). */
export function resolveAvatarSrc(
  avatarUrl: string | null | undefined,
  signedUrl?: string | null,
): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith("preset:")) {
    return getPresetSrc(avatarUrl.slice("preset:".length)) ?? undefined;
  }
  return signedUrl ?? undefined;
}

/** Deterministic default preset for users with no avatar (based on user id). */
export function defaultPresetId(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_PRESETS[h % AVATAR_PRESETS.length].id;
}
