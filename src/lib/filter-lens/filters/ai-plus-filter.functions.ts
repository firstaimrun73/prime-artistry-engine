/**
 * AI+ filter Apply path — Cloudflare Workers AI img2img (server-only).
 * Preview stays local NPR; final Apply may use this when style is transformative.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isAiPlusStyle, type AiPlusStyleKey } from "@/lib/filter-lens/filters/ai-plus-styles";
import { runAiPlusImg2Img } from "@/lib/filter-lens/server/cloudflare-workers-ai";

const inputSchema = z.object({
  style: z.string().min(1).max(32),
  intensity: z.number().min(0).max(100),
  imageBase64: z.string().min(32).max(12_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
  width: z.number().int().min(64).max(4096).optional(),
  height: z.number().int().min(64).max(4096).optional(),
});

export const applyAiPlusFilter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    if (!isAiPlusStyle(data.style)) {
      throw new Error("This filter does not use AI processing.");
    }

    const style = data.style as AiPlusStyleKey;
    const imageBytes = Buffer.from(data.imageBase64, "base64");
    if (imageBytes.length < 100) throw new Error("Invalid image data.");
    if (imageBytes.length > 8_000_000) throw new Error("Image is too large. Try a smaller photo.");

    let width = data.width;
    let height = data.height;
    if (width && height) {
      const maxEdge = 1024;
      const edge = Math.max(width, height);
      if (edge > maxEdge) {
        const scale = maxEdge / edge;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
    }

    try {
      const { bytes, model } = await runAiPlusImg2Img({
        style,
        intensity: data.intensity,
        imageBytes,
        width,
        height,
      });

      return {
        ok: true as const,
        imageBase64: bytes.toString("base64"),
        mimeType: "image/png" as const,
        modelUsed: model,
      };
    } catch (e) {
      console.error("[applyAiPlusFilter]", e instanceof Error ? e.message : e);
      throw new Error("AI filter processing is temporarily unavailable. Using local engine.");
    }
  });
