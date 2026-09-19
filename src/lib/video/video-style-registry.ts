/**
 * Video style registry — backend recipes keyed by UI style id.
 * Frontend must only set styleId; never rewrite the user prompt with these recipes.
 * Server may apply recipe when videoStyleId is present.
 */

export type VideoStyleDef = {
  id: string;
  name: string;
  thumbnail: string;
  recipe: string;
  modes: Array<"text" | "image" | "video">;
};

const ALL_MODES: Array<"text" | "image" | "video"> = ["text", "image", "video"];

export const VIDEO_STYLES: VideoStyleDef[] = [
  { id: "none", name: "None", thumbnail: "none", recipe: "", modes: ALL_MODES },
  {
    id: "cinematic",
    name: "Cinematic",
    thumbnail: "cinematic",
    recipe: "cinematic lighting, anamorphic lens, shallow depth of field",
    modes: ALL_MODES,
  },
  {
    id: "dreamy",
    name: "Dreamy",
    thumbnail: "dreamy",
    recipe: "dreamy soft focus, ethereal glow, pastel atmosphere",
    modes: ALL_MODES,
  },
  {
    id: "vibrant",
    name: "Vibrant",
    thumbnail: "vibrant",
    recipe: "vibrant saturated colors, high energy, bold contrast",
    modes: ALL_MODES,
  },
  {
    id: "vintage-film",
    name: "Vintage Film",
    thumbnail: "vintage-film",
    recipe: "vintage film stock, faded colors, subtle grain and scratches",
    modes: ALL_MODES,
  },
  {
    id: "futuristic",
    name: "Futuristic",
    thumbnail: "futuristic",
    recipe: "futuristic sci-fi look, clean tech lighting, sleek surfaces",
    modes: ALL_MODES,
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    thumbnail: "cyberpunk",
    recipe: "cyberpunk neon, rain-soaked streets, high contrast magenta cyan",
    modes: ALL_MODES,
  },
  {
    id: "documentary",
    name: "Documentary",
    thumbnail: "documentary",
    recipe: "documentary style, handheld feel, natural light",
    modes: ALL_MODES,
  },
  {
    id: "fantasy",
    name: "Fantasy",
    thumbnail: "fantasy",
    recipe: "fantasy world, magical atmosphere, rich saturated hues",
    modes: ALL_MODES,
  },
  {
    id: "dark-fantasy",
    name: "Dark Fantasy",
    thumbnail: "dark-fantasy",
    recipe: "dark fantasy, moody shadows, dramatic rim light",
    modes: ALL_MODES,
  },
  {
    id: "anime-inspired",
    name: "Anime-Inspired",
    thumbnail: "anime-inspired",
    recipe: "anime-inspired look, clean lines, expressive lighting",
    modes: ALL_MODES,
  },
  {
    id: "watercolor",
    name: "Watercolor",
    thumbnail: "watercolor",
    recipe: "watercolor painting style, soft edges, pigment blooms",
    modes: ALL_MODES,
  },
  {
    id: "oil-painting",
    name: "Oil Painting",
    thumbnail: "oil-painting",
    recipe: "oil painting style, visible brush strokes, rich texture",
    modes: ALL_MODES,
  },
  {
    id: "minimal",
    name: "Minimal",
    thumbnail: "minimal",
    recipe: "minimal clean composition, simple shapes, restrained palette",
    modes: ALL_MODES,
  },
  {
    id: "luxury",
    name: "Luxury",
    thumbnail: "luxury",
    recipe: "luxury premium look, elegant lighting, refined detail",
    modes: ALL_MODES,
  },
  {
    id: "nature",
    name: "Nature",
    thumbnail: "nature",
    recipe: "natural outdoor look, organic textures, soft daylight",
    modes: ALL_MODES,
  },
  {
    id: "noir",
    name: "Noir",
    thumbnail: "noir",
    recipe: "film noir, high contrast black and white mood, dramatic shadows",
    modes: ALL_MODES,
  },
  {
    id: "retro-future",
    name: "Retro Future",
    thumbnail: "retro-future",
    recipe: "retro-futuristic aesthetic, 80s sci-fi, neon grids",
    modes: ALL_MODES,
  },
  {
    id: "epic-adventure",
    name: "Epic Adventure",
    thumbnail: "epic-adventure",
    recipe: "epic adventure scale, sweeping vistas, heroic lighting",
    modes: ALL_MODES,
  },
  {
    id: "soft-portrait",
    name: "Soft Portrait",
    thumbnail: "soft-portrait",
    recipe: "soft portrait lighting, gentle skin tones, shallow depth of field",
    modes: ALL_MODES,
  },
  {
    id: "graphic-editorial",
    name: "Graphic Editorial",
    thumbnail: "graphic-editorial",
    recipe: "graphic editorial style, bold composition, magazine look",
    modes: ALL_MODES,
  },
];

/** UI-safe list (no recipes). Prefer src/lib/videoStyles.ts for the Video Studio UI. */
export function videoStylesForUi(mode: "text" | "image" | "video") {
  return VIDEO_STYLES.filter((s) => s.modes.includes(mode)).map(({ id, name, thumbnail }) => ({
    id,
    name,
    thumbnail,
  }));
}

/**
 * Backend helper — appends recipe when styleId is set.
 * Client UI must NOT call this to mutate the visible prompt.
 */
export function applyVideoStyleFromRegistry(
  prompt: string,
  styleId: string | null | undefined,
): string {
  if (!styleId || styleId === "none") return prompt;
  const style = VIDEO_STYLES.find((s) => s.id === styleId);
  if (!style?.recipe) return prompt;
  const p = prompt.trim();
  if (!p) return style.recipe;
  if (p.toLowerCase().includes(style.recipe.split(",")[0].toLowerCase())) return p;
  return `${p}. ${style.recipe}.`;
}
