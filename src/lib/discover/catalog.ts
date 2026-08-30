/**
 * Curated discovery catalog for the Motio2Edit homepage.
 *
 * IMPORTANT:
 * - This is FEATURED / STAFF-PICK content, not live trending analytics.
 * - Do not claim "trending" from views/uses until real signals exist.
 * - Prompts are user-facing only (no system/provider instructions).
 * - Only tools that exist in the product are marked available.
 * - Filters / Lenses are omitted until those products ship.
 */

import type { DiscoverItem, DiscoverSection } from "./types";

/** Unsplash preview set — public images for inspiration cards */
const U = {
  interior:
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  mountain:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
  portrait:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
  city: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80",
  fashion:
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
  vintage:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
  product:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
  nature:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80",
  rain: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80",
  car: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  neon: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
  beach:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  wedding:
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
  street:
    "https://images.unsplash.com/photo-1477959858617-67f85b6b3098?auto=format&fit=crop&w=900&q=80",
  pet: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80",
} as const;

export const DISCOVER_SECTIONS: DiscoverSection[] = [
  { id: "featured", label: "Staff picks", emoji: "⭐", description: "Curated ideas to try first" },
  { id: "photos", label: "AI photos", emoji: "✨", description: "Text-to-image inspiration" },
  { id: "edits", label: "Photo edits", emoji: "📸", description: "Transform a photo you already have" },
  { id: "portrait", label: "Portraits", emoji: "👤", description: "People & beauty looks" },
  { id: "product", label: "Product", emoji: "🛍", description: "Catalog & ecommerce shots" },
  { id: "social", label: "Social", emoji: "📱", description: "Vertical formats for feeds" },
  { id: "cinematic", label: "Cinematic", emoji: "🎞", description: "Film-like mood & lighting" },
  { id: "video", label: "Video ideas", emoji: "🎬", description: "Clips for Video Studio" },
  { id: "circle", label: "Circle 2edit", emoji: "◯", description: "Mask, remove, and add" },
  { id: "auto-edit", label: "Auto Edit", emoji: "⚡", description: "One photo — AI decides" },
];

