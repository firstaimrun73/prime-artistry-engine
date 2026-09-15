/**
 * premium-filters-registry.ts
 * Motio2edit — Premium filters (backend recipes + adjustments).
 * Does NOT touch the locked 100 programmatic catalog or any UI.
 */
import type { PremiumFilterDefinition } from './premium-filter-types';

const PREMIUM_BASE = {
  tier: 'premium' as const,
  face_preserve: true,
  watermark_locked: true,
  max_output_px: 2048,
  credit_cost: 15,
  intensityRange: { min: 0, max: 100, default: 85 },
};

// ─── P0 FLAGSHIPS ───────────────────────────────────────────────────────────

/** Original painterly fantasy-photo look — not a copy of any studio/film IP. */
export const PREMIUM_01_GHIBLI_ART: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_01_ghibli_art',
  display_name: 'Ghibli Art',
  category: 'flagship',
  priority: 'P0',
  description:
    'Warm hand-painted fantasy atmosphere with soft environmental texture, natural greens, sunlight, and storybook depth while preserving photographic structure.',
  visualDescription:
    'Painterly soft fields, warm sunlight, lush greens, gentle sky, atmospheric depth, preserved faces and geometry.',
  intensityBehavior: 'progressive-structural',
  model: 'programmatic',
  styleKey: 'oil',
  adjustments: [
    { key: 'paintSoftness', label: 'Paint Softness', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'sunWarmth', label: 'Sun Warmth', min: 0, max: 40, default: 22, intensityMap: 'linear' },
    { key: 'greenLift', label: 'Green Lift', min: 0, max: 20, default: 12, intensityMap: 'linear' },
    { key: 'atmosphere', label: 'Atmosphere', min: 0, max: 30, default: 14, intensityMap: 'linear' },
    { key: 'bloomSoft', label: 'Soft Bloom', min: 0, max: 40, default: 20, intensityMap: 'linear' },
  ],
  recipeNotes:
    'Oil soft base → warm temperature → vibrance/green bias → soft bloom → atmosphere haze → face-preserving structure.',
};

// Legacy ids retained as aliases so old unlocks/history do not hard-crash if referenced.
export const PREMIUM_01_ANIME = PREMIUM_01_GHIBLI_ART;

export const PREMIUM_04_RANGOLI: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_04_rangoli',
  display_name: 'Rangoli',
  category: 'flagship',
  priority: 'P0',
  description: 'Jewel-tone decorative color-art transformation inspired by Rangoli/Holi energy — rich saturated families, ornamental edge glow, floating particles.',
  visualDescription: 'Magenta/teal/gold/violet jewel recolor, edge glow, sky particles, reflective bounce.',
  intensityBehavior: 'progressive-structural',
  model: 'hybrid',
  styleKey: 'none',
  prompt: `Transform this photo into a hyper-vibrant, jewel-toned color explosion version of itself, inspired by the colors and energy of Indian Rangoli art and Holi festival color powder.
Preserve exactly: the composition, camera angle, architecture, structures, people, objects, and framing of the original photo. Do not add, remove, or move any real subject in the scene.`,
  negative_prompt: `monochrome, black and white, desaturated, changed composition, watermark, text`,
  strength: 0.35,
  guidance_scale: 7.5,
  controlnet_type: 'canny',
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'paletteFamily', label: 'Palette Strength', min: 0, max: 1, default: 0.75, intensityMap: 'linear' },
    { key: 'edgeGlowWidth', label: 'Edge Glow', min: 1, max: 4, default: 2, intensityMap: 'threshold', threshold: 30 },
    { key: 'particleDensity', label: 'Particles', min: 0, max: 1, default: 0.3, intensityMap: 'threshold', threshold: 40 },
  ],
  recipeNotes: 'Jewel palette map → edge glow → particles → bloom.',
};

export const PREMIUM_05_WILDFIRE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_05_wildfire',
  display_name: 'Wildfire',
  category: 'high-impact',
  priority: 'P1',
  description: 'Scene lit as if by a massive nearby fire — amber highlights, charcoal-red shadows, ember atmosphere.',
  visualDescription: 'Deep orange underlighting, heat haze, warm dramatic contrast.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'warmShiftHighlight', label: 'Highlight Warmth', min: 0, max: 40, default: 28, intensityMap: 'linear' },
    { key: 'warmShiftShadow', label: 'Shadow Warmth', min: 0, max: 15, default: 8, intensityMap: 'linear' },
  ],
};

export const PREMIUM_06_GLACIER: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_06_glacier',
  display_name: 'Glacier',
  category: 'high-impact',
  priority: 'P1',
  description: 'Icy crystalline atmosphere — cool cyan/blue palette, crisp highlight bloom.',
  visualDescription: 'Cold blues/whites, crystalline highlights, cool mist.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'coolShiftShadow', label: 'Shadow Cool', min: 0, max: 40, default: 28, intensityMap: 'linear' },
    { key: 'coolShiftHighlight', label: 'Highlight Cool', min: 0, max: 20, default: 12, intensityMap: 'linear' },
  ],
};

