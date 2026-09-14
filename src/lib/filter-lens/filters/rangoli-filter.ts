/**
 * rangoli-filter.ts
 * Motio2edit exclusive "Rangoli" premium AI filter (img2img).
 *
 * Style note: visual style itself is not copyrightable; this proprietary
 * prompt + pipeline + branding belongs to Motio2edit.
 */

export const RANGOLI_FILTER = {
  filter_id: "rangoli_01",
  display_name: "Rangoli",
  tier: "premium" as const,
  model: "flux-img2img",
  prompt: `Transform this photo into a hyper-vibrant, jewel-toned color explosion version of itself, inspired by the colors and energy of Indian Rangoli art and Holi festival color powder.

Preserve exactly: the composition, camera angle, architecture, structures, people, objects, and framing of the original photo. Do not add, remove, or move any real subject in the scene.

Color & light transformation:
- Recolor every surface — buildings, stone facades, domes, street, wet pavement reflections — into rich, saturated jewel tones: magenta, teal, gold, violet, emerald, crimson, cobalt
- Sky transformed into a dramatic multi-color sunset/aurora blend — pink, orange, purple, blue swirling clouds
- Wet ground/reflective surfaces intensify the color bounce, mirroring the vivid sky and building colors back up from the pavement
- Add floating light-particle and confetti-like specks drifting through the air throughout the frame, warm golden light glow around street lamps
- Foliage/trees recolored into vivid rainbow-toned leaves rather than natural green
- Overall lighting: warm golden-hour glow blended with jewel-tone ambient color, high contrast, glossy/painterly finish
- Maintain photographic detail and sharpness in architecture — the transformation is a color/light grade over the real structure, not a full repaint or cartoon style`,
  negative_prompt: `monochrome, black and white, desaturated, added animals, added people, changed architecture, changed composition, blurry structure, watermark, text, logo, signature, distorted buildings, warped perspective`,
  strength: 0.35,
  guidance_scale: 7.5,
  controlnet_type: "canny" as const,
  controlnet_weight: 0.85,
  two_pass: true,
  face_preserve: true,
  credit_cost: 15, // premium rate — adjust to product pricing
  watermark_locked: true,
  max_output_px: 2048,
} as const;

export type RangoliFilterConfig = typeof RANGOLI_FILTER;