export const DISCOVER_CATALOG: DiscoverItem[] = [
  {
    id: "cinematic-rain-portrait",
    title: "Cinematic rain portrait",
    description: "Moody portrait with rain, soft rim light, and film grain.",
    category: "featured",
    tool: "image",
    previewUrl: U.rain,
    prompt:
      "Cinematic portrait in light rain, soft rim light, shallow depth of field, film grain, natural skin texture, muted teal and amber color grade.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "9:16",
    quality: "hd",
    styleLabel: "Cinematic",
    badge: "Portrait",
    estimatedCredits: 8,
    isFeatured: true,
    isStaffPick: true,
    available: true,
  },
  {
    id: "clean-living-room",
    title: "Clean living room",
    description: "Remove clutter and reconstruct surfaces naturally.",
    category: "featured",
    tool: "image",
    previewUrl: U.interior,
    prompt:
      "Remove clutter and unwanted objects from the room. Reconstruct surfaces with matching lighting, textures, and perspective. Keep architecture unchanged.",
    inputRequirement: "image-required",
    inputCount: 1,
    aspectRatio: "16:9",
    quality: "hd",
    badge: "Object removal",
    smartRemove: true,
    estimatedCredits: 10,
    isFeatured: true,
    available: true,
  },
  {
    id: "product-white-bg",
    title: "Product on pure white",
    description: "E-commerce ready product shot with soft shadow.",
    category: "featured",
    tool: "image",
    previewUrl: U.product,
    prompt:
      "Clean e-commerce product photo on a pure white background, soft even studio lighting, subtle floor shadow, sharp detail, no props.",
    inputRequirement: "image-required",
    inputCount: 1,
    aspectRatio: "1:1",
    quality: "hd",
    badge: "Product",
    styleLabel: "Catalog",
    estimatedCredits: 8,
    isFeatured: true,
    available: true,
  },
  {
    id: "cinematic-city-walk",
    title: "Cinematic city walk",
    description: "5s night city clip with gentle camera push.",
    category: "featured",
    tool: "video",
    previewUrl: U.city,
    prompt:
      "Cinematic night city walk, neon reflections on wet pavement, slow forward camera push, shallow depth of field, filmic color grade.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "16:9",
    durationSec: 5,
    sound: false,
    badge: "Video",
    styleLabel: "Cinematic",
    estimatedCredits: 125,
    isFeatured: true,
    isStaffPick: true,
    available: true,
  },
  {
    id: "golden-hour-mountain",
    title: "Golden hour mountain",
    description: "Wide landscape with warm light and layered peaks.",
    category: "photos",
    tool: "image",
    previewUrl: U.mountain,
    prompt:
      "Wide landscape photograph of mountain peaks at golden hour, layered ridges, soft haze, warm directional light, high detail, natural colors.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "16:9",
    quality: "hd",
    badge: "Landscape",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "neon-street-night",
    title: "Neon street night",
    description: "Urban night scene with colorful reflections.",
    category: "photos",
    tool: "image",
    previewUrl: U.neon,
    prompt:
      "Night street scene with neon signs, wet asphalt reflections, cinematic framing, rich color contrast, slight film grain.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "9:16",
    quality: "hd",
    badge: "Urban",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "minimal-beach-dawn",
    title: "Minimal beach dawn",
    description: "Quiet shoreline, soft pastels, empty frame.",
    category: "photos",
    tool: "image",
    previewUrl: U.beach,
    prompt:
      "Minimal beach at dawn, soft pastel sky, empty shoreline, calm water, gentle haze, wide composition, peaceful mood.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "16:9",
    quality: "hd",
    badge: "Nature",
    estimatedCredits: 8,
    isNew: true,
    available: true,
  },
  {
    id: "photo-restore",
    title: "Family archive restore",
    description: "Repair scratches, dust, and fading on old photos.",
    category: "edits",
    tool: "image",
    previewUrl: U.vintage,
    prompt:
      "Restore this old photograph. Remove scratches, dust, fading, and noise. Keep original composition, identity, and era-appropriate tones.",
    inputRequirement: "image-required",
    inputCount: 1,
    quality: "hd",
    badge: "Restore",
    estimatedCredits: 10,
    available: true,
  },
  {
    id: "hdr-nature",
    title: "HDR nature clarity",
    description: "Richer contrast while keeping natural color.",
    category: "edits",
    tool: "image",
    previewUrl: U.nature,
    prompt:
      "Apply natural HDR enhancement: richer contrast, balanced highlights and shadows, clear detail, realistic saturation. Do not change composition.",
    inputRequirement: "image-required",
    inputCount: 1,
    quality: "hd",
    badge: "Enhance",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "studio-relight",
    title: "Studio relight",
    description: "Add soft key and rim light without changing identity.",
    category: "edits",
    tool: "image",
    previewUrl: U.portrait,
    prompt:
      "Add professional studio lighting: soft key light from the front-left, gentle fill, subtle rim light. Do not change identity or pose.",
    inputRequirement: "image-required",
    inputCount: 1,
    quality: "hd",
    badge: "Relight",
    estimatedCredits: 10,
    available: true,
  },
  {
    id: "anime-look",
    title: "Anime illustration look",
    description: "Modern anime style while keeping composition.",
    category: "edits",
    tool: "image",
    previewUrl: U.city,
    prompt:
      "Convert this image into a modern anime illustration with clean lines, expressive shading, and cell-style color while preserving composition.",
    inputRequirement: "image-required",
    inputCount: 1,
    quality: "hd",
    badge: "Style",
    estimatedCredits: 10,
    available: true,
  },
  {
    id: "soft-beauty-portrait",
    title: "Soft beauty portrait",
    description: "Natural skin, soft light, elegant crop.",
    category: "portrait",
    tool: "image",
    previewUrl: U.portrait,
    prompt:
      "Soft beauty portrait, natural skin texture, gentle catchlights, soft diffused light, elegant crop, subtle color grade, no heavy retouch.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "3:4",
    quality: "hd",
    badge: "Portrait",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "fashion-editorial",
    title: "Fashion editorial",
    description: "Magazine-style lighting and confident pose.",
    category: "portrait",
    tool: "image",
    previewUrl: U.fashion,
    prompt:
      "Fashion editorial portrait, dramatic softbox lighting, sharp fabric detail, confident pose, clean background, magazine color grade.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "3:4",
    quality: "hd",
    badge: "Fashion",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "wedding-soft-glow",
    title: "Wedding soft glow",
    description: "Romantic light for couple or bridal shots.",
    category: "portrait",
    tool: "image",
    previewUrl: U.wedding,
    prompt:
      "Romantic wedding portrait, soft golden glow, gentle bokeh, natural skin, warm highlights, elegant composition.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "3:4",
    quality: "hd",
    badge: "Wedding",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "watch-product-hero",
    title: "Watch product hero",
    description: "Sharp detail, soft reflection, premium feel.",
    category: "product",
    tool: "image",
    previewUrl: U.product,
    prompt:
      "Premium product hero shot of a wristwatch, sharp detail, soft reflection, controlled studio lighting, minimal background, luxury advertising look.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "1:1",
    quality: "hd",
    badge: "Product",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "food-menu-shot",
    title: "Food menu shot",
    description: "Appetizing top-down or 45° plate photography.",
    category: "product",
    tool: "image",
    previewUrl: U.food,
    prompt:
      "Professional food photography, appetizing colors, soft natural light, shallow depth of field, clean plate styling, menu-ready composition.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "1:1",
    quality: "hd",
    badge: "Food",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "instagram-portrait-9-16",
    title: "Instagram portrait",
    description: "Vertical 9:16 ready for Reels / Stories.",
    category: "social",
    tool: "image",
    previewUrl: U.portrait,
    prompt:
      "Vertical social media portrait, flattering natural light, clean background, sharp subject, warm skin tones, 9:16 composition.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "9:16",
    quality: "hd",
    badge: "Social",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "street-style-vertical",
    title: "Street style vertical",
    description: "Urban fashion frame for feeds.",
    category: "social",
    tool: "image",
    previewUrl: U.street,
    prompt:
      "Vertical street-style fashion photo, urban background slightly blurred, natural daylight, confident subject, social-feed composition.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "9:16",
    quality: "hd",
    badge: "Social",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "teal-orange-cinema",
    title: "Teal & orange cinema",
    description: "Classic film color grade on any scene.",
    category: "cinematic",
    tool: "image",
    previewUrl: U.city,
    prompt:
      "Apply a cinematic teal-and-orange color grade, filmic contrast, subtle grain, anamorphic-style mood. Preserve subject identity and composition.",
    inputRequirement: "image-required",
    inputCount: 1,
    quality: "hd",
    badge: "Grade",
    styleLabel: "Cinematic",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "car-night-cinema",
    title: "Night drive frame",
    description: "Moody car-at-night still with reflections.",
    category: "cinematic",
    tool: "image",
    previewUrl: U.car,
    prompt:
      "Cinematic night drive still, wet road reflections, cool headlight beams, shallow depth of field, film color grade, dramatic atmosphere.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "16:9",
    quality: "hd",
    badge: "Cinematic",
    estimatedCredits: 8,
    available: true,
  },
  {
    id: "video-ocean-calm",
    title: "Calm ocean motion",
    description: "5s gentle waves, wide cinematic frame.",
    category: "video",
    tool: "video",
    previewUrl: U.beach,
    prompt:
      "Calm ocean waves at sunrise, gentle motion, wide cinematic frame, soft golden light, peaceful atmosphere.",
    inputRequirement: "text-only",
    inputCount: 0,
    aspectRatio: "16:9",
    durationSec: 5,
    sound: false,
    badge: "Video",
    estimatedCredits: 125,
    available: true,
  },
  {
    id: "video-portrait-soft",
    title: "Soft portrait motion",
    description: "5s subtle head turn, portrait crop.",
    category: "video",
    tool: "video",
    previewUrl: U.portrait,
    prompt:
      "Soft portrait video, subtle natural head movement, gentle breeze in hair, shallow depth of field, warm indoor light.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "9:16",
    durationSec: 5,
    sound: false,
    badge: "Video",
    estimatedCredits: 125,
    available: true,
  },
  {
    id: "video-product-spin",
    title: "Product tabletop",
    description: "5s clean product motion for ads.",
    category: "video",
    tool: "video",
    previewUrl: U.product,
    prompt:
      "Clean product tabletop video, slow subtle rotation, soft studio lighting, pure background, commercial advertising style.",
    inputRequirement: "image-optional",
    inputCount: 0,
    aspectRatio: "1:1",
    durationSec: 5,
    sound: false,
    badge: "Video",
    estimatedCredits: 125,
    available: true,
  },
  {
    id: "circle-remove-object",
    title: "Remove unwanted object",
    description: "Mask the object in Circle 2edit, then remove.",
    category: "circle",
    tool: "circle",
    previewUrl: U.interior,
    prompt:
      "Remove the selected object and reconstruct the background with matching texture, lighting, and perspective.",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Remove",
    estimatedCredits: 25,
    tags: ["circle", "remove"],
    available: true,
  },
  {
    id: "circle-add-car",
    title: "Add Car",
    description: "Paint a region, then place a realistic vehicle.",
    category: "circle",
    tool: "circle",
    previewUrl: U.car,
    prompt: "A realistic passenger car naturally parked in the scene",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Add",
    circleAssetId: "vehicle_car",
    estimatedCredits: 15,
    tags: ["circle", "vehicle", "car"],
    isFeatured: true,
    available: true,
  },
  {
    id: "circle-add-dog",
    title: "Add Dog",
    description: "Friendly dog integrated into your scene.",
    category: "circle",
    tool: "circle",
    previewUrl: U.pet,
    prompt: "A realistic dog naturally present in the scene",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Add",
    circleAssetId: "animal_dog",
    estimatedCredits: 12,
    tags: ["circle", "animal", "dog"],
    available: true,
  },
  {
    id: "circle-add-giraffe",
    title: "Add Giraffe",
    description: "Tall giraffe integrated naturally.",
    category: "circle",
    tool: "circle",
    previewUrl: U.nature,
    prompt: "A realistic giraffe naturally present in the scene",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Add",
    circleAssetId: "animal_giraffe",
    estimatedCredits: 14,
    tags: ["circle", "animal"],
    available: true,
  },
  {
    id: "circle-add-sunflower",
    title: "Add Sunflower",
    description: "Sunflowers matching scene light and perspective.",
    category: "circle",
    tool: "circle",
    previewUrl: U.nature,
    prompt: "Realistic sunflowers integrated into the scene",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Add",
    circleAssetId: "flower_sunflower",
    estimatedCredits: 10,
    tags: ["circle", "flowers"],
    available: true,
  },
  {
    id: "circle-add-butterfly",
    title: "Add Butterfly",
    description: "Delicate butterflies in the painted region.",
    category: "circle",
    tool: "circle",
    previewUrl: U.nature,
    prompt: "Realistic butterflies present in the scene",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Circle Add",
    circleAssetId: "insect_butterfly",
    estimatedCredits: 8,
    tags: ["circle", "nature"],
    available: true,
  },
  {
    id: "auto-edit-one-photo",
    title: "Auto improve one photo",
    description: "Upload one photo — Motio2AI chooses the edit path.",
    category: "auto-edit",
    tool: "auto-edit",
    previewUrl: U.mountain,
    prompt: "",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Auto Edit",
    isNew: true,
    available: true,
  },
  {
    id: "auto-edit-portrait",
    title: "Auto portrait polish",
    description: "One portrait upload for automatic enhancement.",
    category: "auto-edit",
    tool: "auto-edit",
    previewUrl: U.portrait,
    prompt: "",
    inputRequirement: "image-required",
    inputCount: 1,
    badge: "Auto Edit",
    available: true,
  },
];

