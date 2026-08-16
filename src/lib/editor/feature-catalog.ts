/**
 * Image Editor feature architecture map.
 * Tools remain available in the existing editor; this catalog classifies
 * how each tool is implemented today and the safe upgrade path.
 *
 * Categories:
 * A — Real interactive feature (dedicated UI + non-prompt path)
 * B — Backend/model feature (quality, size, model routing)
 * C — Prompt-only (genuinely needs user/language prompt via FAL edit)
 * D — UI-only (client transform, no generation)
 * E — Advertised / partial (UI present; deeper wiring still needed)
 */

export type FeatureKind = "A" | "B" | "C" | "D" | "E";

export type FeatureEntry = {
  id: string;
  label: string;
  kind: FeatureKind;
  /** How the existing editor handles this today */
  current: string;
  /** Safe next step without rewriting the 1300-line editor core */
  upgradePath: string;
};

export const IMAGE_FEATURE_CATALOG: FeatureEntry[] = [
  {
    id: "circle-remove",
    label: "Circle to Remove",
    kind: "A",
    current: "SmartRemoveModal + mask → generateMedia inpaint",
    upgradePath: "Keep; already real interactive",
  },
  {
    id: "crop",
    label: "Crop",
    kind: "D",
    current: "ImageCropModal client crop; no FAL call",
    upgradePath: "Keep; optional aspect presets already in modal",
  },
  {
    id: "image-quality",
    label: "Output quality HD/2K/4K",
    kind: "B",
    current: "imageQuality → generateMedia → Topaz upscale factor",
    upgradePath: "Surface earlier in control hierarchy via OutputQualitySelector",
  },
  {
    id: "aspect-ratio",
    label: "Aspect ratio",
    kind: "B",
    current: "text-to-image only; aspectToImageSize in generate",
    upgradePath: "AspectRatioSelector component; same backend path",
  },
  {
    id: "auto-edit",
    label: "Auto Edit",
    kind: "A",
    current: "Was prompt preset; now dedicated /studio/image/auto-edit",
    upgradePath: "Analyze → select improvements → generateMedia",
  },
  {
    id: "remove-object",
    label: "Remove object",
    kind: "C",
    current: "Prompt preset → image edit pipeline",
    upgradePath: "Optional region UI later; prompt path remains valid",
  },
  {
    id: "add-object",
    label: "Add object",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Needs user description; keep prompt-primary",
  },
  {
    id: "replace-object",
    label: "Replace object",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Needs user description",
  },
  {
    id: "expand",
    label: "Expand / Outpaint",
    kind: "C",
    current: "Prompt preset → edit model",
    upgradePath: "Dedicated outpaint size controls when model supports canvas",
  },
  {
    id: "rotate",
    label: "Straighten",
    kind: "E",
    current: "Prompt-only; true geometry rotate is client-side possible",
    upgradePath: "Client rotate utility + optional AI refine",
  },
  {
    id: "flip",
    label: "Flip",
    kind: "E",
    current: "Prompt-only; true flip is client canvas",
    upgradePath: "Client flip before generate",
  },
  {
    id: "remove-bg",
    label: "Remove background",
    kind: "C",
    current: "Prompt → enhancement/edit routing",
    upgradePath: "Optional dedicated bg model endpoint if product adds one",
  },
  {
    id: "replace-bg",
    label: "Replace background",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Scene picker UI + prompt composition",
  },
  {
    id: "blur-bg",
    label: "Blur background",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Keep prompt; optional strength slider composed into prompt",
  },
  {
    id: "extend-bg",
    label: "Extend background",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Same as outpaint",
  },
  {
    id: "clean-bg",
    label: "Clean background",
    kind: "C",
    current: "Prompt preset",
    upgradePath: "Keep",
  },
  {
    id: "enhance",
    label: "Enhance quality",
    kind: "B",
    current: "isEnhancementOnly → enhancement pipeline",
    upgradePath: "Already backend-aware via fal-request classifiers",
  },
  {
    id: "upscale",
    label: "AI Upscale",
    kind: "B",
    current: "Prompt + quality tier upscale",
    upgradePath: "Prefer imageQuality control over prompt-only upscale",
  },
  {
    id: "sharpen",
    label: "Sharpen",
    kind: "C",
    current: "Prompt / enhance routing",
    upgradePath: "Keep",
  },
  {
    id: "deblur",
    label: "Deblur",
    kind: "C",
    current: "Prompt / enhance",
    upgradePath: "Keep",
  },
  {
    id: "denoise",
    label: "Denoise",
    kind: "C",
    current: "Prompt / enhance",
    upgradePath: "Keep",
  },
  {
    id: "hdr",
    label: "HDR Enhancement",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "fix-lighting",
    label: "Fix lighting",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "fix-exposure",
    label: "Fix exposure",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "restore",
    label: "Restore photo",
    kind: "C",
    current: "Prompt / enhance",
    upgradePath: "Keep",
  },
  {
    id: "color-correct",
    label: "Color correction",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "colorize",
    label: "Colorize",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "artifacts",
    label: "Reduce artifacts",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "face-enhance",
    label: "Face enhancement",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "skin",
    label: "Skin smoothing",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "portrait-retouch",
    label: "Portrait retouch",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "eye-enhance",
    label: "Eye enhancement",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "hair",
    label: "Hair enhancement",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "portrait-light",
    label: "Lighting correction",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "red-eye",
    label: "Red eye correction",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "outfit",
    label: "Change clothing",
    kind: "C",
    current: "Prompt — requires user description",
    upgradePath: "Keep prompt-primary",
  },
  {
    id: "replace-outfit",
    label: "Replace outfit",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "clothing-color",
    label: "Clothing color",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "clothing-style",
    label: "Clothing style",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "style-transfer",
    label: "Style transfer",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "anime",
    label: "Anime",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "illustration",
    label: "Illustration",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "product",
    label: "Product photography",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "film-look",
    label: "Film look",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "vintage",
    label: "Vintage",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "bw",
    label: "Black & White",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
  {
    id: "cartoon",
    label: "Cartoon",
    kind: "C",
    current: "Prompt",
    upgradePath: "Keep",
  },
];

export function featuresByKind(kind: FeatureKind): FeatureEntry[] {
  return IMAGE_FEATURE_CATALOG.filter((f) => f.kind === kind);
}
