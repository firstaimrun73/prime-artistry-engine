// Image → Music mood analysis.
//
// The Music Studio lets users attach an image; Claude describes its mood in a
// short phrase that is appended to the music prompt. The Anthropic key never
// reaches the browser.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  // Either a public/signed https URL or a data URI of the uploaded image.
  imageUrl: z.string().min(1).max(8_000_000),
});

const PROMPT =
  "Describe the mood and atmosphere of this image in 8-12 words suitable for music generation. Focus on tempo, emotion and instruments. Return only the description.";

export const analyzeImageMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ mood: string }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Image mood analysis is unavailable right now.");

    // Anthropic accepts either a URL source or base64 source. Data URIs from
    // the file picker are split into media type + base64 payload.
    let source: Record<string, unknown>;
    const m = /^data:([^;]+);base64,(.+)$/s.exec(data.imageUrl);
    if (m) {
      source = { type: "base64", media_type: m[1], data: m[2] };
    } else if (data.imageUrl.startsWith("http")) {
      source = { type: "url", url: data.imageUrl };
    } else {
      throw new Error("Unsupported image format.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[image-mood] failed", res.status, detail.slice(0, 300));
      throw new Error("Could not read the mood of that image. You can still generate music.");
    }

    const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
    const mood = (json.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join(" ")
      .trim();

    if (!mood) throw new Error("Could not read the mood of that image.");
    return { mood: mood.slice(0, 200) };
  });