export function getDiscoverItem(id: string): DiscoverItem | undefined {
  return DISCOVER_CATALOG.find((i) => i.id === id);
}

export function getDiscoverByCategory(category: DiscoverItem["category"]): DiscoverItem[] {
  return DISCOVER_CATALOG.filter((i) => i.category === category && i.available);
}

export function getFeaturedDiscover(): DiscoverItem[] {
  return DISCOVER_CATALOG.filter((i) => i.isFeatured && i.available);
}

export function searchDiscover(query: string): DiscoverItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return DISCOVER_CATALOG.filter((i) => i.available);
  return DISCOVER_CATALOG.filter((i) => {
    if (!i.available) return false;
    const hay = [
      i.title,
      i.description,
      i.badge,
      i.styleLabel,
      i.category,
      i.prompt,
      i.circleAssetId,
      ...(i.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function inputRequirementLabel(req: DiscoverItem["inputRequirement"]): string {
  switch (req) {
    case "text-only":
      return "Text only — no image required";
    case "image-required":
      return "1 image required";
    case "image-optional":
      return "1 image optional";
    case "video-required":
      return "Video required";
    case "music-optional":
      return "Music optional";
    default:
      return "See details";
  }
}

export const DISCOVER_PRESET_KEY = "motio2edit-preset";

export type DiscoverPresetPayload = {
  prompt: string;
  mode: "image" | "video";
  smartRemove?: boolean;
  aspectRatio?: string;
  durationSec?: number;
  sound?: boolean;
  quality?: string;
  discoverId?: string;
  /** Circle Add: server-authoritative asset id */
  circleAssetId?: string;
  ts: number;
};

export function buildPresetPayload(item: DiscoverItem): DiscoverPresetPayload {
  return {
    prompt: item.prompt,
    mode: item.tool === "video" ? "video" : "image",
    smartRemove: item.smartRemove || undefined,
    aspectRatio: item.aspectRatio,
    durationSec: item.durationSec,
    sound: item.sound,
    quality: item.quality,
    discoverId: item.id,
    circleAssetId: item.circleAssetId,
    ts: Date.now(),
  };
}

export function discoverTargetPath(item: DiscoverItem): string {
  switch (item.tool) {
    case "circle": {
      const params = new URLSearchParams();
      if (item.circleAssetId) {
        params.set("mode", "add");
        params.set("asset", item.circleAssetId);
      }
      if (item.id) params.set("recipe", item.id);
      const q = params.toString();
      return q ? `/studio/image/circle-remove?${q}` : "/studio/image/circle-remove";
    }
    case "auto-edit":
      return "/studio/image/auto-edit";
    case "video":
      return "/studio/video";
    case "music":
      return "/studio/music";
    case "image":
    default: {
      const params = new URLSearchParams();
      if (item.prompt) params.set("prompt", item.prompt);
      if (item.aspectRatio) params.set("ar", item.aspectRatio);
      if (item.quality) params.set("quality", item.quality);
      if (item.id) params.set("recipe", item.id);
      if (item.inputRequirement === "image-required" || item.inputRequirement === "image-optional") {
        params.set("mode", "i2i");
      } else {
        params.set("mode", "t2i");
      }
      const q = params.toString();
      return q ? `/studio/image?${q}` : "/studio/image";
    }
  }
}
