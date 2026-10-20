/**
 * Standard multi-ref payload + billing amount consistency (zero-network).
 * Run: npx tsx --test src/lib/studio/image/standard/multi-ref-billing.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStandardImageRequest } from "./validation";
import { quoteStandardCredits } from "./credits";
import { buildStandardStep } from "./request-builders";
import { STANDARD_MODELS } from "./models";
import type { StandardValidationOk } from "./types";

describe("Standard multi-reference payload contract", () => {
  const cases = [
    { refs: 1, total: 2 },
    { refs: 2, total: 3 },
    { refs: 4, total: 5 },
  ] as const;

  for (const { refs, total } of cases) {
    it(`serializes ${total} ordered image_urls for Kontext max/multi`, () => {
      const referenceImageUrls = Array.from(
        { length: refs },
        (_, i) => `https://cdn.example/r${i + 1}.png`,
      );
      const v = validateStandardImageRequest({
        prompt: "apply outfit from references",
        imageUrl: "https://cdn.example/primary.png",
        referenceImageUrls,
        imageQuality: "sd",
      });
      assert.equal(v.ok, true);
      if (!v.ok) return;
      assert.equal(v.mode, "multi_image_to_image");
      assert.equal(1 + v.referenceImageUrls.length, total);

      const step = buildStandardStep(v as StandardValidationOk);
      assert.equal(step.model, STANDARD_MODELS.multiImageToImage);
      assert.equal(step.model, "fal-ai/flux-pro/kontext/max/multi");
      const urls = step.body.image_urls as string[];
      assert.deepEqual(urls, ["https://cdn.example/primary.png", ...referenceImageUrls]);
      assert.equal(step.body.enhance_prompt, false);
      assert.equal(typeof step.body.guidance_scale, "number");

      const quote = quoteStandardCredits({
        mode: "multi_image_to_image",
        referenceCount: total,
        imageQuality: "sd",
      });
      const expected: Record<number, number> = { 2: 30, 3: 35, 4: 35, 5: 40 };
      assert.equal(quote.credits, expected[total]);
    });
  }

  it("rejects missing primary", () => {
    const v = validateStandardImageRequest({
      prompt: "x",
      referenceImageUrls: ["https://cdn.example/r1.png"],
    });
    assert.equal(v.ok, false);
  });

  it("rejects >5 total", () => {
    const refs = Array.from({ length: 5 }, (_, i) => `https://cdn.example/r${i}.png`);
    const v = validateStandardImageRequest({
      prompt: "x",
      imageUrl: "https://cdn.example/p.png",
      referenceImageUrls: refs,
    });
    assert.equal(v.ok, false);
  });

  it("single image stays Kontext pro not multi", () => {
    const v = validateStandardImageRequest({
      prompt: "sharpen",
      imageUrl: "https://cdn.example/p.png",
    });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.mode, "image_to_image");
    const step = buildStandardStep(v as StandardValidationOk);
    assert.equal(step.model, STANDARD_MODELS.imageToImage);
    assert.equal(step.body.image_url, "https://cdn.example/p.png");
    assert.equal((step.body as { image_urls?: unknown }).image_urls, undefined);
  });
});

describe("quote authority single vs multi", () => {
  it("I2I SD/HD locked", () => {
    assert.equal(quoteStandardCredits({ mode: "image_to_image", imageQuality: "sd" }).credits, 25);
    assert.equal(quoteStandardCredits({ mode: "image_to_image", imageQuality: "hd" }).credits, 30);
  });
});
