/**
 * Video style registry — one authority for recipes.
 * Frontend should only consume id, name, thumbnailUrl, selection.
 * Backend applies recipe via applyVideoStyleFromRegistry.
 */

export type VideoStyleDef = {
  id: string;
  name: string;
  /** 16:9 thumbnail path or CSS gradient key for UI */
  thumbnail: string;
  /** Backend-only prompt recipe — never shown in UI */
  recipe: string;
  modes: Array<"text" | "image" | "video">;
};

export const VIDEO_STYLES: VideoStyleDef[] = [
  {
    id: "none",
    name: "None",
    thumbnail: "neutral",
    recipe: "",
    modes: ["text", "image", "video"],
  },
  {
    id: "classic",
    name: "Classic",
    thumbnail: "classic",
    recipe: "classic film look, natural color grading",
    modes: ["text", "image", "video"],
  },
  {
    id: "retro",
    name: "Retro",
    thumbnail: "retro",
    recipe: "retro 1980s aesthetic, soft grain, warm tones",
    modes: ["text", "image", "video"],
  },
  {
    id: "vintage",
    name: "Vintage",
    thumbnail: "vintage",
    recipe: "vintage film stock, faded colors, subtle scratches",
    modes: ["text", "image", "video"],
  },
  {
    id: "cinematic",
    name: "Cinematic",
    thumbnail: "cinematic",
    recipe: "cinematic lighting, anamorphic lens, shallow depth of field",
    modes: ["text", "image", "video"],
  },
  {
    id: "documentary",
    name: "Documentary",
    thumbnail: "documentary",
    recipe: "documentary style, handheld feel, natural light",
    modes: ["text", "image", "video"],
  },
  {
    id: "anime",
    name: "Anime",
    thumbnail: "anime",
    recipe: "anime style, clean lines, vibrant colors",
    modes: ["text", "image", "video"],
  },
  {
    id: "product",
    name: "Product",
    thumbnail: "product",
    recipe: "product commercial, clean studio lighting, sharp detail",
    modes: ["text", "image", "video"],
  },
  {
    id: "social",
    name: "Social",
    thumbnail: "social",
    recipe: "vertical social media style, bold colors, energetic",
    modes: ["text", "image", "video"],
  },
];

/** UI-safe list (no recipes). */
export function videoStylesForUi(mode: "text" | "image" | "video") {
  return VIDEO_STYLES.filter((s) => s.modes.includes(mode)).map(({ id, name, thumbnail }) => ({
    id,
    name,
    thumbnail,
  }));
}

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
