import { describe, it, expect } from "vitest";
import {
  buildFalRequest,
  TEXT_TO_IMAGE_MODEL,
  IMAGE_TO_IMAGE_MODEL,
} from "@/lib/fal-request";

const SAMPLE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mნ";

describe("image generation workflows", () => {
  it("Text → Image uses FLUX1.1 [pro] and sends no source image", () => {
    const req = buildFalRequest({ prompt: "a serene mountain lake at sunrise" });
    expect(req.workflow).toBe("text-to-image");
    expect(req.model).toBe(TEXT_TO_IMAGE_MODEL);
    expect(req.endpoint).toBe(`https://fal.run/${TEXT_TO_IMAGE_MODEL}`);
    expect(req.body).not.toHaveProperty("image_url");
    expect(req.body.prompt).toContain("mountain lake");
  });

  it("Image → Image enhancement sends the uploaded image to Kontext", () => {
    const req = buildFalRequest({
      prompt: "enhance sharpness and lighting, keep everything else identical",
      imageUrl: SAMPLE_IMAGE,
    });
    expect(req.workflow).toBe("image-to-image");
    expect(req.model).toBe(IMAGE_TO_IMAGE_MODEL);
    expect(req.body.image_url).toBe(SAMPLE_IMAGE);
    expect(req.body.prompt).toMatch(/keep everything else identical/);
  });

  it("Background removal preserves original via image-to-image", () => {
    const req = buildFalRequest({
      prompt: "remove the background, keep the subject untouched on transparent backdrop",
      imageUrl: SAMPLE_IMAGE,
    });
    expect(req.workflow).toBe("image-to-image");
    expect(req.model).toBe(IMAGE_TO_IMAGE_MODEL);
    expect(req.body.image_url).toBe(SAMPLE_IMAGE);
  });

  it("Style transfer applies only the requested style to the uploaded image", () => {
    const req = buildFalRequest({
      prompt: "convert to watercolor painting style, preserve composition",
      imageUrl: SAMPLE_IMAGE,
    });
    expect(req.workflow).toBe("image-to-image");
    expect(req.model).toBe(IMAGE_TO_IMAGE_MODEL);
    expect(req.body.image_url).toBe(SAMPLE_IMAGE);
    expect(req.body.prompt).toMatch(/watercolor/);
  });
});
