/**
 * Zero-network unit checks for Standard Image Studio router / credits / order.
 * Run with: npx tsx --test src/lib/studio/image/standard/standard-router.test.ts
 * (or project test runner if configured)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStandardImageRequest, normalizeOrderedRefs } from "./validation";
import { quoteStandardCredits, STANDARD_CREDITS } from "./credits";
import { buildStandardStep } from "./request-builders";
import { STANDARD_MODELS } from "./models";
import type { StandardValidationOk } from "./types";

describe("normalizeOrderedRefs", () => {
  it("preserves order and drops invalid without reordering", () => {
    const ordered = normalizeOrderedRefs([
      "https://a.example/1.png",
      "not-a-url",
      "https://a.example/2.png",
      "https://a.example/3.png",
    ]);
    assert.deepEqual(ordered, [
      "https://a.example/1.png",
      "https://a.example/2.png",
      "https://a.example/3.png",
    ]);
  });

  it("caps at 5", () => {
    const urls = Array.from({ length: 7 }, (_, i) => `https://a.example/${i}.png`);
    assert.equal(normalizeOrderedRefs(urls).length, 5);
    assert.equal(normalizeOrderedRefs(urls)[0], "https://a.example/0.png");
    assert.equal(normalizeOrderedRefs(urls)[4], "https://a.example/4.png");
  });
});

describe("validateStandardImageRequest", () => {
  it("text to image", () => {
    const r = validateStandardImageRequest({ prompt: "a cat" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.mode, "text_to_image");
  });

  it("image to image requires https source", () => {
    const r = validateStandardImageRequest({
      prompt: "change shirt to red",
      imageUrl: "https://cdn.example/base.png",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.mode, "image_to_image");
      assert.equal(r.imageUrl, "https://cdn.example/base.png");
    }
  });

  it("multi preserves ref order", () => {
    const r = validateStandardImageRequest({
      prompt: "apply outfit",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [
        "https://cdn.example/r1.png",
        "https://cdn.example/r2.png",
      ],
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.mode, "multi_image_to_image");
      assert.deepEqual(r.referenceImageUrls, [
        "https://cdn.example/r1.png",
        "https://cdn.example/r2.png",
      ]);
    }
  });

  it("rejects multi with 0 refs when only base — becomes i2i", () => {
    const r = validateStandardImageRequest({
      prompt: "edit",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.mode, "image_to_image");
  });

  it("circle requires mask + original", () => {
    const bad = validateStandardImageRequest({
      prompt: "remove",
      circleInstant: true,
      imageUrl: "https://cdn.example/base.png",
    });
    assert.equal(bad.ok, false);

    const good = validateStandardImageRequest({
      prompt: "remove",
      imageUrl: "https://cdn.example/base.png",
      maskImageUrl: "https://cdn.example/mask.png",
    });
    assert.equal(good.ok, true);
    if (good.ok) assert.equal(good.mode, "circle_to_remove");
  });
});

describe("quoteStandardCredits", () => {
  it("matches locked table", () => {
    assert.equal(
      quoteStandardCredits({ mode: "text_to_image", imageQuality: "sd" }).credits,
      STANDARD_CREDITS.textToImageSd,
    );
    assert.equal(
      quoteStandardCredits({ mode: "text_to_image", imageQuality: "hd" }).credits,
      STANDARD_CREDITS.textToImageHd,
    );
    assert.equal(
      quoteStandardCredits({ mode: "image_to_image" }).credits,
      STANDARD_CREDITS.imageToImage,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 1 }).credits,
      30,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 3 }).credits,
      35,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 5 }).credits,
      40,
    );
    assert.equal(
      quoteStandardCredits({ mode: "circle_to_remove" }).credits,
      25,
    );
  });
});

describe("buildStandardStep models", () => {
  it("uses locked model ids", () => {
    const t2i = buildStandardStep({
      ok: true,
      mode: "text_to_image",
      prompt: "cat",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);
    assert.equal(t2i.model, STANDARD_MODELS.textToImage);

    const i2i = buildStandardStep({
      ok: true,
      mode: "image_to_image",
      prompt: "red shirt",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);
    assert.equal(i2i.model, STANDARD_MODELS.imageToImage);
    assert.equal(i2i.body.image_url, "https://cdn.example/base.png");
    assert.equal(i2i.body.enhance_prompt, false);

    const multi = buildStandardStep({
      ok: true,
      mode: "multi_image_to_image",
      prompt: "outfit",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [
        "https://cdn.example/r1.png",
        "https://cdn.example/r2.png",
      ],
      imageQuality: "sd",
    } as StandardValidationOk);
    assert.equal(multi.model, STANDARD_MODELS.multiImageToImage);
    assert.deepEqual(multi.body.image_urls, [
      "https://cdn.example/base.png",
      "https://cdn.example/r1.png",
      "https://cdn.example/r2.png",
    ]);

    const circle = buildStandardStep({
      ok: true,
      mode: "circle_to_remove",
      prompt: "remove",
      imageUrl: "https://cdn.example/base.png",
      maskImageUrl: "https://cdn.example/mask.png",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);
    assert.equal(circle.model, STANDARD_MODELS.circleToRemove);
    assert.equal(circle.body.image_url, "https://cdn.example/base.png");
    assert.equal(circle.body.mask_url, "https://cdn.example/mask.png");
  });
});
