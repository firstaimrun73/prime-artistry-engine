// Prompt intelligence for the editor.
// Framework-free so it can be unit-tested without React.

export type Suggestion = { label: string; prompt: string };

export const EXAMPLE_PROMPTS: Suggestion[] = [
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
  { label: "Face enhance", prompt: "Enhance the face with natural detail, sharpen eyes, restore skin texture and improve overall clarity while preserving identity exactly." },
  { label: "Skin smoothing", prompt: "Smooth the skin naturally, remove blemishes and even out skin tone while keeping realistic texture and preserving identity." },
  { label: "Teeth whitening", prompt: "Whiten the teeth naturally without changing anything else in the image." },
  { label: "Eye enhancement", prompt: "Enhance the eyes: sharpen the irises, brighten the whites naturally, improve catchlights while keeping the face and identity exactly the same." },
  { label: "Portrait retouch", prompt: "Professional portrait retouch: even skin tone, subtle skin smoothing with natural texture, enhance eyes and lips, balance lighting, preserve identity." },
  { label: "AI headshot", prompt: "Transform this into a professional corporate headshot with clean studio lighting, neutral background and sharp business attire while preserving the person's exact face and identity." },
  { label: "AI avatar", prompt: "Create a polished stylised profile avatar of the person with clean lighting and a simple background, preserving their exact facial identity." },
  { label: "Enhance quality", prompt: "Enhance overall quality, sharpness, clarity and fine detail to a professional standard while preserving composition and colors." },
  { label: "AI upscale HD", prompt: "Upscale to HD with peak detail, sharpen and recover fine textures while preserving colors and composition exactly." },
  { label: "Sharpen", prompt: "Sharpen the image with strong smart sharpening, enhance edges and micro-detail without introducing halos or noise." },
  { label: "Denoise", prompt: "Remove noise and grain while preserving detail, edges and natural texture." },
  { label: "Deblur", prompt: "Unblur and deblur the image, recover sharp edges and fine detail from motion or focus blur." },
  { label: "Restore old photo", prompt: "Restore this old photo: repair scratches, tears, stains and fading, denoise, recover detail and improve clarity while keeping the original content intact." },
  { label: "Scratch removal", prompt: "Remove scratches, dust, tears and creases from the photo and reconstruct the affected areas naturally." },
  { label: "Colorize", prompt: "Add natural, realistic and historically plausible colors to this image while preserving all original shapes, composition and detail." },
  { label: "Color correction", prompt: "Apply professional color correction: fix white balance, exposure and contrast for a clean, natural look." },
  { label: "Color grading", prompt: "Apply cinematic color grading with rich shadows, warm highlights and a filmic contrast curve." },
  { label: "Fix lighting", prompt: "Fix and balance the lighting for a natural, well-exposed result, lift shadows and control highlights." },
  { label: "HDR enhance", prompt: "Apply HDR enhancement: expand dynamic range, recover shadow and highlight detail, boost local contrast for a rich, punchy look." },
  { label: "AI relight", prompt: "Relight the scene with soft, cinematic key lighting from the upper left, gentle fill and a subtle rim light, keeping the subject and composition unchanged." },
  { label: "Make cinematic", prompt: "Make this cinematic with dramatic lighting, rich color grading, film-like depth and a subtle anamorphic feel." },
  { label: "Anime style", prompt: "Transform this into a high-quality anime illustration with clean line art, vibrant colors and expressive shading while preserving the composition." },
  { label: "Cartoon style", prompt: "Transform this into a modern cartoon illustration with bold outlines, flat shading and vibrant colors while preserving the composition." },
  { label: "Pencil sketch", prompt: "Convert this into a detailed hand-drawn pencil sketch with realistic graphite shading, cross-hatching and paper texture." },
  { label: "Oil painting", prompt: "Repaint this as a classical oil painting with rich brush strokes, layered color and canvas texture." },
  { label: "Watercolor", prompt: "Repaint this as a soft watercolor illustration with translucent washes, wet edges and paper texture." },
  { label: "3D render", prompt: "Reimagine this as a stylised 3D render with soft global illumination, subtle subsurface scattering and clean studio lighting." },
  { label: "Sticker", prompt: "Create a die-cut sticker illustration of the subject with a thick white outline, bold flat colors and a transparent background." },
  { label: "Logo", prompt: "Design a clean modern minimalist vector logo based on this concept, centered on a plain background, with strong shape language and balanced negative space." },
  { label: "Product photo", prompt: "Professional e-commerce product photo of this item on a clean white studio background with soft even lighting, subtle shadow and sharp focus." },
  { label: "Thumbnail", prompt: "Design an eye-catching YouTube thumbnail based on this scene with bold contrast, dramatic lighting, clear focal subject and space for large title text." },
  { label: "Social post", prompt: "Design a polished square social media post based on this scene with balanced composition, vibrant color grading and clean space for a short headline." },

  // --- expanded catalogue (rotation pool ≥100) ---
  { label: "Cinematic portrait", prompt: "Create a cinematic portrait with dramatic side lighting, shallow depth of field, rich color grading and a filmic look." },
  { label: "Family portrait", prompt: "Create a warm natural family portrait with soft window light, genuine expressions and a clean uncluttered background." },
  { label: "Travel photo", prompt: "Enhance this travel photo with vibrant natural colors, balanced exposure and a sense of place while keeping the scene realistic." },
  { label: "Fashion editorial", prompt: "Transform into a high-fashion editorial image with bold styling, crisp detail, premium lighting and magazine-cover polish." },
  { label: "Product hero", prompt: "Create a premium product hero shot on a clean minimal surface with soft studio lighting, subtle reflection and sharp focus." },
  { label: "Food photography", prompt: "Style as appetizing food photography with natural light, rich textures, shallow depth of field and fresh vibrant colors." },
  { label: "Nature landscape", prompt: "Create a sweeping nature landscape with dramatic sky, balanced exposure, vivid yet natural colors and strong depth." },
  { label: "Architecture", prompt: "Photograph architecture with clean lines, balanced perspective, crisp detail and sophisticated contrast." },
  { label: "Wedding moment", prompt: "Create a romantic wedding photograph with soft golden light, elegant composition and timeless color grading." },
  { label: "Lifestyle", prompt: "Create a natural lifestyle image with candid energy, soft daylight and authentic everyday atmosphere." },
  { label: "Profile photo", prompt: "Create a professional profile portrait with flattering light, clean background and natural skin texture." },
  { label: "Fantasy scene", prompt: "Create a refined fantasy scene with magical atmosphere, cinematic lighting and detailed environment without clutter." },
  { label: "Futuristic city", prompt: "Create a futuristic city vista with neon accents, atmospheric haze, sharp architecture and cinematic color grade." },
  { label: "Vintage film", prompt: "Apply a vintage film look with gentle grain, warm tones, soft contrast and nostalgic character." },
  { label: "Luxury brand", prompt: "Create a luxury brand visual with refined composition, premium materials, elegant lighting and minimal distraction." },
  { label: "Studio portrait", prompt: "Create a clean studio portrait with controlled lighting, soft background falloff and natural skin detail." },
  { label: "Pet portrait", prompt: "Create a sharp pet portrait with catchlights in the eyes, soft background blur and natural fur texture." },
  { label: "Car showcase", prompt: "Create a premium automotive showcase with dramatic reflections, crisp body lines and cinematic lighting." },
  { label: "Interior design", prompt: "Photograph an interior space with balanced ambient light, true-to-life colors and inviting composition." },
  { label: "Seasonal autumn", prompt: "Create an autumn scene with warm golden foliage, soft directional light and cozy atmosphere." },
  { label: "Seasonal winter", prompt: "Create a winter scene with cool clean light, soft snow texture and calm atmospheric depth." },
  { label: "Object remove", prompt: "Remove the distracting object cleanly and reconstruct the background so the edit is invisible." },
  { label: "People remove", prompt: "Remove all people from the scene and reconstruct the background naturally with matching light and texture." },
  { label: "Background swap", prompt: "Replace the background with a clean professional environment while matching subject lighting and edge detail." },
  { label: "Relight soft", prompt: "Relight the subject with soft diffused key light, gentle fill and natural shadow transitions." },
  { label: "Relight dramatic", prompt: "Relight with dramatic cinematic contrast, controlled highlights and deep but detailed shadows." },
  { label: "Color grade teal", prompt: "Apply a cinematic teal-and-orange color grade while preserving natural skin tones and highlight detail." },
  { label: "Color grade warm", prompt: "Warm the color grade with golden tones, soft contrast and a welcoming lifestyle feel." },
  { label: "Restore photo", prompt: "Restore this damaged photo: repair scratches, recover faded detail, balance tones and keep identity faithful." },
  { label: "Enhance detail", prompt: "Enhance fine detail and micro-contrast while keeping skin and textures natural, no harsh oversharpening." },
  { label: "Poster design", prompt: "Create a bold poster composition with strong focal hierarchy, dramatic lighting and space for title text." },
  { label: "Ad creative", prompt: "Create a polished advertising visual with premium product presence, clean negative space and persuasive lighting." },
  { label: "Social story", prompt: "Compose a vertical social story frame with clear subject focus, balanced margins and vibrant grading." },
  { label: "Flat lay", prompt: "Create an organized flat-lay product arrangement with even overhead light, tidy composition and soft shadows." },
  { label: "Macro detail", prompt: "Create a macro detail shot with razor focus on texture, soft bokeh and tactile realism." },
  { label: "Night city", prompt: "Create a night city scene with controlled highlights, glowing lights, deep blues and cinematic atmosphere." },
  { label: "Beach golden hour", prompt: "Create a golden-hour beach scene with warm sunlight, soft reflections and relaxed lifestyle mood." },
  { label: "Mountain vista", prompt: "Create a mountain vista with layered depth, crisp peaks, atmospheric haze and balanced exposure." },
  { label: "Street style", prompt: "Create a street-style fashion frame with authentic urban backdrop, natural light and confident pose energy." },
  { label: "Beauty close-up", prompt: "Create a beauty close-up with flawless yet natural skin texture, precise eyes and soft glam lighting." },
  { label: "Black and white", prompt: "Convert to refined black and white with rich tonal range, deep blacks and luminous highlights." },
  { label: "Matte finish", prompt: "Apply a modern matte finish with soft contrast, muted highlights and contemporary color polish." },
  { label: "High key", prompt: "Create a high-key bright image with airy whites, soft shadows and clean minimal aesthetic." },
  { label: "Low key", prompt: "Create a low-key image with deep shadows, selective highlights and dramatic mood." },
  { label: "Reflection water", prompt: "Add natural water reflections that match perspective, light direction and scene color." },
  { label: "Fog atmosphere", prompt: "Add soft atmospheric fog that enhances depth without washing out the subject." },
  { label: "Rain mood", prompt: "Add subtle rain atmosphere with wet surfaces, soft specular highlights and moody depth." },
  { label: "Studio product", prompt: "Place the product in a premium studio setup with seamless backdrop, softboxes and crisp brand-ready detail." },
  { label: "Before after clean", prompt: "Clean and modernize the image: fix exposure, color, and clutter while keeping the original composition." },
  { label: "Identity preserve", prompt: "Edit carefully while strictly preserving the person identity, facial structure and natural expression." },
  { label: "Outfit change", prompt: "Change the outfit to a stylish alternative that fits body shape, pose and scene lighting." },
  { label: "Hair restyle", prompt: "Restyle the hair naturally with realistic strands, volume and lighting consistent with the scene." },
  { label: "Eye color", prompt: "Adjust eye color subtly while keeping catchlights, moisture and realism intact." },
  { label: "Smile refine", prompt: "Refine the expression toward a natural confident smile without changing identity." },
  { label: "Skin natural", prompt: "Retouch skin softly: even tone, keep pores and texture, avoid plastic look." },
  { label: "Teeth natural", prompt: "Brighten teeth slightly in a natural way without over-whitening or changing shape." },
  { label: "Sky drama", prompt: "Replace the sky with a dramatic but believable sky and match ground lighting and reflections." },
  { label: "Clean background", prompt: "Simplify the background, reduce clutter and keep subject separation clear and natural." },
  { label: "Add bokeh", prompt: "Increase background bokeh smoothly while keeping the subject tack sharp." },
  { label: "Perspective fix", prompt: "Correct perspective distortion on architecture while preserving realism and proportions." },
  { label: "Crop reframe", prompt: "Reframe the composition for a stronger focal point and balanced negative space." },
  { label: "Text space", prompt: "Recompose with clean negative space suitable for a short headline overlay." },
  { label: "Brand color", prompt: "Grade the image toward a cohesive brand palette while keeping subjects natural." },
  { label: "Metallic shine", prompt: "Enhance metallic surfaces with realistic specular highlights and controlled reflections." },
  { label: "Glass refraction", prompt: "Render glass with believable refraction, reflections and edge highlights." },
  { label: "Fabric detail", prompt: "Enhance fabric weave and soft folds with natural shading and tactile realism." },
  { label: "Wood texture", prompt: "Bring out natural wood grain and warm material depth without oversharpening." },
  { label: "Jewelry sparkle", prompt: "Enhance jewelry sparkle with precise highlights while avoiding blown-out glare." },
  { label: "Watch macro", prompt: "Create a luxury watch macro with crisp dial detail, controlled reflections and premium lighting." },
  { label: "Sneaker product", prompt: "Create a clean sneaker product shot with dynamic angle, crisp materials and soft studio light." },
  { label: "Cosmetic flat", prompt: "Create a cosmetic flat-lay with elegant arrangement, soft shadows and refined color harmony." },
  { label: "Book cover", prompt: "Design a striking book-cover image with strong mood, clear focal subject and space for title typography." },
  { label: "Album art", prompt: "Create album-art imagery with bold concept, emotional lighting and memorable composition." },
  { label: "Game key art", prompt: "Create cinematic game key art with heroic subject, dynamic light and high production polish." },
  { label: "Sci-fi portrait", prompt: "Create a sci-fi character portrait with advanced wardrobe, subtle tech details and cinematic grade." },
  { label: "Historical look", prompt: "Restyle the scene with a believable historical period look: wardrobe, palette and atmosphere." },
  { label: "Minimal product", prompt: "Create a minimal product composition with abundant negative space, soft light and quiet luxury." },
  { label: "Action freeze", prompt: "Capture a frozen action moment with sharp subject motion clarity and dynamic energy." },
  { label: "Soft romance", prompt: "Create a soft romantic image with gentle light bloom, warm tones and intimate framing." },
  { label: "Corporate headshot", prompt: "Create a corporate headshot with even professional lighting, clean backdrop and confident expression." },
  { label: "Creator thumbnail", prompt: "Create a high-contrast creator thumbnail with expressive subject, vivid grade and clear focal hierarchy." },
  { label: "Real estate", prompt: "Enhance a real-estate interior: bright balanced light, true colors, tidy space and inviting depth." },
  { label: "Menu food", prompt: "Style food for a restaurant menu: appetizing color, crisp texture and clean presentation." },
  { label: "Event highlight", prompt: "Create an event highlight frame with energetic atmosphere, flattering light and clear subjects." },
  { label: "Sports energy", prompt: "Create a sports image with dynamic energy, sharp athlete focus and powerful contrast." },
  { label: "Yoga calm", prompt: "Create a calm wellness image with soft natural light, serene palette and balanced composition." },
  { label: "Coffee lifestyle", prompt: "Create a cozy coffee lifestyle scene with warm tones, soft morning light and inviting detail." },
  { label: "Desk setup", prompt: "Create a clean desk setup flat-lay with organized tech, soft overhead light and modern minimal style." },
  { label: "Plant green", prompt: "Enhance indoor plants with fresh greens, soft daylight and natural leaf texture." },
  { label: "Sunset silhouette", prompt: "Create a sunset silhouette with rich sky gradient, clean subject outline and atmospheric depth." },
  { label: "Blue hour", prompt: "Create a blue-hour city mood with cool ambient light, gentle artificial glow and quiet atmosphere." },
  { label: "Mist forest", prompt: "Create a misty forest scene with layered trees, soft volumetric light and peaceful depth." },
  { label: "Desert heat", prompt: "Create a desert landscape with heat haze, golden light, textured sand and vast scale." },
  { label: "Ocean clarity", prompt: "Create clear ocean water with turquoise depth, soft waves and bright natural daylight." },
  { label: "Snow portrait", prompt: "Create a winter portrait with soft snow bokeh, cool clean light and warm skin tones." },
  { label: "Rainy street", prompt: "Create a rainy street scene with reflective pavement, soft neon glow and cinematic mood." },
  { label: "Market color", prompt: "Create a vibrant market scene with rich color, layered depth and lively but orderly composition." },
  { label: "Library quiet", prompt: "Create a quiet library interior with warm practical lights, soft contrast and cozy intellectual mood." },
  { label: "Museum light", prompt: "Create a museum gallery scene with controlled exhibit lighting, clean architecture and refined atmosphere." },
  { label: "Workshop craft", prompt: "Create a craft workshop scene with tactile materials, practical light and authentic maker details." },
  { label: "Garden bloom", prompt: "Create a blooming garden scene with natural color variety, soft daylight and gentle depth of field." },
  { label: "Rooftop view", prompt: "Create a rooftop city view with expansive skyline, balanced exposure and late-day atmosphere." },
  { label: "Bridge long", prompt: "Create a long-exposure bridge scene with smooth water, crisp structure and tranquil night mood." },
  { label: "Custom ratio hint", prompt: "Create a wide cinematic frame approximately 2.35:1 with balanced composition and filmic color." },
];

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

