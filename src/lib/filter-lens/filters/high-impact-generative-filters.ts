/**
 * high-impact-generative-filters.ts
 * Motio2edit Premium-tier "High Impact" generative filters (Flux img2img + ControlNet).
 *
 * These sit at the top of the Common < AI+ < Premium ladder:
 * full AI color/light/atmosphere transformation, maximum visual wow,
 * highest credit cost. Composition and subjects are strictly preserved.
 *
 * Style note: visual style itself is not copyrightable; these proprietary
 * prompts + pipeline + branding belong to Motio2edit.
 */

export type GenerativeFilterConfig = {
  filter_id: string;
  display_name: string;
  tier: "premium";
  model: "flux-img2img";
  prompt: string;
  negative_prompt: string;
  strength: number;
  guidance_scale: number;
  controlnet_type: "canny";
  controlnet_weight: number;
  two_pass: boolean;
  face_preserve: boolean;
  credit_cost: number;
  watermark_locked: boolean;
  max_output_px: number;
};

const BASE = {
  tier: "premium" as const,
  model: "flux-img2img" as const,
  guidance_scale: 7.5,
  controlnet_type: "canny" as const,
  face_preserve: true,
  watermark_locked: true,
  max_output_px: 2048,
  credit_cost: 15, // premium rate — adjust to product pricing
};

export const WILDFIRE_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "wildfire_01",
  display_name: "Wildfire",
  prompt: `Transform the lighting and color of this photo as if the entire scene is illuminated by a massive nearby fire. Preserve all subjects, structures, and composition exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Recolor highlights into deep amber/orange, shadows into charcoal black-red
- Add drifting ember particles and light smoke haze throughout the air
- Strong underlighting/uplighting on faces and building facades as if lit from a fire source below or beside frame
- Glossy heat-shimmer feel on any reflective surface
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, added flames as literal objects unless requested, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome, black and white`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
};

export const GLACIER_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "glacier_01",
  display_name: "Glacier",
  prompt: `Transform the color and light of this photo into an icy, glacial atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Recolor the entire scene into cold blues, whites, and pale cyan
- Add subtle frost/crystal texture on edges and surfaces
- Soft cold mist/fog in the air
- Sharp crystalline highlights on reflective areas
- Breath-fog effect near any figures if present
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, warm tones, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
};

export const NEON_PULSE_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "neon_pulse_01",
  display_name: "Neon Pulse",
  prompt: `Transform this photo into a neon-lit cyberpunk night atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Recolor scene into deep purple-blue shadows with magenta and cyan neon highlights
- Add glowing rim light along building edges and subject outlines
- Wet-surface reflections intensify neon colors
- Subtle lens-glow/bloom around light sources
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, daylight tones, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
};

export const GOLD_DUST_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "gold_dust_01",
  display_name: "Gold Dust",
  prompt: `Transform this photo into a luxurious gold-toned atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Apply warm metallic gold color grading across highlights, soft bronze in shadows
- Add fine shimmering gold dust particles drifting through the air
- Subtle soft-glow bloom on bright areas for an editorial/luxury magazine feel
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, cold tones, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
};

export const STORM_BREAK_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "storm_break_01",
  display_name: "Storm Break",
  prompt: `Transform the sky and lighting of this photo into a dramatic storm atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Darken and thicken clouds into a heavy storm sky, add a single dramatic shaft of light breaking through
- Increase contrast heavily — deep shadows, sharp highlights
- Add subtle rain-streak texture and wind-blown particle motion
- Cool blue-grey overall grade with warm highlight break
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, added lightning bolts as literal objects unless requested, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
};

export const BLOOM_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "bloom_01",
  display_name: "Bloom",
  prompt: `Transform this photo into a soft ethereal dreamlike atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Apply a pastel color wash (soft pink, lavender, mint) across the whole image
- Add heavy soft light bloom around all highlights
- Add fine floating light particles/bokeh throughout
- Slightly reduce contrast for a hazy, dreamy softness while keeping subject edges recognizable
- Maintain photographic detail — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, sharp harsh contrast, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
};

export const MOLTEN_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "molten_01",
  display_name: "Molten",
  prompt: `Transform the surface texture and color of this photo into a molten, volcanic look. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Shadow areas take on a cracked, glowing orange-red lava-like texture pattern
- Highlight areas shift toward obsidian black-purple with a glassy sheen
- Add faint heat-haze distortion in the air and drifting ash particles
- Maintain photographic detail and sharpness of the underlying structure — this is a texture/color grade, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, literal lava flow replacing structures, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.4,
  controlnet_weight: 0.8,
  two_pass: true,
};

export const CHROME_FUTURE_FILTER: GenerativeFilterConfig = {
  ...BASE,
  filter_id: "chrome_future_01",
  display_name: "Chrome Future",
  prompt: `Transform this photo into a futuristic chrome atmosphere. Preserve composition and subjects exactly. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Apply a cool silver-blue metallic sheen across surfaces
- Increase reflectivity/gloss on flat areas as if partially chrome-plated
- Add subtle holographic light streaks in the sky or background
- Crisp, high-clarity, sci-fi editorial finish
- Maintain photographic detail and sharpness — this is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `changed composition, warm tones, cartoon style, watermark, text, logo, signature, distorted structures, warped perspective, monochrome`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
};

/** All Premium high-impact generative filters (excluding Rangoli which lives in its own module). */
export const HIGH_IMPACT_GENERATIVE_FILTERS: readonly GenerativeFilterConfig[] = [
  WILDFIRE_FILTER,
  GLACIER_FILTER,
  NEON_PULSE_FILTER,
  GOLD_DUST_FILTER,
  STORM_BREAK_FILTER,
  BLOOM_FILTER,
  MOLTEN_FILTER,
  CHROME_FUTURE_FILTER,
] as const;
