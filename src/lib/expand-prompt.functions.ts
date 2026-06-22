import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EditMode, ExpandedIntent } from "./edit-session";

const inputSchema = z.object({
  userPrompt: z.string().min(1).max(2000),
  mode: z.enum(["image", "video"]),
  imageDescription: z.string().max(2000).optional(),
});

function injectQualityBoosters(prompt: string, mode: EditMode): string {
  const imageQuality =
    "masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, professional photography";
  const videoQuality =
    "cinematic quality, smooth motion, temporal consistency, professional color grading";
  const booster = mode === "image" ? imageQuality : videoQuality;
  if (prompt.includes("masterpiece") || prompt.includes("cinematic quality")) {
    return prompt;
  }
  return `${prompt}, ${booster}`;
}

function getDefaultIntent(userPrompt: string, mode: EditMode): ExpandedIntent {
  return {
    professionalPrompt: `${userPrompt}, masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, professional lighting`,
    negativePrompt:
      "blurry, low quality, pixelated, oversaturated, noise, grain, watermark, text, ugly, deformed, artifacts",
    strength: 0.65,
    guidanceScale: 9.5,
    steps: mode === "video" ? 40 : 35,
    style: "photorealistic",
    motionGuidance: mode === "video" ? "smooth, natural camera movement" : undefined,
    durationSeconds: mode === "video" ? 8 : undefined,
  };
}

const SYSTEM_PROMPT = `You are a professional AI image and video editor.
Your job: take a SHORT user prompt and expand it into a COMPLETE professional editing directive.
Return ONLY valid JSON, no markdown, no explanation.

JSON schema:
{
  "professionalPrompt": "string — full positive prompt, 60-120 words, highly detailed",
  "negativePrompt": "string — what to avoid, 40-60 words",
  "strength": number between 0.35 and 0.95,
  "guidanceScale": number between 7.0 and 14.0,
  "steps": integer between 30 and 60,
  "style": "cinematic|portrait|landscape|product|abstract|anime|photorealistic|artistic",
  "motionGuidance": "string — only for video",
  "durationSeconds": number — only for video
}

STRENGTH RULES:
- subtle, slight → 0.35–0.45
- enhance, improve → 0.55–0.65
- dramatic, transform → 0.75–0.90
- replace background, change style → 0.85–0.95
- unclear → 0.65`;

/**
 * Server function: expands a short user prompt into a professional editing
 * directive. The AI call runs on the server only — the API key never reaches
 * the browser.
 */
export const expandPrompt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ExpandedIntent> => {
    const { userPrompt, mode, imageDescription } = data;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return getDefaultIntent(userPrompt, mode);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Mode: ${mode}\nUser prompt: "${userPrompt}"\n${
                imageDescription ? `Image content: ${imageDescription}` : ""
              }\n\nExpand this into a professional ${mode} editing directive.`,
            },
          ],
        }),
      });

      if (!res.ok) return getDefaultIntent(userPrompt, mode);

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      const clean = text.replace(/```json|```/g, "").trim();

      const parsed = JSON.parse(clean) as ExpandedIntent;
      parsed.steps = Math.max(Math.round(parsed.steps), 30);
      parsed.guidanceScale = Math.max(parsed.guidanceScale, 7.0);
      parsed.strength = Math.min(Math.max(parsed.strength, 0.35), 0.95);
      parsed.professionalPrompt = injectQualityBoosters(parsed.professionalPrompt, mode);
      return parsed;
    } catch {
      return getDefaultIntent(userPrompt, mode);
    }
  });