export const PREMIUM_07_NEONPULSE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_07_neonpulse',
  display_name: 'Neon Pulse',
  category: 'high-impact',
  priority: 'P1',
  description: 'Cyberpunk night-glow — selective neon edge illumination, deep purple-blue shadows.',
  visualDescription: 'Magenta/cyan rim light, deep purple shadows.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  styleKey: 'neon',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'neonColorPair', label: 'Neon Strength', min: 0, max: 1, default: 0.7, intensityMap: 'linear' },
    { key: 'edgeGlowIntensity', label: 'Edge Glow', min: 0, max: 1, default: 0.65, intensityMap: 'linear' },
  ],
};

export const PREMIUM_08_GOLDDUST: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_08_golddust',
  display_name: 'Gold Dust',
  category: 'high-impact',
  priority: 'P1',
  description: 'Luxury editorial gold-metallic finish — warm gold highlights, bronze shadows, soft bloom.',
  visualDescription: 'Gold-foil sheen, soft luxury glow.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'goldHueTarget', label: 'Gold Hue', min: 30, max: 55, default: 42, intensityMap: 'linear' },
    { key: 'bloomSoftness', label: 'Bloom Softness', min: 15, max: 40, default: 25, intensityMap: 'linear' },
  ],
};

export const PREMIUM_09_STORMBREAK: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_09_stormbreak',
  display_name: 'Storm Break',
  category: 'high-impact',
  priority: 'P1',
  description: 'Dramatic storm atmosphere — heavy contrast, cool-warm separation.',
  visualDescription: 'Dark storm grade, warm light break, deep contrast.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'contrastDepth', label: 'Contrast Depth', min: 0, max: 30, default: 18, intensityMap: 'linear' },
    { key: 'skyCoolShift', label: 'Sky Cool Shift', min: 0, max: 30, default: 18, intensityMap: 'linear' },
  ],
};

export const PREMIUM_10_BLOOM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_10_bloom',
  display_name: 'Bloom',
  category: 'high-impact',
  priority: 'P1',
  description: 'Ethereal dreamcore luminance bloom — soft glow on highlights, dreamy haze.',
  visualDescription: 'Soft pastel wash, isolated highlight bloom.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'bloomOpacity', label: 'Bloom Opacity', min: 0.2, max: 0.6, default: 0.4, intensityMap: 'linear' },
    { key: 'pastelStrength', label: 'Pastel Wash', min: 0, max: 0.4, default: 0.25, intensityMap: 'threshold', threshold: 30 },
  ],
};

export const PREMIUM_11_MOLTEN: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_11_molten',
  display_name: 'Molten',
  category: 'high-impact',
  priority: 'P1',
  description: 'Molten volcanic material look — glowing-orange heat, deep charcoal shadows.',
  visualDescription: 'Hot orange grade, deep charcoal shadows.',
  intensityBehavior: 'progressive-structural',
  model: 'hybrid',
  strength: 0.4,
  controlnet_weight: 0.8,
  two_pass: true,
  adjustments: [
    { key: 'crackGlowIntensity', label: 'Heat Glow', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
  ],
};

export const PREMIUM_12_CHROMEFUTURE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_12_chromefuture',
  display_name: 'Chrome',
  category: 'high-impact',
  priority: 'P1',
  description: 'Premium metallic editorial treatment — cool reflective highlights, controlled contrast.',
  visualDescription: 'Silver/chrome tonal response, sharp elegant finish.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [
    { key: 'metalContrast', label: 'Metal Contrast', min: 0, max: 30, default: 20, intensityMap: 'linear' },
  ],
};

export const PREMIUM_13_VELVETNOIR: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_13_velvetnoir',
  display_name: 'Velvet',
  category: 'high-impact',
  priority: 'P1',
  description: 'Luxury fashion/editorial monochrome — rich blacks, soft highlight rolloff.',
  visualDescription: 'Deep blacks, smooth skin, high-end studio finish.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [
    { key: 'noirDepth', label: 'Noir Depth', min: 0, max: 40, default: 28, intensityMap: 'linear' },
  ],
};

export const PREMIUM_14_OILCANVAS: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_14_oilcanvas',
  display_name: 'Oil Canvas',
  category: 'high-impact',
  priority: 'P1',
  description: 'Classic oil-painting surface — soft brush fields, rich color.',
  visualDescription: 'Painterly soft edges, saturated canvas look.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'oil',
  adjustments: [],
};

export const PREMIUM_15_WATERCOLORBLOOM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_15_watercolorbloom',
  display_name: 'Watercolor',
  category: 'high-impact',
  priority: 'P1',
  description: 'Soft watercolor wash with gentle bloom and fade.',
  visualDescription: 'Washes, soft edges, airy color.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'watercolor',
  adjustments: [],
};

export const PREMIUM_16_DUOTONEPULSE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_16_duotonepulse',
  display_name: 'Duotone',
  category: 'high-impact',
  priority: 'P1',
  description: 'Bold two-tone editorial grade with controlled posterization.',
  visualDescription: 'Shadow/highlight dual palette, graphic but photographic.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [],
};

