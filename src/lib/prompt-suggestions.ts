// Prompt intelligence for the editor.
// Framework-free so it can be unit-tested without React.
//
// Two surfaces feed the existing chip UI in the editor:
//   • EXAMPLE_PROMPTS — shown when the prompt box is empty (a curated tour
//     of every major editing capability).
//   • getSmartSuggestions(input) — keyword-triggered follow-ups shown as
//     the user types, so a one-word idea becomes a great prompt.
//
// All presets below produce prompts that the existing FAL routing in
// src/lib/fal-request.ts already understands (edit intent detection, size
// classifier, enhancement-only path, inpainting, text-to-image / text-to-
// video). No new backend endpoints required — the routing picks the right
// model based on the words in the prompt.

export type Suggestion = { label: string; prompt: string };

// Curated tour of the platform's editing tools, grouped by intent but
// rendered as a single flat chip list to match the existing UI.
export const EXAMPLE_PROMPTS: Suggestion[] = [
  // Core photo edits
  { label: "Remove background", prompt: "Remove the background completely, keep only the main subject with clean, precise edges, transparent or clean white background." },
  { label: "Replace background", prompt: "Replace the background with a clean professional studio backdrop while keeping the subject perfectly sharp and naturally lit." },
  { label: "Sky replacement", prompt: "Replace the sky with a dramatic golden-hour sky and re-light the scene so shadows and color temperature match the new sky." },
  { label: "Blur background", prompt: "Apply a natural DSLR-style bokeh blur to only the background, keeping the subject perfectly sharp for a professional portrait look." },
  { label: "Remove people", prompt: "Remove every visible person and human figure from the image, seamlessly reconstruct the background with matching texture, lighting and perspective." },
  { label: "Remove object", prompt: "Remove the unwanted object and inpaint the area naturally so it blends with the surrounding background." },
  { label: "Magic eraser", prompt: "Erase distractions, stray objects, wires, poles and clutter from the image and reconstruct the background cleanly." },
  { label: "Remove watermark", prompt: "Remove all watermarks, text overlays and logos and reconstruct the underlying image cleanly." },
  { label: "Generative fill", prompt: "Extend and fill the empty areas of the image with content that matches the existing scene in style, lighting and perspective." },
  { label: "Expand / outpaint", prompt: "Outpaint and extend the scene beyond the current frame with realistic content that continues the composition, lighting and perspective." },

  // Portrait retouch
  { label: "Face enhance", prompt: "Enhance the face with natural detail, sharpen eyes, restore skin texture and improve overall clarity while preserving identity exactly." },
  { label: "Skin smoothing", prompt: "Smooth the skin naturally, remove blemishes and even out skin tone while keeping realistic texture and preserving identity." },
  { label: "Teeth whitening", prompt: "Whiten the teeth naturally without changing anything else in the image." },
  { label: "Eye enhancement", prompt: "Enhance the eyes: sharpen the irises, brighten the whites naturally, improve catchlights while keeping the face and identity exactly the same." },
  { label: "Portrait retouch", prompt: "Professional portrait retouch: even skin tone, subtle skin smoothing with natural texture, enhance eyes and lips, balance lighting, preserve identity." },
  { label: "AI headshot", prompt: "Transform this into a professional corporate headshot with clean studio lighting, neutral background and sharp business attire while preserving the person's exact face and identity." },
  { label: "AI avatar", prompt: "Create a polished stylised profile avatar of the person with clean lighting and a simple background, preserving their exact facial identity." },

  // Quality & restoration
  { label: "Enhance quality", prompt: "Enhance overall quality, sharpness, clarity and fine detail to a professional standard while preserving composition and colors." },
  { label: "AI upscale HD", prompt: "Upscale to HD with peak detail, sharpen and recover fine textures while preserving colors and composition exactly." },
  { label: "Sharpen", prompt: "Sharpen the image with strong smart sharpening, enhance edges and micro-detail without introducing halos or noise." },
  { label: "Denoise", prompt: "Remove noise and grain while preserving detail, edges and natural texture." },
  { label: "Deblur", prompt: "Unblur and deblur the image, recover sharp edges and fine detail from motion or focus blur." },
  { label: "Restore old photo", prompt: "Restore this old photo: repair scratches, tears, stains and fading, denoise, recover detail and improve clarity while keeping the original content intact." },
  { label: "Scratch removal", prompt: "Remove scratches, dust, tears and creases from the photo and reconstruct the affected areas naturally." },
  { label: "Colorize", prompt: "Add natural, realistic and historically plausible colors to this image while preserving all original shapes, composition and detail." },

  // Color, light, HDR
  { label: "Color correction", prompt: "Apply professional color correction: fix white balance, exposure and contrast for a clean, natural look." },
  { label: "Color grading", prompt: "Apply cinematic color grading with rich shadows, warm highlights and a filmic contrast curve." },
  { label: "Fix lighting", prompt: "Fix and balance the lighting for a natural, well-exposed result, lift shadows and control highlights." },
  { label: "HDR enhance", prompt: "Apply HDR enhancement: expand dynamic range, recover shadow and highlight detail, boost local contrast for a rich, punchy look." },
  { label: "AI relight", prompt: "Relight the scene with soft, cinematic key lighting from the upper left, gentle fill and a subtle rim light, keeping the subject and composition unchanged." },
  { label: "Make cinematic", prompt: "Make this cinematic with dramatic lighting, rich color grading, film-like depth and a subtle anamorphic feel." },

  // Styles
  { label: "Anime style", prompt: "Transform this into a high-quality anime illustration with clean line art, vibrant colors and expressive shading while preserving the composition." },
  { label: "Cartoon style", prompt: "Transform this into a modern cartoon illustration with bold outlines, flat shading and vibrant colors while preserving the composition." },
  { label: "Pencil sketch", prompt: "Convert this into a detailed hand-drawn pencil sketch with realistic graphite shading, cross-hatching and paper texture." },
  { label: "Oil painting", prompt: "Repaint this as a classical oil painting with rich brush strokes, layered color and canvas texture." },
  { label: "Watercolor", prompt: "Repaint this as a soft watercolor illustration with translucent washes, wet edges and paper texture." },
  { label: "3D render", prompt: "Reimagine this as a stylised 3D render with soft global illumination, subtle subsurface scattering and clean studio lighting." },

  // Generators
  { label: "Sticker", prompt: "Create a die-cut sticker illustration of the subject with a thick white outline, bold flat colors and a transparent background." },
  { label: "Logo", prompt: "Design a clean modern minimalist vector logo based on this concept, centered on a plain background, with strong shape language and balanced negative space." },
  { label: "Product photo", prompt: "Professional e-commerce product photo of this item on a clean white studio background with soft even lighting, subtle shadow and sharp focus." },
  { label: "Thumbnail", prompt: "Design an eye-catching YouTube thumbnail based on this scene with bold contrast, dramatic lighting, clear focal subject and space for large title text." },
  { label: "Social post", prompt: "Design a polished square social media post based on this scene with balanced composition, vibrant color grading and clean space for a short headline." },
];

