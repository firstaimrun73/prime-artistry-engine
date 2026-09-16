/** Client-safe list of processingProfile.style values that use AI on final Apply. */
export const AI_PLUS_STYLE_KEYS = [
  "sketch",
  "oil",
  "watercolor",
  "cartoon",
  "comic",
  "anime",
  "ghibli",
  "cyberpunk",
  "neon",
  "retro3d",
] as const;

export type AiPlusStyleKey = (typeof AI_PLUS_STYLE_KEYS)[number];

export function isAiPlusStyle(style: string | undefined): style is AiPlusStyleKey {
  return !!style && (AI_PLUS_STYLE_KEYS as readonly string[]).includes(style);
}
