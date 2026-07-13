// Server-only Prompt Enhancement Engine.
// Expands short / vague user prompts into detailed, model-ready instructions so
// even a 2-3 word prompt is deeply understood before generation begins.
// Uses the Lovable AI gateway; falls back to the raw prompt on any failure so
// generation never breaks because of enhancement.

type EnhanceArgs = {
  prompt: string;
  /** true = editing an uploaded image (image-to-image), false = text-to-image. */
  isEdit: boolean;
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Prepended to every image-EDIT instruction so the model treats the input as a
// real photograph and preserves identity / composition instead of regenerating.
const BASE_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo edit. " +
  "Preserve the exact person, their face, skin tone, body proportions, " +
  "clothing and pose exactly. Preserve the exact background, lighting, " +
  "colors and composition exactly. Only make the specific requested change. " +
  "Do not change art style. Keep it photorealistic. Do not make it cartoon, " +
  "anime, painting or illustration.";

/**
 * Deterministic expansion for common short editing prompts. Each entry maps a
 * set of trigger phrases to a fully detailed, FAL-ready instruction that
 * references "this exact image" and requires preservation of everything else.
 */
const EDIT_EXPANSIONS: { triggers: string[]; expansion: string }[] = [
  {
    triggers: ["remove people", "remove person", "remove humans", "remove human"],
    expansion:
      "Carefully remove all people and human figures from this exact image. Fill the removed areas naturally with the surrounding background environment using inpainting. Keep ALL other elements exactly identical - colors, lighting, objects, textures, composition. Do not alter anything except removing the human figures.",
  },
  {
    triggers: ["remove background"],
    expansion:
      "Remove the entire background from this image completely and replace it with a clean white or transparent background. Keep the main subject perfectly intact with clean, precise edges and natural lighting.",
  },
  {
    triggers: ["change background", "replace background", "new background"],
    expansion:
      "Replace only the background of this exact image with a clean and suitable setting. Keep the main foreground subject completely intact with natural edges and perfect lighting integration. Preserve all colors, details and proportions of the subject.",
  },
  {
    triggers: ["blur background", "bokeh"],
    expansion:
      "Apply a smooth and natural bokeh blur effect to only the background of this image. Keep the main foreground subject perfectly sharp, clear and in focus. Create a professional DSLR-like depth of field effect.",
  },
  {
    triggers: ["make brighter", "brighten", "brighter"],
    expansion:
      "Increase the brightness and exposure of this exact image naturally. Make it look well-lit and vibrant while preserving all original colors, details, subjects and composition perfectly. Avoid overexposing any areas.",
  },
  {
    triggers: ["make dark", "darken", "darker", "make darker"],
    expansion:
      "Reduce the brightness and increase the shadow depth of this exact image naturally. Create a moody and atmospheric look while preserving all original colors, details, subjects and composition perfectly.",
  },
  {
    triggers: ["remove watermark", "remove text", "remove logo", "remove watermarks"],
    expansion:
      "Remove all watermarks, text overlays, logos, stamps or any superimposed elements from this exact image completely. Reconstruct the underlying image content naturally and seamlessly in those areas using the surrounding pixels as reference.",
  },
  {
    triggers: ["colorize", "color this", "add color", "add colors"],
    expansion:
      "Add natural, realistic and visually appealing colors to this image. Choose colors that complement each other and suit the subject matter. Make it look professional and vibrant while keeping the original shapes, design and composition completely intact.",
  },
  {
    triggers: ["remove object"],
    expansion:
      "Carefully identify and remove the specified object from this exact image completely. Fill the removed area naturally using the surrounding background as reference. Keep everything else in the image exactly the same.",
  },
  {
    triggers: ["enhance", "improve quality", "improve"],
    expansion:
      "Enhance the overall quality of this exact image. Improve sharpness, clarity, detail and color accuracy while preserving all original subjects, composition and colors perfectly. Make it look professional.",
  },
  {
    triggers: ["restore", "repair", "fix"],
    expansion:
      "Restore and repair this image to its best possible quality. Fix any damage, artifacts, noise, blur or imperfections while keeping all original content, colors and composition completely intact.",
  },
];

function expandShortEditPrompt(prompt: string): string | null {
  const normalized = prompt.trim().toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  // Only expand short prompts; longer prompts are already detailed.
  if (wordCount > 20) return null;
  for (const { triggers, expansion } of EDIT_EXPANSIONS) {
    if (triggers.some((t) => normalized.includes(t))) return expansion;
  }
  return null;
}

export async function enhancePrompt({ prompt, isEdit }: EnhanceArgs): Promise<string> {
  // Longer prompts (>20 words) are already specific enough — send as-is.
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 20) return prompt;

  // Deterministic expansion of common short edit instructions.
  if (isEdit) {
    const canned = expandShortEditPrompt(prompt);
    if (canned) return canned;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return prompt;

  const system = isEdit
    ? [
        "You are an expert prompt engineer for an AI image EDITING model (instruction-based, preserves the original image).",
        "Rewrite the user's short request into ONE detailed, vivid editing instruction that makes the requested change clearly visible and strong.",
        "ALWAYS append explicit preservation directives so the edit never degrades the photo. Specifically require: preserve the exact face identity and facial features of every person, preserve body proportions, preserve background structure and composition, preserve original resolution and fine detail, keep skin texture natural, and maintain photorealism.",
        "If the request is purely stylistic (e.g. 'cinematic', 'vintage', 'dramatic'), translate it into concrete adjustments: lighting, contrast, color grading, mood and realism — while preserving identity and detail.",
        "Reconstruct any removed/replaced areas naturally so they blend with surrounding lighting, shadows and reflections.",
        "Never simplify, smooth away, or drop existing details. Do NOT add commentary, options or quotes. Output only the final instruction, under 90 words.",
      ].join(" ")
    : [
        "You are a prompt engineer for a high-end AI image GENERATION model.",
        "Expand the user's short idea into ONE rich, detailed prompt with subject, composition, lighting, mood, color and quality cues (sharp, highly detailed, professional).",
        "Stay faithful to the user's intent — do not invent unrelated subjects.",
        "Do NOT add commentary or quotes. Output only the final prompt, under 80 words.",
      ].join(" ");

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return prompt;
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    const enhanced = json.content?.find((c) => c.type === "text")?.text?.trim();
    return enhanced && enhanced.length > 0 ? enhanced : prompt;
  } catch {
    return prompt;
  }
}

