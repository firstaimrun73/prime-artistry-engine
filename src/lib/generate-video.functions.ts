import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  sourceImageUrl: z.string().min(1),
  prompt: z.string().min(1).max(4000),
  durationSeconds: z.number().min(1).max(30).optional(),
});

/**
 * Server function: generates a video from a source image via the FAL
 * image-to-video model. The FAL key never reaches the browser.
 */
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ outputUrl: string }> => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) throw new Error("FAL_KEY is not configured.");

    const res = await fetch("https://fal.run/fal-ai/wan/v2.1/image-to-video", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: data.sourceImageUrl,
        prompt: data.prompt,
        duration: data.durationSeconds ?? 5,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Video generation failed (${res.status}): ${detail}`);
    }

    const json = (await res.json()) as {
      video?: { url?: string };
      videos?: { url?: string }[];
    };
    const outputUrl = json.video?.url ?? json.videos?.[0]?.url;
    if (!outputUrl) throw new Error("No output video returned.");
    return { outputUrl };
  });
