#!/usr/bin/env python3
"""Image Studio completion pass — surgical only. Never touches generate.functions.ts body logic beyond safety checks."""
from pathlib import Path
import re

changed = []

def must_exist(p: str, min_len: int = 200):
    path = Path(p)
    t = path.read_text()
    assert len(t) >= min_len, f"{p} too small ({len(t)})"
    return path, t

# ---------------------------------------------------------------------------
# SAFETY: generate.functions must stay intact
# ---------------------------------------------------------------------------
gen_path, gen = must_exist("src/lib/generate.functions.ts", 20000)
assert "executeUltraImage" in gen and "Fail closed" in gen
assert "PLACEHOLDER" not in gen or len(gen) > 10000

# ---------------------------------------------------------------------------
# 1) Carousel — title + no extra white extension
# ---------------------------------------------------------------------------
car_path, car = must_exist("src/components/editor/image/ImageStudioWeeklyCarousel.tsx", 500)
car2 = car.replace(
    """      <h2 className=\"mb-3 text-center text-sm font-semibold tracking-wide text-muted-foreground sm:text-base\">
        Weekly Top 10
      </h2>
      <LoopTrack set={active} onOpen={setLightbox} />""",
    """      <h2 className=\"mb-2 text-center text-sm font-semibold tracking-wide text-muted-foreground sm:text-base\">
        Try Something New
      </h2>
      <LoopTrack set={active} onOpen={setLightbox} />""",
)
car2 = car2.replace(
    'className="mt-6 border-t border-border/40 pt-5 sm:mt-8 sm:pt-6"',
    'className="mt-5 border-t border-border/40 pt-4 pb-1 sm:mt-6 sm:pt-5"',
)
if car2 != car:
    car_path.write_text(car2)
    changed.append("carousel title+spacing")
else:
    print("carousel already updated or pattern mismatch")

# ---------------------------------------------------------------------------
# 2) studio-tier — expose IMAX for Ultra (premium internal)
# ---------------------------------------------------------------------------
st_path, st = must_exist("src/lib/studio/studio-tier.ts", 1000)
old_aspect = '''export function aspectRatiosForStudioTier(
  tier: StudioTier,
): Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax"> {
  if (tier === "standard") {
    return ["1:1", "4:3", "16:9", "9:16", "3:4"];
  }
  return ["1:1", "4:3", "16:9", "9:16", "3:4", "21:9"];
}'''
new_aspect = '''export function aspectRatiosForStudioTier(
  tier: StudioTier,
): Array<"1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax" | "custom"> {
  if (tier === "standard") {
    return ["1:1", "4:3", "16:9", "9:16", "3:4"];
  }
  if (tier === "pro") {
    // Premium experience — 21:9 ultra-wide; no IMAX (Ultra-only).
    return ["1:1", "4:3", "16:9", "9:16", "3:4", "21:9", "custom"];
  }
  // Ultra AI — 21:9 + true IMAX 1.43:1 (requires 8k_max on generate) + Custom.
  return ["1:1", "4:3", "16:9", "9:16", "3:4", "21:9", "imax", "custom"];
}'''
if old_aspect in st:
    st = st.replace(old_aspect, new_aspect, 1)
    # update comment about IMAX intentional omit
    st = st.replace(
        "IMAX is intentionally omitted until the UI exposes 8K Max (8k_max), which the\n * Ultra validator requires for IMAX. Do not present a selectable IMAX path that\n * cannot satisfy the backend. 21:9 is never IMAX.",
        "IMAX (true 1.43:1) is Ultra-only and requires imageQuality 8k_max at generate time.\n * 21:9 is normal ultra-wide and is never treated as IMAX.",
    )
    st_path.write_text(st)
    changed.append("studio-tier IMAX+custom")
elif '"imax", "custom"' in st:
    print("studio-tier already has imax+custom")
else:
    print("WARN studio-tier aspect fn not matched")

