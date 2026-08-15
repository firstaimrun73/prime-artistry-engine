// Image → Music mood analysis.
//
// The Music Studio lets users attach an image; vision describes its mood so
// the description can be appended to the music prompt. The Anthropic key never
// reaches the browser.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  // Either a public/signed https URL or a data URI of the uploaded image.
  imageUrl: z.string().min(1).max(8_000_000),
});

const PROMPT = `Analyze this image for music generation. Reply with a single short paragraph (max 40 words) covering:
- overall mood / emotional tone
- atmosphere and environment
- energy level (low / medium / high)
- suggested music style or genre
- tempo feel (slow / moderate / upbeat)
- instrumentation hints (e.g. piano, strings, pads)
Return only that description, no labels or bullet points.`;

/** Anthropic accepts a limited set of media types for base64 images. */
function normalizeMediaType(raw: string): string {
  const t = (raw || "").toLowerCase().split(";")[0]!.trim();
  if (t === "image/jpg" || t === "image/pjpeg") return "image/jpeg";
  if (t === "image/x-png") return "image/png";
  if (t === "image/jpeg" || t === "image/png" || t === "image/gif" || t === "image/webp") {
    return t;
  }
  // Default to jpeg for unknown camera/browser MIME variants
  return "image/jpeg";
}

export const analyzeImageMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ mood: string }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Soft fallback: generation can still proceed without mood text
      return { mood: "" };
    }

    let source: Record<string, unknown>;
    const m = /^data:([^;,]+)?(;base64)?,(.+)$/s.exec(data.imageUrl);
    if (m && (m[2] === ";base64" || data.imageUrl.includes(";base64,"))) {
      const mediaRaw = m[1] || "image/jpeg";
      const b64 = m[3] || data.imageUrl.replace(/^data:[^;]+;base64,/, "");
      source = {
        type: "base64",
        media_type: normalizeMediaType(mediaRaw),
        data: b64.replace(/\s/g, ""),
      };
    } else if (data.imageUrl.startsWith("http://") || data.imageUrl.startsWith("https://")) {
      source = { type: "url", url: data.imageUrl };
    } else if (data.imageUrl.length > 100 && !data.imageUrl.includes(" ")) {
      // Bare base64 without data-URI prefix
      source = { type: "base64", media_type: "image/jpeg", data: data.imageUrl.replace(/\s/g, "") };
    } else {
      throw new Error("Unsupported image format. Use JPG, PNG, or WebP.");
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 160,
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
        console.error("[image-mood] failed", res.status, detail.slice(0, 400));
        // Soft failure: keep uploaded image usable; UI can show a mild notice
        return { mood: "" };
      }

      const json = (await res.json()) as { content?: { type?: string; text?: string }[] };
      const mood = (json.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join(" ")
        .trim();

      if (!mood) return { mood: "" };
      return { mood: mood.slice(0, 280) };
    } catch (e) {
      console.error("[image-mood] exception", e);
      return { mood: "" };
    }
  });
