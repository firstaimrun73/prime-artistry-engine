/**
 * Video Studio — UI style registry only.
 * id / displayName / thumbnail / locked. No recipes, no provider names.
 * Selecting a style sets styleId only; never rewrites the user prompt.
 */

export type VideoStyleUi = {
  id: string;
  displayName: string;
  /** Path under public, e.g. /styles/video/cinematic.webp */
  thumbnail: string | null;
  locked: boolean;
};

export const VIDEO_STYLE_UI: VideoStyleUi[] = [
  { id: "none", displayName: "None", thumbnail: null, locked: false },
  { id: "cinematic", displayName: "Cinematic", thumbnail: "/styles/video/cinematic.webp", locked: false },
  { id: "dreamy", displayName: "Dreamy", thumbnail: "/styles/video/dreamy.webp", locked: false },
  { id: "vibrant", displayName: "Vibrant", thumbnail: "/styles/video/vibrant.webp", locked: false },
  { id: "vintage-film", displayName: "Vintage Film", thumbnail: "/styles/video/vintage-film.webp", locked: false },
  { id: "futuristic", displayName: "Futuristic", thumbnail: "/styles/video/futuristic.webp", locked: false },
  { id: "cyberpunk", displayName: "Cyberpunk", thumbnail: "/styles/video/cyberpunk.webp", locked: false },
  { id: "documentary", displayName: "Documentary", thumbnail: "/styles/video/documentary.webp", locked: false },
  { id: "fantasy", displayName: "Fantasy", thumbnail: "/styles/video/fantasy.webp", locked: false },
  { id: "dark-fantasy", displayName: "Dark Fantasy", thumbnail: "/styles/video/dark-fantasy.webp", locked: false },
  { id: "anime-inspired", displayName: "Anime-Inspired", thumbnail: "/styles/video/anime-inspired.webp", locked: false },
  { id: "watercolor", displayName: "Watercolor", thumbnail: "/styles/video/watercolor.webp", locked: false },
  { id: "oil-painting", displayName: "Oil Painting", thumbnail: "/styles/video/oil-painting.webp", locked: false },
  { id: "minimal", displayName: "Minimal", thumbnail: "/styles/video/minimal.webp", locked: false },
  { id: "luxury", displayName: "Luxury", thumbnail: "/styles/video/luxury.webp", locked: false },
  { id: "nature", displayName: "Nature", thumbnail: "/styles/video/nature.webp", locked: false },
  { id: "noir", displayName: "Noir", thumbnail: "/styles/video/noir.webp", locked: false },
  { id: "retro-future", displayName: "Retro Future", thumbnail: "/styles/video/retro-future.webp", locked: false },
  { id: "epic-adventure", displayName: "Epic Adventure", thumbnail: "/styles/video/epic-adventure.webp", locked: false },
  { id: "soft-portrait", displayName: "Soft Portrait", thumbnail: "/styles/video/soft-portrait.webp", locked: false },
  { id: "graphic-editorial", displayName: "Graphic Editorial", thumbnail: "/styles/video/graphic-editorial.webp", locked: false },
];

/** Neutral gradient fallbacks when /public/styles/video/<id>.webp is missing */
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