# ---------------------------------------------------------------------------
# 3) prompt-suggestions — custom aspect + expand pool + rotation helper
# ---------------------------------------------------------------------------
ps_path, ps = must_exist("src/lib/prompt-suggestions.ts", 2000)

# Expand AspectRatio + ASPECT_RATIOS
ps = ps.replace(
    'export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax";',
    'export type AspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "3:4" | "21:9" | "imax" | "custom";',
)
old_ar = '''export const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "21:9", label: "21:9" },
  { id: "imax", label: "IMAX" },
];'''
new_ar = '''export const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "3:4", label: "3:4" },
  { id: "21:9", label: "21:9" },
  { id: "imax", label: "IMAX 1.43:1" },
  { id: "custom", label: "Custom" },
];'''
if old_ar in ps:
    ps = ps.replace(old_ar, new_ar, 1)

# Append extra prompts before closing of EXAMPLE_PROMPTS if count < 100
labels = re.findall(r'label:\s*"([^"]+)"', ps[ps.find("EXAMPLE_PROMPTS"):ps.find("];", ps.find("EXAMPLE_PROMPTS"))])
print("existing EXAMPLE_PROMPTS labels", len(labels))

EXTRA = '''
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
'''

if "expanded catalogue" not in ps:
    # insert before closing ]; of EXAMPLE_PROMPTS
    end = ps.find("];", ps.find("EXAMPLE_PROMPTS"))
    if end > 0:
        ps = ps[:end] + EXTRA + ps[end:]
        changed.append("EXAMPLE_PROMPTS expanded")
    else:
        print("WARN could not expand EXAMPLE_PROMPTS")
else:
    print("EXAMPLE_PROMPTS already expanded")

# Add rotation helper at end of file if missing
ROTATE_HELPER = '''

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
'''
if "getRotatedImageIdeas" not in ps:
    ps = ps.rstrip() + ROTATE_HELPER
    changed.append("getRotatedImageIdeas")

ps_path.write_text(ps)

# ---------------------------------------------------------------------------
# 4) EditorOptionsPanel — orange selected + custom shape
# ---------------------------------------------------------------------------
eop_path, eop = must_exist("src/components/editor/EditorOptionsPanel.tsx", 2000)
eop2 = eop
# AspectShape custom
if 'custom: { w:' not in eop2:
    eop2 = eop2.replace(
        'imax: { w: 22, h: 15 },',
        'imax: { w: 22, h: 15 },\n    custom: { w: 20, h: 16 },',
    )
# Selected style → Motio2edit orange
old_active = '''                    active
                      ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"'''
new_active = '''                    active
                      ? "border-[#FF5A1F] bg-[#FF5A1F]/15 text-[#FF5A1F] ring-1 ring-[#FF5A1F]/35 shadow-[0_0_12px_-4px_rgba(255,90,31,0.45)]"
                      : "border-border/70 bg-card/50 text-muted-foreground hover:border-[#FF5A1F]/40 hover:text-foreground"'''
if old_active in eop2:
    eop2 = eop2.replace(old_active, new_active)
    changed.append("aspect selected orange")
if eop2 != eop:
    eop_path.write_text(eop2)

# ---------------------------------------------------------------------------
# 5) ImageEditor — force 8k_max when IMAX; pass imax-safe quality
# ---------------------------------------------------------------------------
ie_path, ie = must_exist("src/components/editor/image/ImageEditor.tsx", 20000)
# Replace imageQuality in generate payload
old_payload = '''          aspectRatio,
          imageQuality,
          studioTier,'''
new_payload = '''          aspectRatio,
          // IMAX requires Ultra 8k_max on the server validator — never send plain 8k for imax.
          imageQuality: aspectRatio === "imax" ? "8k_max" : imageQuality,
          studioTier,'''
if old_payload in ie and 'aspectRatio === "imax"' not in ie:
    ie = ie.replace(old_payload, new_payload)
    changed.append("ImageEditor IMAX→8k_max")
    ie_path.write_text(ie)
