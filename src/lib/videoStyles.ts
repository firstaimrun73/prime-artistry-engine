/**
 * Video Studio — UI style registry only (Phase 1).
 * Client never sees recipes. Selecting a style sets styleId only.
 */

export const VIDEO_STYLE_ASSET_BASE =
  "https://assets.motio2edit.com/motio2edit-styles-R2/video-styles";

/** @deprecated use VIDEO_STYLE_ASSET_BASE */
export const VIDEO_STYLE_THUMB_BASE = VIDEO_STYLE_ASSET_BASE;

export type StyleTier = "common" | "ai_plus" | "premium";

export type VideoStyleUi = {
  id: string;
  name: string;
  tier: StyleTier;
  /** null for 'none' (X tile) */
  thumb: string | null;
  /** optional muted loop for selected tile */
  preview?: string;
  /** false = hidden from the strip */
  enabled: boolean;
};

/** Temporary plan mapping — single constant for later plan finalisation. */
export const STYLE_TIER_MIN_PLAN = {
  common: "free",
  ai_plus: "plus", // Plus, Pro, Studio, Business
  premium: "pro", // Pro, Studio, Business
} as const;

const PLAN_RANK: Record<string, number> = {
  free: 0,
  lite: 1,
  plus: 2,
  pro: 3,
  studio: 4,
  business: 5,
};

export function canUseStyle(
  plan: string | null | undefined,
  tier: StyleTier,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const need = STYLE_TIER_MIN_PLAN[tier];
  const have = PLAN_RANK[(plan ?? "free").toLowerCase()] ?? 0;
  const min = PLAN_RANK[need] ?? 0;
  return have >= min;
}

function thumbUrl(id: string): string {
  return `${VIDEO_STYLE_ASSET_BASE}/thumbs/${id}.webp`;
}
function previewUrl(id: string): string {
  return `${VIDEO_STYLE_ASSET_BASE}/previews/${id}.mp4`;
}

/**
 * Strip order: None → Common → AI+ → Premium (table order within each tier).
 * soft-portrait enabled:false until thumbnail exists.
 */
export const VIDEO_STYLE_UI: VideoStyleUi[] = [
  { id: "none", name: "None", tier: "common", thumb: null, enabled: true },
  // Common
  { id: "cinematic", name: "Cinematic", tier: "common", thumb: thumbUrl("cinematic"), enabled: true },
  { id: "dreamy", name: "Dreamy", tier: "common", thumb: thumbUrl("dreamy"), enabled: true },
  { id: "vibrant", name: "Vibrant", tier: "common", thumb: thumbUrl("vibrant"), enabled: true },
  { id: "vintage-film", name: "Vintage Film", tier: "common", thumb: thumbUrl("vintage-film"), enabled: true },
  { id: "documentary", name: "Documentary", tier: "common", thumb: thumbUrl("documentary"), enabled: true },
  { id: "minimal", name: "Minimal", tier: "common", thumb: thumbUrl("minimal"), enabled: true },
  { id: "nature", name: "Nature", tier: "common", thumb: thumbUrl("nature"), enabled: true },
  // AI+
  { id: "futuristic", name: "Futuristic", tier: "ai_plus", thumb: thumbUrl("futuristic"), enabled: true },
  { id: "cyberpunk", name: "Cyberpunk", tier: "ai_plus", thumb: thumbUrl("cyberpunk"), enabled: true },
  { id: "retro-future", name: "Retro Future", tier: "ai_plus", thumb: thumbUrl("retro-future"), enabled: true },
  { id: "noir", name: "Noir", tier: "ai_plus", thumb: thumbUrl("noir"), enabled: true },
  { id: "oil-painting", name: "Oil Painting", tier: "ai_plus", thumb: thumbUrl("oil-painting"), enabled: true },
  { id: "watercolor", name: "Watercolor", tier: "ai_plus", thumb: thumbUrl("watercolor"), enabled: true },
  {
    id: "soft-portrait",
    name: "Soft Portrait",
    tier: "ai_plus",
    thumb: thumbUrl("soft-portrait"),
    enabled: false, // not uploaded yet
  },
  // Premium
  { id: "fantasy", name: "Fantasy", tier: "premium", thumb: thumbUrl("fantasy"), enabled: true },
  { id: "dark-fantasy", name: "Dark Fantasy", tier: "premium", thumb: thumbUrl("dark-fantasy"), enabled: true },
  { id: "anime-inspired", name: "Anime-Inspired", tier: "premium", thumb: thumbUrl("anime-inspired"), enabled: true },
  { id: "luxury", name: "Luxury", tier: "premium", thumb: thumbUrl("luxury"), enabled: true },
  {
    id: "epic-adventure",
    name: "Epic Adventure",
    tier: "premium",
    thumb: thumbUrl("epic-adventure"),
    preview: previewUrl("epic-adventure"),
    enabled: true,
  },
  {
    id: "graphic-editorial",
    name: "Graphic Editorial",
    tier: "premium",
    thumb: thumbUrl("graphic-editorial"),
    preview: previewUrl("graphic-editorial"),
    enabled: true,
  },
];

/** Enabled styles only (soft-portrait excluded until enabled:true). */
export function videoStylesForStrip(): VideoStyleUi[] {
  return VIDEO_STYLE_UI.filter((s) => s.enabled);
}

export function getStyleById(id: string): VideoStyleUi | undefined {
  return VIDEO_STYLE_UI.find((s) => s.id === id);
}

/** @deprecated prefer .thumb on VideoStyleUi */
export function styleThumbSrc(id: string): string | null {
  if (id === "none") return null;
  const s = getStyleById(id);
  return s?.thumb ?? null;
}

export const STYLE_FALLBACK_GRADIENT: Record<string, string> = {
  none: "from-zinc-200/80 to-zinc-400/60 dark:from-zinc-700 dark:to-zinc-900",
  cinematic: "from-slate-600 via-indigo-800 to-black",
  dreamy: "from-pink-200 via-purple-200 to-sky-300 dark:from-pink-900 dark:via-purple-900 dark:to-sky-950",
  vibrant: "from-fuchsia-400 via-orange-400 to-yellow-300",
  "vintage-film": "from-amber-200 via-orange-300 to-stone-600",
  documentary: "from-emerald-300 via-teal-500 to-teal-900",
  minimal: "from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950",
  nature: "from-lime-300 via-emerald-500 to-green-900",
  futuristic: "from-cyan-300 via-blue-500 to-indigo-900",
  cyberpunk: "from-fuchsia-500 via-purple-700 to-cyan-400",
  "retro-future": "from-pink-400 via-orange-500 to-violet-700",
  noir: "from-zinc-600 via-zinc-800 to-black",
  "oil-painting": "from-amber-400 via-red-700 to-stone-900",
  watercolor: "from-sky-200 via-rose-200 to-amber-100 dark:from-sky-900 dark:via-rose-900 dark:to-amber-950",
  "soft-portrait": "from-rose-100 via-orange-100 to-amber-200 dark:from-rose-950 dark:via-orange-950 dark:to-amber-950",
  fantasy: "from-violet-300 via-purple-500 to-indigo-800",
  "dark-fantasy": "from-zinc-800 via-purple-950 to-black",
  "anime-inspired": "from-fuchsia-400 via-sky-400 to-rose-400",
  luxury: "from-yellow-100 via-amber-300 to-yellow-700",
  "epic-adventure": "from-orange-400 via-red-600 to-amber-900",
  "graphic-editorial": "from-red-500 via-zinc-800 to-black",
};
