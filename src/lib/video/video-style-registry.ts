/**
 * Video style recipes — server only (Phase 1).
 * Never send recipes or provider names to the client UI.
 * Client only sends styleId; server applies exactly once via assembleStyledPrompt.
 */

export const RECIPE_VERSION = 1;

export type VideoStyleMode = "text" | "image" | "video";

export type VideoStyleRecipe = {
  id: string;
  name: string;
  look: string;
  motion: string;
  avoid: string;
};

/** Appended to every style negative list. */
export const COMMON_AVOID =
  "text, captions, subtitles, logos, watermarks, signatures, UI overlays, distorted faces, extra limbs, flicker, morphing";

export const VIDEO_STYLE_RECIPES: VideoStyleRecipe[] = [
  {
    id: "none",
    name: "None",
    look: "",
    motion: "",
    avoid: "",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    look: "Cinematic film look, rain-slicked city street at blue hour, warm sodium streetlamp glow against cold teal shadows, teal-and-orange color grade, anamorphic lens flare streaks, shallow depth of field with creamy bokeh, soft atmospheric haze, wet reflections, subtle 35mm film grain",
    motion: "Slow steady dolly-in or gentle tracking shot",
    avoid: "flat lighting, oversaturation, cartoon look",
  },
  {
    id: "dreamy",
    name: "Dreamy",
    look: "Dreamy soft-focus atmosphere, lavender and pink pastel sky, gentle bloom and glow, golden-green foreground bokeh, tiny pink wildflowers, floating translucent bubbles and light orbs, airy haze, low contrast, ethereal and serene",
    motion: "Slow floating drift, orbs gently rising",
    avoid: "harsh shadows, gritty texture, dark tones",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    look: "Vibrant high-saturation look, sunlit tropical scene, bold primary colors (blue, red, yellow), rich fruit and fabric colors, hard midday sun, deep blue sky, crisp detail, punchy contrast, lively and joyful",
    motion: "Lively natural movement, smooth gimbal walk-through",
    avoid: "muted colors, desaturated, fog",
  },
  {
    id: "vintage-film",
    name: "Vintage Film",
    look: "Vintage 1970s film photograph look, faded warm cream and olive-teal tones, lifted blacks, low contrast, soft focus, visible grain, dust and light leaks, dark vignette with softly rounded film-frame corners, road-trip nostalgia",
    motion: "Slight gate weave, gentle drifting camera",
    avoid: "sharp digital look, modern HDR, neon colors",
  },
  {
    id: "documentary",
    name: "Documentary",
    look: "Documentary realism, dawn or dusk natural light, muted peach-grey sky, slightly desaturated real-world colors, candid observational framing, handheld feel, authentic working-life detail, no stylization",
    motion: "Subtle handheld sway, patient slow push-in",
    avoid: "cinematic grading, glossy polish, staged poses",
  },
  {
    id: "minimal",
    name: "Minimal",
    look: "Minimalist look, vast pale beige dunes, overcast off-white sky, a single tiny dark figure, huge negative space, near-monochrome muted palette, soft diffuse light, calm and quiet composition",
    motion: "Very slow, minimal movement, slight camera drift",
    avoid: "clutter, busy detail, saturated colors",
  },
  {
    id: "nature",
    name: "Nature",
    look: "Lush nature look, misty rainforest, golden sun rays streaming through the canopy, waterfall, wet ferns and moss with dew, deep rich greens, soft haze, ultra-detailed natural realism",
    motion: "Light shafts shifting, mist drifting, water flowing, slow forward glide",
    avoid: "buildings, man-made objects, oversaturation",
  },
  {
    id: "futuristic",
    name: "Futuristic",
    look: "Clean futuristic high-key look, pearl-white curved architecture, thin glowing cyan light lines, glossy smooth surfaces, soft fog, bright minimal aesthetic, sleek transit pod floating, calm and pristine",
    motion: "Smooth silent glide, slow camera push",
    avoid: "dirt, grime, dark gritty mood, clutter",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    look: "Cyberpunk night look, narrow rainy alley, dense magenta and cyan neon (unreadable signage), glossy wet asphalt with colorful reflections, lone silhouette with an umbrella, teal-black shadows, heavy rain streaks, moody",
    motion: "Slow tracking behind the subject, rain falling, neon flicker",
    avoid: "daylight, pastel palette, flat lighting",
  },
  {
    id: "retro-future",
    name: "Retro Future",
    look: "1980s retro-futurism, synthwave sunset, purple-pink-orange gradient sky with stars, low glowing sun on the horizon, palm tree silhouettes, glowing neon grid over a reflective floor, film grain and soft glow",
    motion: "Forward glide along the grid, gentle glow shimmer",
    avoid: "realistic daylight, muted colors",
  },
  {
    id: "noir",
    name: "Noir",
    look: "Film noir look, black and white, heavy rain streaks, hard overhead streetlamp light, deep black shadows, high contrast, fedora and trench coat, grainy 1940s film texture",
    motion: "Slow push-in, rain falling, subtle lamp flicker",
    avoid: "color, bright lighting, modern setting",
  },
  {
    id: "oil-painting",
    name: "Oil Painting",
    look: "Classical oil painting look, thick impasto brush strokes, visible paint texture, stormy teal-green sea with white foam crests, cream and grey swirling clouds, muted classical palette, small wooden boat",
    motion: "Waves rolling, clouds swirling in painterly strokes, keep brush texture stable across frames",
    avoid: "photorealism, smooth digital gradients, neon",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    look: "Watercolor painting look, visible cotton paper texture, wet-on-wet washes with soft bleeding edges, muted blue-teal water, terracotta roofs, unpainted white paper margins, loose brushwork, soft vignette",
    motion: "Washes slowly shifting, gentle flowing water, paper texture stays fixed",
    avoid: "photorealism, sharp digital edges, heavy black outlines",
  },
  {
    id: "soft-portrait",
    name: "Soft Portrait",
    look: "Soft natural-light portrait look, window light, creamy shallow depth of field, pastel skin tones, gentle backlight glow, calm intimate mood, subtle lens softness",
    motion: "Very slight breathing and hair movement, slow gentle push-in",
    avoid: "harsh shadows, oversaturation, heavy retouching",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    look: "High fantasy painterly look, castle with glowing warm windows on floating islands, cascading waterfalls, drifting lavender-purple mist, glowing gems in purple, orange and blue, magical dusk sky, distant dragon silhouette, rich jewel colors, game concept-art style",
    motion: "Slow sweeping aerial move, mist drifting, gems glowing, dragon gliding far away",
    avoid: "photorealism, modern objects, flat lighting",
  },
  {
    id: "dark-fantasy",
    name: "Dark Fantasy",
    look: "Dark fantasy look, ruined gothic cathedral in cold grey fog, armored knight with a tattered cloak holding a burning torch, ravens, desaturated cold palette with ember-orange torchlight as the only warm light, rubble and drifting embers, low-angle heroic framing, ominous",
    motion: "Slow low-angle push-in, fog rolling, embers rising, ravens taking flight",
    avoid: "bright colors, cheerful mood, modern elements",
  },
  {
    id: "anime-inspired",
    name: "Anime-Inspired",
    look: "Anime-inspired hand-painted look, flat cel shading, clean thin outlines, saturated blue sky with big puffy outlined white clouds, lush green hills, an original young character in a pastel dress, bright cheerful colors, simple painterly backgrounds",
    motion: "Gentle hair and grass sway, clouds drifting, subtle pan",
    avoid: "photorealism, 3D render look, existing franchise characters",
  },
  {
    id: "luxury",
    name: "Luxury",
    look: "Luxury premium look, black marble with white veining, thin polished gold trim lines, symmetrical composition, single soft spotlight from above, champagne flute with rising bubbles and a pearl necklace, glossy mirror-like floor reflections, elegant and refined",
    motion: "Slow gliding dolly, bubbles rising, light glinting on gold",
    avoid: "clutter, cheap materials, harsh flat lighting",
  },
  {
    id: "epic-adventure",
    name: "Epic Adventure",
    look: "Epic adventure look, explorers with backpacks on a rocky ridge above a sea of clouds, orange sun setting on the horizon, dramatic blue and orange sky, sweeping heroic scale, golden rim light, cinematic grandeur",
    motion: "Slow orbiting or pushing camera around the group, clouds drifting, wind in clothing",
    avoid: "flat lighting, cramped framing, modern city",
  },
  {
    id: "graphic-editorial",
    name: "Graphic Editorial",
    look: "Graphic editorial poster look, flat bold red and cream color blocks, oversized abstract silhouette figure filled with black and red halftone dots, angular geometric shard shapes, high contrast, print-like texture, magazine-cover composition",
    motion: "Slow drifting and warping of shapes, halftone dots shifting slightly, subtle parallax",
    avoid: "photorealism, soft gradients, lettering",
  },
];

