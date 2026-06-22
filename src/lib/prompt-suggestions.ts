// Pure helpers for the editor's prompt intelligence UI.
// Framework-free so they can be unit-tested without React.

export type Suggestion = { label: string; prompt: string };

// Curated example prompts shown when the box is empty.
export const EXAMPLE_PROMPTS: Suggestion[] = [
  { label: "Remove unwanted objects", prompt: "Remove all unwanted objects and distractions, reconstructing the background naturally." },
  { label: "Replace background", prompt: "Replace the background with a clean, professional studio backdrop while keeping the subject sharp." },
  { label: "Make cinematic", prompt: "Make this cinematic with dramatic lighting, rich color grading and film-like depth." },
  { label: "Turn into anime", prompt: "Transform this into a high-quality anime illustration while preserving the composition." },
  { label: "Enhance quality", prompt: "Enhance the overall quality, sharpness, detail and lighting to a professional standard." },
  { label: "Create motion video", prompt: "Animate this image with subtle, natural motion and a cinematic camera move." },
];

// Smart, keyword-triggered suggestions. When the user types a trigger word the
// editor surfaces tailored follow-ups so even a single word becomes a great prompt.
const SMART_RULES: { match: RegExp; suggestions: Suggestion[] }[] = [
  {
    match: /\bremove\b/i,
    suggestions: [
      { label: "Remove people", prompt: "Remove all people from the scene and reconstruct the background naturally." },
      { label: "Remove object", prompt: "Remove the unwanted object and seamlessly fill the area to match the surroundings." },
      { label: "Remove background", prompt: "Remove the background completely, keeping only the main subject with clean edges." },
      { label: "Remove watermark", prompt: "Remove any watermark, text or logo and restore the underlying image cleanly." },
    ],
  },
  {
    match: /\bmake\b/i,
    suggestions: [
      { label: "Make cinematic", prompt: "Make this cinematic with dramatic lighting and film-style color grading." },
      { label: "Make realistic", prompt: "Make this look photorealistic with natural lighting, textures and detail." },
      { label: "Make professional", prompt: "Make this look professional and polished, studio-quality." },
      { label: "Make animated", prompt: "Make this into a vibrant animated / cartoon style illustration." },
    ],
  },
  {
    match: /\b(replace|change)\b/i,
    suggestions: [
      { label: "Replace background", prompt: "Replace the background with a clean professional backdrop." },
      { label: "Change colors", prompt: "Change the color palette to a warm, cinematic tone." },
      { label: "Change outfit", prompt: "Change the outfit to elegant professional attire while keeping the face unchanged." },
    ],
  },
  {
    match: /\b(enhance|improve|upscale|fix)\b/i,
    suggestions: [
      { label: "Enhance quality", prompt: "Enhance sharpness, detail and clarity to a professional standard." },
      { label: "Fix lighting", prompt: "Fix and balance the lighting for a natural, well-exposed result." },
      { label: "Restore", prompt: "Restore and repair the image, removing noise, blur and damage." },
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