// Smart, keyword-triggered suggestions. When the user types a trigger word
// the editor surfaces tailored follow-ups so a single word becomes a strong,
// specific prompt that routes to the right FAL model.
const SMART_RULES: { match: RegExp; suggestions: Suggestion[] }[] = [
  {
    match: /\b(remove|erase|delete|clean(up)?|magic)\b/i,
    suggestions: [
      { label: "Remove people", prompt: "Remove every visible person and human figure from the image, seamlessly reconstruct the background with matching texture, lighting and perspective." },
      { label: "Remove object", prompt: "Remove the unwanted object and inpaint the area naturally so it blends with the surrounding background." },
      { label: "Remove background", prompt: "Remove the background completely, keep only the main subject with clean, precise edges." },
      { label: "Remove watermark", prompt: "Remove all watermarks, text overlays and logos and reconstruct the underlying image cleanly." },
      { label: "Magic eraser", prompt: "Erase distractions, stray objects, wires, poles and clutter and reconstruct the background cleanly." },
    ],
  },
  {
    match: /\b(background|bg|backdrop|sky|scene|environment)\b/i,
    suggestions: [
      { label: "Replace background", prompt: "Replace the background with a clean professional studio backdrop while keeping the subject perfectly sharp." },
      { label: "Blur background", prompt: "Apply a natural DSLR-style bokeh blur to only the background, keeping the subject perfectly sharp." },
      { label: "Sky replacement", prompt: "Replace the sky with a dramatic golden-hour sky and re-light the scene so shadows and color temperature match." },
      { label: "Outdoor scene", prompt: "Replace the background with a soft-focus outdoor golden-hour scene while keeping the subject perfectly sharp." },
    ],
  },
  {
    match: /\b(expand|outpaint|extend|fill|wider|taller)\b/i,
    suggestions: [
      { label: "Generative fill", prompt: "Extend and fill the empty areas of the image with content that matches the existing scene in style, lighting and perspective." },
      { label: "Outpaint scene", prompt: "Outpaint and extend the scene beyond the current frame with realistic content that continues composition, lighting and perspective." },
    ],
  },
  {
    match: /\b(face|portrait|skin|eye|eyes|teeth|smile|lips|beauty|retouch|headshot|avatar)\b/i,
    suggestions: [
      { label: "Face enhance", prompt: "Enhance the face with natural detail, sharpen eyes, restore skin texture and improve overall clarity while preserving identity exactly." },
      { label: "Skin smoothing", prompt: "Smooth the skin naturally, remove blemishes and even out skin tone while keeping realistic texture and preserving identity." },
      { label: "Teeth whitening", prompt: "Whiten the teeth naturally without changing anything else in the image." },
      { label: "Eye enhancement", prompt: "Enhance the eyes: sharpen the irises, brighten the whites naturally, improve catchlights while keeping the face exactly the same." },
      { label: "Pro headshot", prompt: "Transform this into a professional corporate headshot with clean studio lighting, neutral background and sharp business attire while preserving identity." },
      { label: "AI avatar", prompt: "Create a polished stylised profile avatar of the person with clean lighting and a simple background, preserving facial identity." },
    ],
  },
  {
    match: /\b(enhance|improve|upscale|hd|4k|8k|sharpen|clarity|quality|detail|deblur|unblur|denoise|noise|restore|repair|fix|old|scratch|colori[sz]e)\b/i,
    suggestions: [
      { label: "Enhance HD", prompt: "Enhance sharpness, detail and clarity to a professional HD standard while preserving composition and colors." },
      { label: "Upscale to 4K", prompt: "Upscale to 4K with peak detail, sharpen and recover fine textures while preserving colors and composition exactly." },
      { label: "Denoise", prompt: "Remove noise and grain while preserving detail, edges and natural texture." },
      { label: "Deblur", prompt: "Unblur and deblur the image, recover sharp edges and fine detail from motion or focus blur." },
      { label: "Restore old photo", prompt: "Restore this old photo: repair scratches, tears and fading, denoise and recover detail while keeping content intact." },
      { label: "Colorize", prompt: "Add natural, realistic colors to this image while preserving all original shapes and composition." },
    ],
  },
  {
    match: /\b(light|lighting|relight|hdr|color|colour|grade|grading|expose|exposure|contrast|cinematic|film|mood)\b/i,
    suggestions: [
      { label: "Color correction", prompt: "Apply professional color correction: fix white balance, exposure and contrast for a clean natural look." },
      { label: "Cinematic grade", prompt: "Apply cinematic color grading with rich shadows, warm highlights and a filmic contrast curve." },
      { label: "HDR enhance", prompt: "Apply HDR enhancement: expand dynamic range, recover shadow and highlight detail, boost local contrast." },
      { label: "AI relight", prompt: "Relight the scene with soft cinematic key light from the upper left, gentle fill and subtle rim light, keeping composition unchanged." },
      { label: "Fix lighting", prompt: "Fix and balance the lighting for a natural, well-exposed result." },
    ],
  },
  {
    match: /\b(anime|cartoon|sketch|drawing|pencil|paint|painting|oil|watercolor|watercolour|3d|render|style|stylise|stylize|artistic)\b/i,
    suggestions: [
      { label: "Anime", prompt: "Transform this into a high-quality anime illustration with clean line art, vibrant colors and expressive shading while preserving composition." },
      { label: "Cartoon", prompt: "Transform this into a modern cartoon illustration with bold outlines, flat shading and vibrant colors while preserving composition." },
      { label: "Pencil sketch", prompt: "Convert this into a detailed pencil sketch with realistic graphite shading, cross-hatching and paper texture." },
      { label: "Oil painting", prompt: "Repaint this as a classical oil painting with rich brush strokes, layered color and canvas texture." },
      { label: "Watercolor", prompt: "Repaint this as a soft watercolor illustration with translucent washes, wet edges and paper texture." },
      { label: "3D render", prompt: "Reimagine this as a stylised 3D render with soft global illumination and clean studio lighting." },
    ],
  },
  {
    match: /\b(sticker|logo|product|thumbnail|social|post|banner|poster|icon)\b/i,
    suggestions: [
      { label: "Sticker", prompt: "Create a die-cut sticker illustration of the subject with a thick white outline, bold flat colors and a transparent background." },
      { label: "Logo", prompt: "Design a clean modern minimalist vector logo based on this concept, centered on a plain background with strong shape language." },
      { label: "Product photo", prompt: "Professional e-commerce product photo of this item on a clean white studio background with soft even lighting and a subtle shadow." },
      { label: "YT thumbnail", prompt: "Design an eye-catching YouTube thumbnail with bold contrast, dramatic lighting, clear focal subject and space for large title text." },
      { label: "Social post", prompt: "Design a polished square social media post with balanced composition, vibrant color grading and clean space for a short headline." },
    ],
  },
  {
    match: /\b(replace|change|swap|convert|turn|make)\b/i,
    suggestions: [
      { label: "Replace background", prompt: "Replace the background with a clean professional backdrop while keeping the subject sharp." },
      { label: "Change colors", prompt: "Change the color palette to a warm, cinematic tone while keeping the composition and subject unchanged." },
      { label: "Change outfit", prompt: "Change the outfit to elegant professional attire while keeping the face and identity unchanged." },
      { label: "Make cinematic", prompt: "Make this cinematic with dramatic lighting, film-style color grading and rich depth." },
      { label: "Make realistic", prompt: "Make this look photorealistic with natural lighting, textures and detail." },
    ],
  },
];

export function getSmartSuggestions(input: string): Suggestion[] {
  const text = input.trim();
  if (!text) return [];
  for (const rule of SMART_RULES) {
    if (rule.match.test(text)) return rule.suggestions;
  }
  return [];
}

// ── Aspect ratio (text-to-image) ──────────────────────────────────
// Standard/Premium: 1:1, 4:3, 16:9, 9:16, 3:4
// Ultra also supports IMAX (21:9) when UI exposes it.
export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "imax";

export const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "imax", label: "IMAX" },
];

export function aspectToImageSize(aspect: AspectRatio | undefined): string {
  switch (aspect) {
    case "4:3":
      return "landscape_4_3";
    case "16:9":
      return "landscape_16_9";
    case "9:16":
      return "portrait_16_9";
    case "3:4":
      return "portrait_4_3";
    case "imax":
      return "landscape_16_9"; // closest documented fal size; Ultra may refine server-side
    case "1:1":
    default:
      return "square_hd";
  }
}