export const PREMIUM_17_INFRAREDDREAM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_17_infrareddream',
  display_name: 'Infrared',
  category: 'high-impact',
  priority: 'P1',
  description: 'Dreamlike false-color infrared atmosphere.',
  visualDescription: 'Cool-warm inversion feel, ethereal foliage.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [],
};

export const PREMIUM_18_MIRAGE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_18_mirage',
  display_name: 'Mirage',
  category: 'high-impact',
  priority: 'P1',
  description: 'Heat-haze desert atmosphere with soft distance glow.',
  visualDescription: 'Warm haze, soft distance, sun-baked midtones.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [],
};

export const PREMIUM_19_AURORAVEIL: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_19_auroraveil',
  display_name: 'Aurora',
  category: 'high-impact',
  priority: 'P1',
  description: 'Elegant aurora-inspired atmospheric lighting — cyan/green/violet interaction.',
  visualDescription: 'Soft environmental glow, cool luminous sky.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [],
};

export const PREMIUM_20_COPPERPATINA: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_20_copperpatina',
  display_name: 'Copper',
  category: 'high-impact',
  priority: 'P1',
  description: 'Aged copper metal grade — warm metal midtones, soft patina.',
  visualDescription: 'Copper warmth, muted saturation, editorial metal feel.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [],
};

export const PREMIUM_21_GALAXYDRIFT: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_21_galaxydrift',
  display_name: 'Galaxy',
  category: 'high-impact',
  priority: 'P1',
  description: 'Deep-space color drift with soft cosmic bloom.',
  visualDescription: 'Cool space tones, luminous bloom.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [],
};

export const PREMIUM_22_VINTAGE8MM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_22_vintage8mm',
  display_name: 'Vintage Film',
  category: 'high-impact',
  priority: 'P1',
  description: 'Authentic analog-film character — natural grain, faded colors, soft vignette.',
  visualDescription: 'Film grain, warm fade, organic texture.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [],
};

export const PREMIUM_23_PORCELAINART: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_23_porcelainart',
  display_name: 'Porcelain',
  category: 'high-impact',
  priority: 'P1',
  description: 'Soft porcelain skin/editorial finish with gentle diffusion.',
  visualDescription: 'Smooth soft light, refined highlights.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [],
};

export const PREMIUM_24_ORIGAMIFOLD: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_24_origamifold',
  display_name: 'Origami',
  category: 'high-impact',
  priority: 'P1',
  description: 'Paper-fold graphic simplification with controlled posterization.',
  visualDescription: 'Flat paper planes, crisp graphic shapes.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'none',
  adjustments: [],
};

export const PREMIUM_25_BIOLUMINESCENCE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_25_bioluminescence',
  display_name: 'Biolume',
  category: 'high-impact',
  priority: 'P1',
  description: 'Cool bioluminescent night glow — cyan/teal luminous atmosphere.',
  visualDescription: 'Deep cool shadows, glowing cyan highlights.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [],
};

/** Active Premium catalog — Anime/Comic/Sketch removed; Ghibli Art is the flagship painterly look. */
export const ALL_PREMIUM_FILTERS: readonly PremiumFilterDefinition[] = [
  PREMIUM_01_GHIBLI_ART,
  PREMIUM_04_RANGOLI,
  PREMIUM_05_WILDFIRE,
  PREMIUM_06_GLACIER,
  PREMIUM_07_NEONPULSE,
  PREMIUM_08_GOLDDUST,
  PREMIUM_09_STORMBREAK,
  PREMIUM_10_BLOOM,
  PREMIUM_11_MOLTEN,
  PREMIUM_12_CHROMEFUTURE,
  PREMIUM_13_VELVETNOIR,
  PREMIUM_14_OILCANVAS,
  PREMIUM_15_WATERCOLORBLOOM,
  PREMIUM_16_DUOTONEPULSE,
  PREMIUM_17_INFRAREDDREAM,
  PREMIUM_18_MIRAGE,
  PREMIUM_19_AURORAVEIL,
  PREMIUM_20_COPPERPATINA,
  PREMIUM_21_GALAXYDRIFT,
  PREMIUM_22_VINTAGE8MM,
  PREMIUM_23_PORCELAINART,
  PREMIUM_24_ORIGAMIFOLD,
  PREMIUM_25_BIOLUMINESCENCE,
] as const;

export function getPremiumFilterById(id: string): PremiumFilterDefinition | undefined {
  if (id === 'premium_01_anime' || id === 'premium_02_comic' || id === 'premium_03_sketch') {
    return PREMIUM_01_GHIBLI_ART;
  }
  return ALL_PREMIUM_FILTERS.find((f) => f.filter_id === id);
}

export function listPremiumFiltersByPriority(priority: string): PremiumFilterDefinition[] {
  return ALL_PREMIUM_FILTERS.filter((f) => f.priority === priority);
}

export function listPremiumFiltersByCategory(category: string): PremiumFilterDefinition[] {
  return ALL_PREMIUM_FILTERS.filter((f) => f.category === category);
}

export function getPremiumAdjustments(id: string): PremiumFilterDefinition['adjustments'] {
  return getPremiumFilterById(id)?.adjustments ?? [];
}
