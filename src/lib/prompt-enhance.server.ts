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

export async function enhancePrompt({ prompt, isEdit }: EnhanceArgs): Promise<string> {
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