export function getStyleRecipe(styleId: string | null | undefined): VideoStyleRecipe | null {
  if (!styleId || styleId === "none") return null;
  return VIDEO_STYLE_RECIPES.find((s) => s.id === styleId) ?? null;
}

/**
 * Assemble styled prompt once on the server.
 * Truncates the recipe if needed; never truncates the user prompt.
 */
export function assembleStyledPrompt(
  userPrompt: string,
  styleId: string | null | undefined,
  mode: VideoStyleMode,
  maxLen = 2800,
): { prompt: string; negativePrompt: string | null } {
  const p = userPrompt.trim();
  const recipe = getStyleRecipe(styleId);
  if (!recipe || !recipe.look) {
    return { prompt: p, negativePrompt: null };
  }

  let styled: string;
  if (mode === "image") {
    styled = `${p}. Keep the subject and composition of the source image. Apply this visual style: ${recipe.look}. Motion: ${recipe.motion}.`;
  } else if (mode === "video") {
    styled = `${p}. Preserve the original motion and structure. Restyle with: ${recipe.look}.`;
  } else {
    styled = `${p}. ${recipe.look}. Motion: ${recipe.motion}.`;
  }

  if (styled.length > maxLen) {
    const budget = Math.max(0, maxLen - p.length - 32);
    const look = recipe.look.slice(0, Math.max(0, budget));
    if (mode === "image") {
      styled = `${p}. Keep the subject and composition of the source image. Apply this visual style: ${look}.`;
    } else if (mode === "video") {
      styled = `${p}. Preserve the original motion and structure. Restyle with: ${look}.`;
    } else {
      styled = `${p}. ${look}.`;
    }
  }

  const negParts = [COMMON_AVOID, recipe.avoid].filter(Boolean);
  const negativePrompt = negParts.length ? negParts.join(", ") : null;
  return { prompt: styled, negativePrompt };
}

/** Legacy shape for older callers — prefer assembleStyledPrompt. */
export type VideoStyleDef = {
  id: string;
  name: string;
  thumbnail: string;
  recipe: string;
  modes: Array<VideoStyleMode>;
};

const ALL_MODES: Array<VideoStyleMode> = ["text", "image", "video"];

export const VIDEO_STYLES: VideoStyleDef[] = VIDEO_STYLE_RECIPES.map((r) => ({
  id: r.id,
  name: r.name,
  thumbnail: r.id,
  recipe: r.look ? `${r.look}. Motion: ${r.motion}` : "",
  modes: ALL_MODES,
}));

export function videoStylesForUi(mode: VideoStyleMode) {
  return VIDEO_STYLES.filter((s) => s.modes.includes(mode)).map(({ id, name, thumbnail }) => ({
    id,
    name,
    thumbnail,
  }));
}

/**
 * @deprecated Prefer assembleStyledPrompt(mode). Simple append for legacy callers.
 * Client UI must NOT call this to mutate the visible prompt.
 */
export function applyVideoStyleFromRegistry(
  prompt: string,
  styleId: string | null | undefined,
): string {
  const { prompt: styled } = assembleStyledPrompt(prompt, styleId, "text");
  return styled;
}