// Aspect ratio (text-to-image). Ultra also supports IMAX at 1.43:1.
// 21:9 is normal ultra-wide — never treated as IMAX.
export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax" | "custom";

export const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "21:9", label: "21:9" },
  { id: "imax", label: "IMAX 1.43:1" },
  { id: "custom", label: "Custom" },
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
    case "21:9":
      // Normal ultra-wide — not IMAX. Closest preset; Ultra/Premium may use custom dims.
      return "landscape_16_9";
    case "imax":
      // IMAX 1.43:1 — closest fal landscape size; Ultra may refine server-side
      return "landscape_16_9";
    case "1:1":
    default:
      return "square_hd";
  }
}

/** Session-stable rotated subset for Image Studio "Try" chips. No network. */
export function getRotatedImageIdeas(count = 4): Suggestion[] {
  const pool = EXAMPLE_PROMPTS;
  if (pool.length === 0) return [];
  const n = Math.min(count, pool.length);
  // Day + session entropy for variety without server state.
  let seed = Date.now() % 100000;
  try {
    const k = "m2e_try_seed";
    const existing = sessionStorage.getItem(k);
    if (existing) seed = Number(existing) || seed;
    else sessionStorage.setItem(k, String(seed));
  } catch {
    /* ignore */
  }
  const start = seed % pool.length;
  const out: Suggestion[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pool[(start + i * 7) % pool.length]!);
  }
  return out;
}
