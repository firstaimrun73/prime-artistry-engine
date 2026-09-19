/**
 * Video Studio — UI style registry only.
 * Selecting a style sets styleId only; never rewrites the user prompt.
 */

/** Set later to CDN/base path, e.g. "https://cdn.example.com/styles/video" */
export const VIDEO_STYLE_THUMB_BASE = "";

export type VideoStyleUi = {
  id: string;
  displayName: string;
  /** Resolved as `${VIDEO_STYLE_THUMB_BASE}/${id}.webp` when BASE is set */
  locked: boolean;
};

export const VIDEO_STYLE_UI: VideoStyleUi[] = [
  { id: "none", displayName: "None", locked: false },
  { id: "cinematic", displayName: "Cinematic", locked: false },
  { id: "dreamy", displayName: "Dreamy", locked: false },
  { id: "vibrant", displayName: "Vibrant", locked: false },
  { id: "vintage-film", displayName: "Vintage Film", locked: false },
  { id: "futuristic", displayName: "Futuristic", locked: false },
  { id: "cyberpunk", displayName: "Cyberpunk", locked: false },
  { id: "documentary", displayName: "Documentary", locked: false },
  { id: "fantasy", displayName: "Fantasy", locked: false },
  { id: "dark-fantasy", displayName: "Dark Fantasy", locked: false },
  { id: "anime-inspired", displayName: "Anime-Inspired", locked: false },
  { id: "watercolor", displayName: "Watercolor", locked: false },
  { id: "oil-painting", displayName: "Oil Painting", locked: false },
  { id: "minimal", displayName: "Minimal", locked: false },
  { id: "luxury", displayName: "Luxury", locked: false },
  { id: "nature", displayName: "Nature", locked: false },
  { id: "noir", displayName: "Noir", locked: false },
  { id: "retro-future", displayName: "Retro Future", locked: false },
  { id: "epic-adventure", displayName: "Epic Adventure", locked: false },
  { id: "soft-portrait", displayName: "Soft Portrait", locked: false },
  { id: "graphic-editorial", displayName: "Graphic Editorial", locked: false },
];

export function styleThumbSrc(id: string): string | null {
  if (id === "none" || !VIDEO_STYLE_THUMB_BASE) return null;
  return `${VIDEO_STYLE_THUMB_BASE}/${id}.webp`;
}

/** Neutral gradient fallbacks when thumbnail missing */
export const STYLE_FALLBACK_GRADIENT: Record<string, string> = {
  none: "from-zinc-200/80 to-zinc-400/60 dark:from-zinc-700 dark:to-zinc-900",
  cinematic: "from-slate-600 via-indigo-800 to-black",
  dreamy: "from-pink-200 via-purple-200 to-sky-300 dark:from-pink-900 dark:via-purple-900 dark:to-sky-950",
  vibrant: "from-fuchsia-400 via-orange-400 to-yellow-300",
  "vintage-film": "from-amber-200 via-orange-300 to-stone-600",
  futuristic: "from-cyan-300 via-blue-500 to-indigo-900",
  cyberpunk: "from-fuchsia-500 via-purple-700 to-cyan-400",
  documentary: "from-emerald-300 via-teal-500 to-teal-900",
  fantasy: "from-violet-300 via-purple-500 to-indigo-800",
  "dark-fantasy": "from-zinc-800 via-purple-950 to-black",
  "anime-inspired": "from-fuchsia-400 via-sky-400 to-rose-400",
  watercolor: "from-sky-200 via-rose-200 to-amber-100 dark:from-sky-900 dark:via-rose-900 dark:to-amber-950",
  "oil-painting": "from-amber-400 via-red-700 to-stone-900",
  minimal: "from-zinc-100 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950",
  luxury: "from-yellow-100 via-amber-300 to-yellow-700",
  nature: "from-lime-300 via-emerald-500 to-green-900",
  noir: "from-zinc-600 via-zinc-800 to-black",
  "retro-future": "from-pink-400 via-orange-500 to-violet-700",
  "epic-adventure": "from-orange-400 via-red-600 to-amber-900",
  "soft-portrait": "from-rose-100 via-orange-100 to-amber-200 dark:from-rose-950 dark:via-orange-950 dark:to-amber-950",
  "graphic-editorial": "from-red-500 via-zinc-800 to-black",
};
