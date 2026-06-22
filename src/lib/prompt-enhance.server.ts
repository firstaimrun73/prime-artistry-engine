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

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function enhancePrompt({ prompt, isEdit }: EnhanceArgs): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return prompt;

  const system = isEdit
    ? [
        "You are a prompt engineer for an AI image EDITING model (instruction-based, preserves the original image).",
        "Rewrite the user's short request into ONE detailed, vivid editing instruction.",
        "Make the requested change clearly visible and strong, but PRESERVE faces, identity, lighting direction, perspective, skin texture and overall realism.",
        "Reconstruct any removed/replaced areas naturally so they blend with surrounding lighting, shadows and reflections.",
        "Do NOT add commentary, options or quotes. Output only the final instruction, under 80 words.",
      ].join(" ")
    : [
        "You are a prompt engineer for a high-end AI image GENERATION model.",
        "Expand the user's short idea into ONE rich, detailed prompt with subject, composition, lighting, mood, color and quality cues (sharp, highly detailed, professional).",
        "Stay faithful to the user's intent — do not invent unrelated subjects.",
        "Do NOT add commentary or quotes. Output only the final prompt, under 80 words.",
      ].join(" ");

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) return prompt;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const enhanced = json.choices?.[0]?.message?.content?.trim();
    return enhanced && enhanced.length > 0 ? enhanced : prompt;
  } catch {
    return prompt;
  }
}
