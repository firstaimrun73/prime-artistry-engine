import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  sourceImageUrl: z.string().min(1),
  professionalPrompt: z.string().min(1).max(4000),
  negativePrompt: z.string().max(4000).optional(),
  strength: z.number().min(0.1).max(1).optional(),
  guidanceScale: z.number().min(1).max(20).optional(),
  steps: z.number().int().min(1).max(100).optional(),
});

/**
 * Server function: edits an image via the FAL image-to-image model.
 * The FAL key never reaches the browser.
 */
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ outputUrl: string }> => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) throw new Error("FAL_KEY is not configured.");

    const res = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: data.sourceImageUrl,
        prompt: data.professionalPrompt,
        ...(data.negativePrompt ? { negative_prompt: data.negativePrompt } : {}),
        strength: data.strength ?? 0.85,
        guidance_scale: data.guidanceScale ?? 11,
        num_inference_steps: data.steps ?? 45,
        num_images: 1,
        output_format: "png",
        enable_safety_checker: true,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Image generation failed (${res.status}): ${detail}`);
    }

    const json = (await res.json()) as {
      images?: { url?: string }[];
      image?: { url?: string };
    };
    const outputUrl = json.images?.[0]?.url ?? json.image?.url;
    if (!outputUrl) throw new Error("No output image returned.");
    return { outputUrl };
  });
