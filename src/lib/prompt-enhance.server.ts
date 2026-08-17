// Server-only Prompt Enhancement Engine.
// Expands short / vague user prompts into detailed, model-ready instructions so
// even a 2-3 word prompt is deeply understood before generation begins.
// Uses Anthropic when available; falls back to the raw prompt on any failure so
// generation never breaks because of enhancement.
//
// CRITICAL: For outfit / clothing transfer the lock MUST allow clothing change.
// The old BASE_PHOTO_LOCK said "preserve clothing" and was the main reason
// multi-image outfit edits only did weak "addon" changes.

type EnhanceArgs = {
  prompt: string;
  /** true = editing an uploaded image (image-to-image), false = text-to-image. */
  isEdit: boolean;
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Default photo lock — identity + pose + background. Clothing is NOT locked
// here so outfit requests can succeed; outfit-specific lock is chosen below.
const BASE_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo edit. " +
  "Preserve the exact person identity: face, facial structure, skin tone, hair, body proportions and pose. " +
  "Preserve background, lighting, colors and composition unless the user asked to change them. " +
  "Only make the specific requested change. Keep photorealistic. No cartoon/anime/painting.";

/** Allows full clothing change — used when outfit intent is detected. */
const OUTFIT_PHOTO_LOCK =
  "This is a real photograph. Treat it as a real photo clothing/outfit edit. " +
  "Preserve the exact person identity: face, facial structure, skin tone, hair, body pose, camera angle. " +
  "You MUST change the clothing/outfit as requested — do NOT keep the original clothes. " +
  "Keep the background unless asked otherwise. Photorealistic only.";

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

/** Same signals as image-edit/classify — keep in sync for outfit detection. */
function isOutfitIntent(prompt: string): boolean {
  return /\b(outfit|clothing|clothes|cloth|dress|shirt|jacket|armor|armour|costume|suit|wear|wearing|change\s+the\s+outfit|replace\s+outfit|swap\s+outfit|put\s+on|dress\s+(him|her|them)|clothes\s+from|from\s+the\s+ref|from\s+ref|reference\s+(img|image)|refrence|add\s+the\s+clothes|transfer\s+(the\s+)?(outfit|clothes|clothing)|swap\s+(the\s+)?(clothes|outfit))\b/i.test(
    prompt || "",
  );
}

/**
 * Deterministic expansion for common short editing prompts.
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
  if (wordCount > 20) return null;
  for (const { triggers, expansion } of EDIT_EXPANSIONS) {
    if (triggers.some((t) => normalized.includes(t))) return expansion;
  }
  return null;
}

function selectLock(userPrompt: string, expandedText: string): string {
  if (isPeopleRemovalPrompt(userPrompt) || isPeopleRemovalPrompt(expandedText)) {
    return PEOPLE_REMOVAL_LOCK;
  }
  if (isOutfitIntent(userPrompt) || isOutfitIntent(expandedText)) {
    return OUTFIT_PHOTO_LOCK;
  }
  return BASE_PHOTO_LOCK;
}

export async function enhancePrompt({ prompt, isEdit }: EnhanceArgs): Promise<string> {
  const lock = (text: string) => {
    if (!isEdit) return text;
    return `${selectLock(prompt, text)}\n\n${text}`;
  };

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 20) return lock(prompt);

  if (isEdit) {
    const canned = expandShortEditPrompt(prompt);
    if (canned) return lock(canned);
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return lock(
      `${prompt.trim()}. Keep this photo completely photorealistic. Preserve the ` +
        `exact person, face, skin tone and identity. Only make the specific requested change. ` +
        (isOutfitIntent(prompt)
          ? "Change the clothing/outfit as asked — do not keep the original clothes."
          : "Preserve clothing and background unless the request requires otherwise."),
    );
  }

  const system = isEdit
    ? [
        "You expand photo editing instructions. Always specify: what to change, what to preserve, and keep a photorealistic style.",
        "Never suggest changing faces or identity unless the user explicitly asked.",
        "If the user asks to change clothes/outfit/clothing from a reference image, you MUST instruct the model to REPLACE the clothing — do NOT say preserve original clothing.",
        "MULTILINGUAL: The user's prompt may be in ANY language. Silently detect the language and TRANSLATE it to English first, then produce the final English editing instruction. Never echo the original non-English text.",
        "ALWAYS include: exact specification of what to change; face/identity preservation if people are present; lighting and color preservation where appropriate; natural photographic result.",
        "NEVER suggest changing art style unless requested; modifying faces unless requested; adding new elements unless requested.",
        "Use technical photography and editing terms where useful.",
        "ALWAYS end with explicit negative instructions using 'Do NOT' where helpful.",
        "Example outfit — Input: 'add the clothes to the person from the reference img' → Output: 'Replace all clothing on the person in the base photo with the exact outfit shown in the reference image. Match colors, materials, silhouette and details. Keep the person's face, identity, hair, pose and background unchanged. Photorealistic. Do NOT keep the original clothes. Do NOT change the face.'",
        "Do NOT add commentary, options or quotes. Output only the final English instruction, under 100 words.",
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
