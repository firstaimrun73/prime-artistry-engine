/**
 * premium-filters-registry.ts
 * Motio2edit — all 25 Premium filters (backend recipes + adjustments).
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

export const PREMIUM_01_ANIME: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_01_anime',
  display_name: 'Anime',
  category: 'flagship',
  priority: 'P0',
  description: 'Hand-drawn animation cel reconstruction with multi-band cel-shading, variable-weight ink, and subject-aware skin protection.',
  visualDescription: 'Cel-shaded skin, clean ink contours, stylized hair highlight, flattened background.',
  intensityBehavior: 'progressive-structural',
  model: 'programmatic',
  styleKey: 'anime',
  adjustments: [
    { key: 'celBands', label: 'Cel Bands', min: 2, max: 4, default: 3, step: 1, intensityMap: 'fixed' },
    { key: 'edgeThickness', label: 'Edge Thickness', min: 1, max: 4, default: 2, intensityMap: 'linear' },
    { key: 'skinDetailRestore', label: 'Skin Detail', min: 0, max: 1, default: 0.18, intensityMap: 'fixed' },
    { key: 'saturationLift', label: 'Saturation Lift', min: 0, max: 20, default: 12, intensityMap: 'linear' },
    { key: 'backgroundPosterizeLevels', label: 'BG Posterize', min: 3, max: 8, default: 5, intensityMap: 'threshold', threshold: 40 },
  ],
  recipeNotes: 'Subject mask → bilateral + cel on skin → directional hair → adaptive posterize BG → ink lines → face detail restore.',
  newCapabilitiesRequired: ['createSubjectMask', 'applyCelShading', 'applyInkLines', 'applyAdaptivePosterize'],
};

export const PREMIUM_02_COMIC: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_02_comic',
  display_name: 'Comic',
  category: 'flagship',
  priority: 'P0',
  description: 'Hand-inked comic panel with three-tier line hierarchy, luminance-responsive halftone in shadows only, and flat color cells.',
  visualDescription: 'Bold contour + medium detail lines + shadow halftone dots, face-protected ink weight.',
  intensityBehavior: 'threshold-activated',
  model: 'programmatic',
  styleKey: 'comic',
  adjustments: [
    { key: 'primaryWeight', label: 'Primary Line', min: 3, max: 5, default: 4, intensityMap: 'linear' },
    { key: 'secondaryWeight', label: 'Secondary Line', min: 1.5, max: 3, default: 2, intensityMap: 'linear' },
    { key: 'microWeight', label: 'Micro Detail', min: 0.5, max: 1, default: 0.7, intensityMap: 'threshold', threshold: 50 },
    { key: 'halftoneDotSize', label: 'Halftone Size', min: 2, max: 8, default: 4, intensityMap: 'threshold', threshold: 30 },
    { key: 'halftoneAngle', label: 'Halftone Angle', min: 15, max: 75, default: 45, intensityMap: 'fixed' },
    { key: 'colorCellLevels', label: 'Color Cells', min: 4, max: 6, default: 5, intensityMap: 'linear' },
  ],
  recipeNotes: 'Multi-scale edges → shadow luminance mask → luminance-responsive halftone → adaptive posterize → reduced ink on skin.',
  newCapabilitiesRequired: ['applyHalftone', 'multiScaleEdgeDetect', 'applyAdaptivePosterize'],
};

export const PREMIUM_03_SKETCH: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_03_sketch',
  display_name: 'Sketch',
  category: 'flagship',
  priority: 'P0',
  description: 'Graphite-pencil reconstruction with variable line weight, directional cross-hatching, paper texture, and subject-emphasis hierarchy.',
  visualDescription: 'Variable-weight contours, shadow hatching, true paper-white highlights, paper grain.',
  intensityBehavior: 'threshold-activated',
  model: 'programmatic',
  styleKey: 'sketch',
  adjustments: [
    { key: 'contourWeightRange', label: 'Contour Weight', min: 0.5, max: 3, default: 1.5, intensityMap: 'linear' },
    { key: 'hatchAngle', label: 'Hatch Angle', min: 30, max: 60, default: 45, intensityMap: 'fixed' },
    { key: 'hatchDensity', label: 'Hatch Density', min: 0, max: 1, default: 0.6, intensityMap: 'threshold', threshold: 25 },
    { key: 'crossHatchThreshold', label: 'Cross-Hatch Zone', min: 10, max: 20, default: 15, intensityMap: 'threshold', threshold: 75 },
    { key: 'paperGrainOpacity', label: 'Paper Grain', min: 0.05, max: 0.15, default: 0.1, intensityMap: 'linear' },
    { key: 'backgroundDetailReduction', label: 'BG Detail Cut', min: 40, max: 80, default: 60, intensityMap: 'fixed' },
  ],
  recipeNotes: 'Dual-radius edge blend → directional strokes on shadow/mid → paper texture → subject emphasis.',
  newCapabilitiesRequired: ['applyDirectionalStrokes', 'applyProceduralTexture', 'dualRadiusContourBlend'],
};

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
Preserve exactly: the composition, camera angle, architecture, structures, people, objects, and framing of the original photo. Do not add, remove, or move any real subject in the scene.
Color & light transformation:
- Recolor every surface into rich, saturated jewel tones: magenta, teal, gold, violet, emerald, crimson, cobalt
- Sky transformed into a dramatic multi-color sunset/aurora blend
- Wet ground/reflective surfaces intensify the color bounce
- Add floating light-particle and confetti-like specks in the air
- Foliage recolored into vivid rainbow-toned leaves
- Warm golden-hour glow blended with jewel-tone ambient, high contrast, glossy/painterly finish
- Maintain photographic detail and sharpness — color/light grade over the real structure, not a full repaint`,
  negative_prompt: `monochrome, black and white, desaturated, added animals, added people, changed architecture, changed composition, blurry structure, watermark, text, logo, signature, distorted buildings, warped perspective`,
  strength: 0.35,
  guidance_scale: 7.5,
  controlnet_type: 'canny',
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'paletteFamily', label: 'Palette Strength', min: 0, max: 1, default: 0.75, intensityMap: 'linear' },
    { key: 'regionBiasStrength', label: 'Region Hierarchy', min: 0, max: 1, default: 0.5, intensityMap: 'progressive-structural' as any },
    { key: 'edgeGlowWidth', label: 'Edge Glow', min: 1, max: 4, default: 2, intensityMap: 'threshold', threshold: 30 },
    { key: 'particleDensity', label: 'Particles', min: 0, max: 1, default: 0.3, intensityMap: 'threshold', threshold: 40 },
    { key: 'radialBoostRadius', label: 'Radial Boost', min: 0, max: 1, default: 0.4, intensityMap: 'threshold', threshold: 55 },
    { key: 'skinToneProtection', label: 'Skin Protect', min: 0, max: 1, default: 1, intensityMap: 'fixed' },
  ],
  recipeNotes: 'Luminance+saturation masks → jewel palette map → region hierarchy → edge glow → particles (sky only) → bloom → detail restore.',
  newCapabilitiesRequired: ['applyPaletteMap', 'applyColorHarmonization', 'regionSegmentation', 'applyProceduralTexture'],
};

// ─── P1 HIGH-IMPACT ─────────────────────────────────────────────────────────

export const PREMIUM_05_WILDFIRE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_05_wildfire',
  display_name: 'Wildfire',
  category: 'high-impact',
  priority: 'P1',
  description: 'Scene lit as if by a massive nearby fire — amber highlights, charcoal-red shadows, ember particles, heat shimmer.',
  visualDescription: 'Deep orange underlighting, drifting embers, smoke haze, heat-shimmer on reflections.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform the lighting and color of this photo as if the entire scene is illuminated by a massive nearby fire. Preserve all subjects, structures, and composition exactly. Recolor highlights into deep amber/orange, shadows into charcoal black-red. Add drifting ember particles and light smoke haze throughout the air. Strong underlighting/uplighting on faces and building facades. Glossy heat-shimmer feel on any reflective surface.`,
  negative_prompt: `changed composition, added flames as literal objects unless requested, cartoon style, watermark, text, distorted structures`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'warmShiftHighlight', label: 'Highlight Warmth', min: 0, max: 40, default: 28, intensityMap: 'linear' },
    { key: 'warmShiftShadow', label: 'Shadow Warmth', min: 0, max: 15, default: 8, intensityMap: 'linear' },
    { key: 'emberDensity', label: 'Ember Density', min: 0, max: 1, default: 0.25, intensityMap: 'threshold', threshold: 40 },
    { key: 'bloomThreshold', label: 'Bloom Threshold', min: 0.75, max: 0.9, default: 0.8, intensityMap: 'linear' },
    { key: 'heatShimmerAmplitude', label: 'Heat Shimmer', min: 0, max: 3, default: 1.2, intensityMap: 'threshold', threshold: 60 },
  ],
};

export const PREMIUM_06_GLACIER: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_06_glacier',
  display_name: 'Glacier',
  category: 'high-impact',
  priority: 'P1',
  description: 'Icy crystalline atmosphere — cool cyan/blue palette, frost texture on edges, crisp highlight bloom.',
  visualDescription: 'Cold blues/whites, edge frost, crystalline highlights, breath-fog near figures.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform the color and light of this photo into an icy, glacial atmosphere. Preserve composition and subjects exactly. Recolor the entire scene into cold blues, whites, and pale cyan. Add subtle frost/crystal texture on edges and surfaces, soft cold mist/fog in the air, sharp crystalline highlights on reflective areas. Breath-fog effect near any figures if present.`,
  negative_prompt: `changed composition, warm tones, cartoon style, watermark, text`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'coolShiftShadow', label: 'Shadow Cool', min: 0, max: 40, default: 28, intensityMap: 'linear' },
    { key: 'coolShiftHighlight', label: 'Highlight Cool', min: 0, max: 20, default: 12, intensityMap: 'linear' },
    { key: 'frostOpacity', label: 'Frost Opacity', min: 0, max: 0.25, default: 0.12, intensityMap: 'threshold', threshold: 25 },
    { key: 'frostEdgeConcentration', label: 'Frost Edge Focus', min: 0, max: 1, default: 0.8, intensityMap: 'fixed' },
    { key: 'crystallineFacetLevels', label: 'Facet Levels', min: 3, max: 6, default: 5, intensityMap: 'threshold', threshold: 50 },
  ],
};

export const PREMIUM_07_NEONPULSE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_07_neonpulse',
  display_name: 'Neon Pulse',
  category: 'high-impact',
  priority: 'P1',
  description: 'Cyberpunk night-glow — selective neon edge illumination (magenta/cyan), deep purple-blue shadows, wet reflections.',
  visualDescription: 'Magenta/cyan rim light on edges, deep purple shadows, wet neon streaks.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  styleKey: 'neon',
  prompt: `Transform this photo into a neon-lit cyberpunk night atmosphere. Preserve composition and subjects exactly. Recolor scene into deep purple-blue shadows with magenta and cyan neon highlights. Add glowing rim light along building edges and subject outlines. Wet-surface reflections intensify neon colors. Subtle lens-glow/bloom around light sources.`,
  negative_prompt: `changed composition, daylight tones, cartoon style, watermark, text`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'neonColorPair', label: 'Neon Strength', min: 0, max: 1, default: 0.7, intensityMap: 'linear' },
    { key: 'edgeGlowIntensity', label: 'Edge Glow', min: 0, max: 1, default: 0.65, intensityMap: 'linear' },
    { key: 'darkFieldThreshold', label: 'Dark Field', min: 0, max: 0.4, default: 0.28, intensityMap: 'fixed' },
    { key: 'bloomRadius', label: 'Bloom Radius', min: 2, max: 15, default: 8, intensityMap: 'linear' },
  ],
};

export const PREMIUM_08_GOLDDUST: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_08_golddust',
  display_name: 'Gold Dust',
  category: 'high-impact',
  priority: 'P1',
  description: 'Luxury editorial gold-metallic finish — warm gold highlights, bronze shadows, shimmering particle dust, soft bloom.',
  visualDescription: 'Gold-foil sheen, fine sparkling dust, soft luxury glow.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform this photo into a luxurious gold-toned atmosphere. Preserve composition and subjects exactly. Apply warm metallic gold color grading across highlights, soft bronze in shadows. Add fine shimmering gold dust particles drifting through the air. Subtle soft-glow bloom on bright areas for an editorial/luxury magazine feel.`,
  negative_prompt: `changed composition, cold tones, cartoon style, watermark, text`,
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'goldHueTarget', label: 'Gold Hue', min: 30, max: 55, default: 42, intensityMap: 'linear' },
    { key: 'sparkleDensity', label: 'Sparkle Density', min: 0, max: 1, default: 0.2, intensityMap: 'threshold', threshold: 30 },
    { key: 'sparkleSize', label: 'Sparkle Size', min: 1, max: 4, default: 2, intensityMap: 'fixed' },
    { key: 'bloomSoftness', label: 'Bloom Softness', min: 15, max: 40, default: 25, intensityMap: 'linear' },
    { key: 'editorialContrast', label: 'Editorial Contrast', min: 0, max: 20, default: 10, intensityMap: 'linear' },
  ],
};

export const PREMIUM_09_STORMBREAK: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_09_stormbreak',
  display_name: 'Storm Break',
  category: 'high-impact',
  priority: 'P1',
  description: 'Dramatic storm atmosphere — heavy clouds, single light-shaft break, deep contrast, rain-streak texture.',
  visualDescription: 'Dark storm sky, warm light shaft, cool-warm separation, subtle rain.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform the sky and lighting of this photo into a dramatic storm atmosphere. Preserve composition and subjects exactly. Darken and thicken clouds into a heavy storm sky, add a single dramatic shaft of light breaking through. Increase contrast heavily — deep shadows, sharp highlights. Add subtle rain-streak texture and wind-blown particle motion. Cool blue-grey overall grade with warm highlight break.`,
  negative_prompt: `changed composition, added lightning bolts as literal objects unless requested, cartoon style, watermark, text`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: true,
  adjustments: [
    { key: 'contrastDepth', label: 'Contrast Depth', min: 0, max: 30, default: 18, intensityMap: 'linear' },
    { key: 'skyCoolShift', label: 'Sky Cool Shift', min: 0, max: 30, default: 18, intensityMap: 'linear' },
    { key: 'lightShaftWidth', label: 'Shaft Width', min: 40, max: 200, default: 120, intensityMap: 'threshold', threshold: 35 },
    { key: 'lightShaftWarmth', label: 'Shaft Warmth', min: 0, max: 1, default: 0.55, intensityMap: 'threshold', threshold: 35 },
  ],
};

export const PREMIUM_10_BLOOM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_10_bloom',
  display_name: 'Bloom',
  category: 'high-impact',
  priority: 'P1',
  description: 'Ethereal dreamcore luminance bloom — pastel wash, heavy soft glow on highlights only, floating particles.',
  visualDescription: 'Soft pink/lavender/mint wash, isolated highlight bloom, dreamy haze.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform this photo into a soft ethereal dreamlike atmosphere. Preserve composition and subjects exactly. Apply a pastel color wash (soft pink, lavender, mint) across the whole image. Add heavy soft light bloom around all highlights. Add fine floating light particles/bokeh throughout. Slightly reduce contrast for a hazy, dreamy softness while keeping subject edges recognizable.`,
  negative_prompt: `changed composition, sharp harsh contrast, cartoon style, watermark, text`,
  strength: 0.3,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'bloomThreshold', label: 'Bloom Threshold', min: 0.75, max: 0.95, default: 0.82, intensityMap: 'linear' },
    { key: 'bloomBlurRadius', label: 'Bloom Radius', min: 10, max: 50, default: 25, intensityMap: 'linear' },
    { key: 'bloomOpacity', label: 'Bloom Opacity', min: 0.2, max: 0.6, default: 0.4, intensityMap: 'linear' },
    { key: 'pastelStrength', label: 'Pastel Wash', min: 0, max: 0.4, default: 0.25, intensityMap: 'threshold', threshold: 30 },
    { key: 'contrastLift', label: 'Contrast Lift', min: 0, max: 15, default: 8, intensityMap: 'linear' },
  ],
};

export const PREMIUM_11_MOLTEN: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_11_molten',
  display_name: 'Molten',
  category: 'high-impact',
  priority: 'P1',
  description: 'Molten volcanic material look — cracked glowing-orange texture in shadows, obsidian-black highlights, ash particles.',
  visualDescription: 'Cracked lava texture in shadows, glassy obsidian highlights, drifting ash.',
  intensityBehavior: 'progressive-structural',
  model: 'hybrid',
  prompt: `Transform the surface texture and color of this photo into a molten, volcanic look. Preserve composition and subjects exactly. Shadow areas take on a cracked, glowing orange-red lava-like texture pattern; highlight areas shift toward obsidian black-purple with a glassy sheen. Add faint heat-haze distortion in the air and drifting ash particles.`,
  negative_prompt: `changed composition, literal lava flow replacing structures, cartoon style, watermark, text`,
  strength: 0.4,
  controlnet_weight: 0.8,
  two_pass: true,
  adjustments: [
    { key: 'crackDensity', label: 'Crack Density', min: 0, max: 1, default: 0.4, intensityMap: 'threshold', threshold: 25 },
    { key: 'crackGlowIntensity', label: 'Crack Glow', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'obsidianSpecularBoost', label: 'Obsidian Specular', min: 0, max: 30, default: 15, intensityMap: 'linear' },
    { key: 'ashParticleDensity', label: 'Ash Density', min: 0, max: 1, default: 0.2, intensityMap: 'threshold', threshold: 50 },
    { key: 'hazeAmplitude', label: 'Heat Haze', min: 0, max: 3, default: 1.0, intensityMap: 'threshold', threshold: 40 },
  ],
};

export const PREMIUM_12_CHROMEFUTURE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_12_chromefuture',
  display_name: 'Chrome Future',
  category: 'high-impact',
  priority: 'P1',
  description: 'Futuristic liquid-metal/chrome finish — specular highlight shaping, cool silver-blue palette, holographic streaks.',
  visualDescription: 'Chrome sheen, cool metallic reflections, crisp sci-fi clarity.',
  intensityBehavior: 'threshold-activated',
  model: 'hybrid',
  prompt: `Transform this photo into a futuristic chrome atmosphere. Preserve composition and subjects exactly. Apply a cool silver-blue metallic sheen across surfaces, increase reflectivity/gloss on flat areas as if partially chrome-plated. Add subtle holographic light streaks in the sky or background. Crisp, high-clarity, sci-fi editorial finish.`,
  negative_prompt: `changed composition, warm tones, cartoon style, watermark, text`,
  strength: 0.35,
  controlnet_weight: 0.85,
  two_pass: false,
  adjustments: [
    { key: 'specularSharpness', label: 'Specular Sharpness', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'desaturationAmount', label: 'Desaturation', min: 30, max: 70, default: 50, intensityMap: 'linear' },
    { key: 'coolWarmSplit', label: 'Cool/Warm Split', min: 0, max: 30, default: 12, intensityMap: 'linear' },
    { key: 'holoStreakDensity', label: 'Holo Streaks', min: 0, max: 0.3, default: 0.12, intensityMap: 'threshold', threshold: 40 },
    { key: 'edgeMicroContrast', label: 'Edge Clarity', min: 0, max: 20, default: 10, intensityMap: 'linear' },
  ],
};

// ─── P2 ARTISTIC ────────────────────────────────────────────────────────────

export const PREMIUM_13_VELVETNOIR: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_13_velvetnoir',
  display_name: 'Velvet Noir',
  category: 'artistic',
  priority: 'P2',
  description: 'Full cinematic-noir reconstruction — luminance-weighted mono, edge-aware shadow crush, single key-light, film grain, vignette.',
  visualDescription: 'Deep cinematic B&W with dramatic key light and rich grain — not a simple grayscale.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'shadowFloor', label: 'Shadow Floor', min: 3, max: 8, default: 5, intensityMap: 'fixed' },
    { key: 'keyLightIntensity', label: 'Key Light', min: 0, max: 40, default: 22, intensityMap: 'linear' },
    { key: 'grainAmount', label: 'Film Grain', min: 0, max: 0.2, default: 0.12, intensityMap: 'linear' },
    { key: 'vignetteStrength', label: 'Vignette', min: 0, max: 30, default: 18, intensityMap: 'linear' },
  ],
};

export const PREMIUM_14_OILCANVAS: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_14_oilcanvas',
  display_name: 'Oil Canvas',
  category: 'artistic',
  priority: 'P2',
  description: 'Painterly oil-painting reconstruction with directional brush strokes, gentle adaptive posterize, and canvas texture.',
  visualDescription: 'Visible brush strokes following form, canvas weave, softened edges, readable faces.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'oil',
  adjustments: [
    { key: 'strokeSize', label: 'Stroke Size', min: 3, max: 12, default: 6, intensityMap: 'linear' },
    { key: 'strokeDensity', label: 'Stroke Density', min: 0.3, max: 1, default: 0.65, intensityMap: 'linear' },
    { key: 'canvasTextureOpacity', label: 'Canvas Texture', min: 0, max: 0.2, default: 0.1, intensityMap: 'linear' },
    { key: 'edgeSoftness', label: 'Edge Softness', min: 0, max: 1, default: 0.45, intensityMap: 'linear' },
  ],
};

export const PREMIUM_15_WATERCOLORBLOOM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_15_watercolorbloom',
  display_name: 'Watercolor Bloom',
  category: 'artistic',
  priority: 'P2',
  description: 'Wet watercolor reconstruction — edge-preserving blur base, irregular wash strokes, pigment bleed, paper-white highlights.',
  visualDescription: 'Soft wet washes, controlled pigment bleed at edges, true paper-white in highlights.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  styleKey: 'watercolor',
  adjustments: [
    { key: 'bleedRadius', label: 'Bleed Radius', min: 2, max: 15, default: 6, intensityMap: 'linear' },
    { key: 'washIrregularity', label: 'Wash Irregularity', min: 0, max: 1, default: 0.5, intensityMap: 'linear' },
    { key: 'paperWhiteThreshold', label: 'Paper White', min: 0.88, max: 0.95, default: 0.9, intensityMap: 'fixed' },
  ],
};

export const PREMIUM_16_DUOTONEPULSE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_16_duotonepulse',
  display_name: 'Duotone Pulse',
  category: 'artistic',
  priority: 'P2',
  description: 'Graphic poster-art duotone with edge-aware luminance bands and optional contour emphasis.',
  visualDescription: 'Two-color poster look with clean band boundaries that respect real edges.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'bandCount', label: 'Band Count', min: 5, max: 10, default: 7, intensityMap: 'linear' },
    { key: 'edgeEmphasis', label: 'Edge Emphasis', min: 0, max: 1, default: 0.35, intensityMap: 'linear' },
    { key: 'colorAStrength', label: 'Color A Strength', min: 0, max: 1, default: 0.8, intensityMap: 'linear' },
    { key: 'colorBStrength', label: 'Color B Strength', min: 0, max: 1, default: 0.8, intensityMap: 'linear' },
  ],
};

export const PREMIUM_17_INFRAREDDREAM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_17_infrareddream',
  display_name: 'Infrared Dream',
  category: 'artistic',
  priority: 'P2',
  description: 'False-color infrared film look — foliage to white/pink, sky to deep blue-black, protected skin tones.',
  visualDescription: 'Classic IR: bright foliage, dark sky, gentle warm shift on people.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'foliageRemapStrength', label: 'Foliage Remap', min: 0, max: 1, default: 0.7, intensityMap: 'linear' },
    { key: 'skyDarkenAmount', label: 'Sky Darken', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'skinProtection', label: 'Skin Protection', min: 0, max: 1, default: 1, intensityMap: 'fixed' },
  ],
};

export const PREMIUM_18_MIRAGE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_18_mirage',
  display_name: 'Mirage',
  category: 'artistic',
  priority: 'P2',
  description: 'Heat-distortion desert atmosphere with ground-up domain warp, sandy color harmonization, horizon softening.',
  visualDescription: 'Rising heat haze, warm sandy grade, softened horizon.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'warpAmplitude', label: 'Warp Amplitude', min: 2, max: 10, default: 5, intensityMap: 'linear' },
    { key: 'warpFrequency', label: 'Warp Frequency', min: 0.5, max: 3, default: 1.2, intensityMap: 'linear' },
    { key: 'sandyHueShift', label: 'Sandy Hue', min: 0, max: 30, default: 18, intensityMap: 'linear' },
    { key: 'horizonSoftness', label: 'Horizon Soft', min: 0, max: 1, default: 0.4, intensityMap: 'linear' },
  ],
};

export const PREMIUM_19_AURORAVEIL: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_19_auroraveil',
  display_name: 'Aurora Veil',
  category: 'artistic',
  priority: 'P2',
  description: 'Aurora-inspired atmospheric color wash — flowing green/purple/teal ribbons in sky, gentle foreground harmonization.',
  visualDescription: 'Organic aurora bands over sky, cohesive cool foreground.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  adjustments: [
    { key: 'bandCount', label: 'Band Count', min: 2, max: 4, default: 3, intensityMap: 'fixed' },
    { key: 'bandFlowScale', label: 'Flow Scale', min: 0.3, max: 2, default: 0.8, intensityMap: 'linear' },
    { key: 'foregroundHarmonization', label: 'FG Harmonize', min: 0, max: 0.3, default: 0.15, intensityMap: 'linear' },
  ],
};

export const PREMIUM_20_COPPERPATINA: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_20_copperpatina',
  display_name: 'Copper Patina',
  category: 'artistic',
  priority: 'P2',
  description: 'Aged-metal transform — warm copper highlights, cool verdigris in shadow recesses, oxidation texture.',
  visualDescription: 'Copper + verdigris split, blotchy patina texture in crevices.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'copperHueHighlight', label: 'Copper Highlight', min: 20, max: 45, default: 32, intensityMap: 'linear' },
    { key: 'verdigrisHueShadow', label: 'Verdigris Shadow', min: 140, max: 180, default: 160, intensityMap: 'linear' },
    { key: 'patinaTextureOpacity', label: 'Patina Texture', min: 0, max: 0.3, default: 0.15, intensityMap: 'linear' },
    { key: 'paletteCoherence', label: 'Palette Coherence', min: 0, max: 1, default: 0.7, intensityMap: 'linear' },
  ],
};

// ─── P3 NICHE ───────────────────────────────────────────────────────────────

export const PREMIUM_21_GALAXYDRIFT: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_21_galaxydrift',
  display_name: 'Galaxy Drift',
  category: 'artistic',
  priority: 'P3',
  description: 'Cosmic nebula color-field overlay restricted to dark/sky regions with sparse stars and soft bloom.',
  visualDescription: 'Purple/blue/pink nebula clouds, stars, subject left largely untouched.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  adjustments: [
    { key: 'nebulaOpacity', label: 'Nebula Opacity', min: 0, max: 0.4, default: 0.22, intensityMap: 'linear' },
    { key: 'starDensity', label: 'Star Density', min: 0, max: 1, default: 0.25, intensityMap: 'linear' },
    { key: 'foregroundCoolShift', label: 'FG Cool Shift', min: 0, max: 10, default: 4, intensityMap: 'linear' },
  ],
};

export const PREMIUM_22_VINTAGE8MM: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_22_vintage8mm',
  display_name: 'Vintage 8mm',
  category: 'artistic',
  priority: 'P3',
  description: 'Authentic 8mm film emulation — subtle channel misalignment, halation, luminance-dependent grain, organic vignette.',
  visualDescription: 'Warm halation, shadow-boosted grain, slight chromatic fringe, uneven vignette.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'channelMisalignment', label: 'Channel Shift', min: 0, max: 2, default: 0.6, intensityMap: 'linear' },
    { key: 'halationRadius', label: 'Halation', min: 0, max: 20, default: 8, intensityMap: 'linear' },
    { key: 'grainShadowBoost', label: 'Shadow Grain', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'vignetteIrregularity', label: 'Vignette Organic', min: 0, max: 1, default: 0.4, intensityMap: 'linear' },
  ],
};

export const PREMIUM_23_PORCELAINART: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_23_porcelainart',
  display_name: 'Porcelain Art',
  category: 'artistic',
  priority: 'P3',
  description: 'Ceramic-portrait reconstruction — soft luminance banding on skin with hand-painted texture, warm rim light, simplified background.',
  visualDescription: 'Glazed ceramic skin look, soft painterly hair/clothing, subject separation.',
  intensityBehavior: 'linear',
  model: 'programmatic',
  adjustments: [
    { key: 'glazeBands', label: 'Glaze Bands', min: 3, max: 4, default: 3, step: 1, intensityMap: 'fixed' },
    { key: 'textureOpacity', label: 'Paint Texture', min: 0, max: 0.15, default: 0.08, intensityMap: 'linear' },
    { key: 'rimLightIntensity', label: 'Rim Light', min: 0, max: 1, default: 0.35, intensityMap: 'linear' },
    { key: 'backgroundSoftness', label: 'BG Softness', min: 0, max: 1, default: 0.55, intensityMap: 'linear' },
  ],
};

export const PREMIUM_24_ORIGAMIFOLD: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_24_origamifold',
  display_name: 'Origami Fold',
  category: 'graphic',
  priority: 'P3',
  description: 'Geometric low-poly paper-fold reconstruction — edge-weighted triangulation, crease shading, fold-line strokes.',
  visualDescription: 'Faceted paper triangles with light/shadow creases and thin fold edges.',
  intensityBehavior: 'progressive-structural',
  model: 'programmatic',
  adjustments: [
    { key: 'triangleDensity', label: 'Triangle Density', min: 0.2, max: 1, default: 0.55, intensityMap: 'linear' },
    { key: 'creaseIntensity', label: 'Crease Intensity', min: 0, max: 1, default: 0.45, intensityMap: 'linear' },
    { key: 'edgeStrokeOpacity', label: 'Fold Stroke', min: 0, max: 1, default: 0.5, intensityMap: 'linear' },
  ],
};

export const PREMIUM_25_BIOLUMINESCENCE: PremiumFilterDefinition = {
  ...PREMIUM_BASE,
  filter_id: 'premium_25_bioluminescence',
  display_name: 'Bioluminescence',
  category: 'artistic',
  priority: 'P3',
  description: 'Glow-in-the-dark transform — teal/purple bio-glow points in dark regions only, deep near-black blue surroundings.',
  visualDescription: 'Teal/purple bio-glow hotspots in darkness, midtones/highlights left mostly natural.',
  intensityBehavior: 'linear',
  model: 'hybrid',
  adjustments: [
    { key: 'glowPointDensity', label: 'Glow Density', min: 0, max: 1, default: 0.3, intensityMap: 'linear' },
    { key: 'glowRadius', label: 'Glow Radius', min: 4, max: 30, default: 12, intensityMap: 'linear' },
    { key: 'darkRegionColorShift', label: 'Dark Shift', min: 0, max: 1, default: 0.6, intensityMap: 'linear' },
  ],
};

// ─── MASTER LIST ────────────────────────────────────────────────────────────

export const ALL_PREMIUM_FILTERS: readonly PremiumFilterDefinition[] = [
  PREMIUM_01_ANIME,
  PREMIUM_02_COMIC,
  PREMIUM_03_SKETCH,
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
  return ALL_PREMIUM_FILTERS.find((f) => f.filter_id === id);
}

export function listPremiumFiltersByPriority(priority: PremiumPriority): PremiumFilterDefinition[] {
  return ALL_PREMIUM_FILTERS.filter((f) => f.priority === priority);
}

export function listPremiumFiltersByCategory(category: PremiumCategory): PremiumFilterDefinition[] {
  return ALL_PREMIUM_FILTERS.filter((f) => f.category === category);
}

export function getPremiumAdjustments(id: string): PremiumFilterDefinition['adjustments'] {
  return getPremiumFilterById(id)?.adjustments ?? [];
}
