import { describe, it, expect } from "vitest";
import {
  buildFalRequest,
  buildImageEnhancementPipeline,
  buildVideoEnhancement,
  TEXT_TO_IMAGE_MODEL,
  POST_PROCESSING_MODEL,
  DEBLUR_MODEL,
  UPSCALE_IMAGE_MODEL,
  UPSCALE_VIDEO_MODEL,
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

  it("Image → Image enhancement sharpens via post-processing with strong params", () => {
    const steps = buildImageEnhancementPipeline({
      prompt: "sharpen dramatically, peak detailing",
      imageUrl: SAMPLE_IMAGE,
    });
    const sharpen = steps.find((s) => s.model === POST_PROCESSING_MODEL);
    expect(sharpen).toBeTruthy();
    expect(sharpen!.body.enable_sharpen).toBe(true);
    expect(sharpen!.body.sharpen_mode).toBe("smart");
    expect(sharpen!.body.image_url).toBe(SAMPLE_IMAGE);
    expect(sharpen!.body.cas_amount).toBe(1.0);
  });

  it("Deblur request adds NAFNet deblur before sharpening", () => {
    const steps = buildImageEnhancementPipeline({
      prompt: "remove blur from this photo",
      imageUrl: SAMPLE_IMAGE,
    });
    expect(steps[0].model).toBe(DEBLUR_MODEL);
    expect(steps.some((s) => s.model === POST_PROCESSING_MODEL)).toBe(true);
  });

  it("HD / peak detail request chains Topaz upscale for maximum detail", () => {
    const steps = buildImageEnhancementPipeline({
      prompt: "make it HD with maximum detail",
      imageUrl: SAMPLE_IMAGE,
    });
    expect(steps.some((s) => s.model === UPSCALE_IMAGE_MODEL)).toBe(true);
  });

  it("Video enhancement uses Topaz video upscale", () => {
    const step = buildVideoEnhancement({ videoUrl: "https://example.com/v.mp4" });
    expect(step.model).toBe(UPSCALE_VIDEO_MODEL);
    expect(step.outputKind).toBe("video");
    expect(step.body.video_url).toBe("https://example.com/v.mp4");
  });
});

import { isEnhancementOnly, buildImageEdit, IMAGE_EDIT_MODEL } from "@/lib/fal-request";

describe("edit vs enhancement routing", () => {
  it("treats semantic edit prompts as edits (not enhancement)", () => {
    expect(isEnhancementOnly("add a boat to the lake")).toBe(false);
    expect(isEnhancementOnly("change the color palette to warm tones")).toBe(false);
    expect(isEnhancementOnly("remove the background")).toBe(false);
    expect(isEnhancementOnly("turn this into an anime style")).toBe(false);
  });

  it("treats pure quality prompts as enhancement", () => {
    expect(isEnhancementOnly("sharpen and enhance to HD quality")).toBe(true);
    expect(isEnhancementOnly("deblur and increase resolution")).toBe(true);
  });

  it("buildImageEdit targets the instruction-edit model and sends the source image", () => {
    const step = buildImageEdit({ prompt: "add a red boat", imageUrl: "data:image/png;base64,AAAA" });
    expect(step.model).toBe(IMAGE_EDIT_MODEL);
    expect(step.endpoint).toBe(`https://fal.run/${IMAGE_EDIT_MODEL}`);
    expect(step.body.prompt).toBe("add a red boat");
    expect(step.body.image_url).toBe("data:image/png;base64,AAAA");
  });
});
