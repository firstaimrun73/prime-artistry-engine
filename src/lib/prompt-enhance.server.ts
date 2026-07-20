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

const PEOPLE_REMOVAL_LOCK =
  "This is a real photograph. Treat it as a real photo object-removal edit. " +
  "The requested person, people, humans or human figures are the removal target, " +
  "so do NOT preserve them. Remove the target humans completely, including faces, " +
  "bodies, clothing, hair, limbs, shadows, reflections and silhouettes. Preserve " +
  "every non-human part of the image exactly: background structure, objects, " +
  "lighting, colors, camera angle, textures and composition. Keep it photorealistic. " +
  "Do not change art style. Do not add replacement people.";

function isPeopleRemovalPrompt(prompt: string): boolean {
  return /\b(remove\s+(people|person|persons|humans?|human|everyone|all)|remove\s+all\s+(people|persons|humans?)?|erase\s+(person|people|humans?|human)|delete\s+(person|people|humans?|human))\b/i.test(
    prompt || "",
  );
}

/**
 * Deterministic expansion for common short editing prompts. Each entry maps a
 * set of trigger phrases to a fully detailed, FAL-ready instruction that
 * references "this exact image" and requires preservation of everything else.
 */
const EDIT_EXPANSIONS: { triggers: string[]; expansion: string }[] = [
  {
    triggers: [
      "remove people",
      "remove person",
      "remove humans",
      "remove human",
      "remove all",
      "remove everyone",
      "erase person",
      "erase people",
      "delete person",
      "delete people",
    ],
    expansion:
      "Completely remove every visible person and human figure from this exact image. Do not leave faces, bodies, clothing, hair, limbs, ghost silhouettes, shadows, reflections or partial human traces. Seamlessly inpaint each removed area with realistic background content matching the surrounding texture, lighting, perspective and depth. Keep all non-human objects, colors, lighting, framing and composition unchanged.",
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
  // For edits, always lock the photo so identity/composition are preserved.
  const lock = (text: string) => {
    if (!isEdit) return text;
    const lockText = isPeopleRemovalPrompt(prompt) || isPeopleRemovalPrompt(text) ? PEOPLE_REMOVAL_LOCK : BASE_PHOTO_LOCK;
    return `${lockText}\n\n${text}`;
  };

  // Longer prompts (>20 words) are already specific enough — send as-is.
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 20) return lock(prompt);

  // Deterministic expansion of common short edit instructions.
  if (isEdit) {
    const canned = expandShortEditPrompt(prompt);
    if (canned) return lock(canned);
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // No AI available — still return a locked, preservation-heavy instruction.
    return lock(
      `${prompt.trim()}. Keep this photo completely photorealistic. Preserve the ` +
        `exact person, face, skin tone, clothing, background and lighting. ` +
        `Only make the specific requested change. Do not alter anything else.`,
    );
  }

  const system = isEdit
    ? [
        "You are an expert AI image EDITING prompt engineer for an instruction-based model (like FLUX Kontext) that preserves the original image.",
        "MULTILINGUAL: The user's prompt may be in ANY language. Silently detect the language and TRANSLATE it to English first, then produce the final English editing instruction. Never echo the original non-English text.",
        "Rewrite the request into ONE detailed, vivid, English editing instruction that:",
        "1) Is EXTREMELY SPECIFIC about what to CHANGE — reference the uploaded image directly ('this photograph', 'this exact image').",
        "2) Is EXTREMELY SPECIFIC about what to PRESERVE — exact face identity, facial features, body proportions, skin texture, hair, clothing details, background structure, composition, lighting, colors, resolution and fine detail.",
        "3) Uses TECHNICAL photography and editing terms (exposure, contrast, color grading, depth of field, edge detection, inpainting, seamless blend, photorealistic).",
        "4) For stylistic requests ('cinematic', 'vintage', 'dramatic'), translate them into concrete adjustments: lighting, contrast, color grading, mood — while preserving identity.",
        "5) Reconstruct any removed/replaced areas naturally so they blend with surrounding lighting, shadows and reflections.",
        "6) ALWAYS end with explicit NEGATIVE instructions using 'Do NOT' — what the model MUST NOT do (e.g. 'Do NOT blur edges. Do NOT change subject colors. Do NOT alter the person. Do NOT change art style. Do NOT make it cartoon or painting.').",
        "Example — Input: 'remove background' → Output: 'Remove the entire background from this photograph completely and replace it with pure white (#FFFFFF). Preserve the subject with pixel-perfect edge detection, natural hair strands, and original lighting on the subject. Do NOT blur edges. Do NOT change subject colors. Do NOT alter the subject in any way. Do NOT add shadows behind the subject.'",
        "Never simplify, smooth away, or drop existing details. Do NOT add commentary, options or quotes. Output only the final English instruction, under 100 words.",
      ].join(" ")
    : [
        "You are a prompt engineer for a high-end AI image GENERATION model.",
        "MULTILINGUAL: The user's prompt may be in ANY language. Silently detect and TRANSLATE it to English first, then expand.",
        "Expand the user's idea into ONE rich, detailed English prompt with subject, composition, lighting, mood, color and quality cues (sharp, highly detailed, professional).",
        "Stay faithful to the user's intent — do not invent unrelated subjects.",
        "Do NOT add commentary or quotes. Output only the final English prompt, under 90 words.",
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
    if (!res.ok) return lock(prompt);
    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    const enhanced = json.content?.find((c) => c.type === "text")?.text?.trim();
    return enhanced && enhanced.length > 0 ? lock(enhanced) : lock(prompt);
  } catch {
    return lock(prompt);
  }
}