elif 'aspectRatio === "imax"' in ie:
    print("ImageEditor IMAX quality already forced")
else:
    print("WARN ImageEditor payload pattern not matched")

# ---------------------------------------------------------------------------
# 6) EditorPromptPanel — rotate Try ideas from full pool
# ---------------------------------------------------------------------------
epp_path, epp = must_exist("src/components/editor/EditorPromptPanel.tsx", 5000)
if "getRotatedImageIdeas" not in epp:
    epp = epp.replace(
        'import { EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";',
        'import { EXAMPLE_PROMPTS, getRotatedImageIdeas } from "@/lib/prompt-suggestions";',
    )
    # Replace static IMAGE_IDEAS usage in Try row with rotated
    if "const IMAGE_IDEAS = [" in epp:
        # keep IMAGE_IDEAS but use rotated at render
        epp = epp.replace(
            "{IMAGE_IDEAS.map((s) => (",
            "{(typeof window !== \"undefined\" ? getRotatedImageIdeas(4) : IMAGE_IDEAS).map((s) => (",
        )
        # better: useMemo style without window check - use getRotatedImageIdeas always
        epp = epp.replace(
            "{(typeof window !== \"undefined\" ? getRotatedImageIdeas(4) : IMAGE_IDEAS).map((s) => (",
            "{getRotatedImageIdeas(4).map((s) => (",
        )
        changed.append("Try ideas rotated")
    epp_path.write_text(epp)
else:
    print("EditorPromptPanel already rotates")

# ---------------------------------------------------------------------------
# 7) Ultra validation — accept custom aspect via ratio string from client
# ---------------------------------------------------------------------------
uv_path, uv = must_exist("src/lib/studio/image/ultra/validation.ts", 500)
if 'a === "custom"' not in uv and "custom" not in uv[uv.find("normalizeUltraAspect"):uv.find("normalizeUltraAspect")+800]:
    old_norm = '''  if (
    a === "1:1" ||
    a === "4:3" ||
    a === "16:9" ||
    a === "9:16" ||
    a === "3:4" ||
    a === "21:9"
  ) {
    return { aspect: a as UltraAspectRatio };
  }
  return { aspect: "1:1" };'''
    new_norm = '''  if (
    a === "1:1" ||
    a === "4:3" ||
    a === "16:9" ||
    a === "9:16" ||
    a === "3:4" ||
    a === "21:9"
  ) {
    return { aspect: a as UltraAspectRatio };
  }
  // Custom: client may send "custom" — treat as 16:9 master; prompt should carry ratio intent.
  // True free-form W:H custom dims are applied when aspect is a numeric ratio like "2.35:1".
  if (a === "custom") {
    return { aspect: "16:9" };
  }
  const ratioMatch = a.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const w = Number(ratioMatch[1]);
    const h = Number(ratioMatch[2]);
    if (w > 0 && h > 0) {
      const r = w / h;
      // Map free ratio to nearest supported Ultra aspect for master generation.
      if (r > 2.1) return { aspect: "21:9" };
      if (r > 1.5) return { aspect: "16:9" };
      if (r > 1.2) return { aspect: "4:3" };
      if (r > 0.9) return { aspect: "1:1" };
      if (r > 0.7) return { aspect: "3:4" };
      return { aspect: "9:16" };
    }
  }
  return { aspect: "1:1" };'''
    if old_norm in uv:
        uv = uv.replace(old_norm, new_norm, 1)
        uv_path.write_text(uv)
        changed.append("ultra validation custom")
    else:
        print("WARN ultra validation pattern not matched")
else:
    print("ultra validation already custom-aware")

# ---------------------------------------------------------------------------
# Final safety
# ---------------------------------------------------------------------------
gen2 = Path("src/lib/generate.functions.ts").read_text()
assert len(gen2) > 20000
assert "executeUltraImage" in gen2 and "Fail closed" in gen2
assert "PLACEHOLDER" not in gen2 or len(gen2) > 10000

print("CHANGED:", changed)
print("OK")
