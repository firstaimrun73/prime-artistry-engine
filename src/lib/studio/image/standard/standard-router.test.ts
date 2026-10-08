/**
 * Zero-network unit checks for Standard Image Studio router / credits / order.
 * Run with: npx tsx --test src/lib/studio/image/standard/standard-router.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStandardImageRequest, normalizeOrderedRefs } from "./validation";
import { quoteStandardCredits, STANDARD_CREDITS } from "./credits";
import {
  buildStandardStep,
  STANDARD_I2I_IDENTITY_PRESERVATION,
  STANDARD_MULTI_IDENTITY_PRESERVATION,
} from "./request-builders";
import { STANDARD_MODELS } from "./models";
import { GPT_IMAGE_2_EDIT_MODEL, quoteGptImage2MultiCredits } from "@/lib/studio/image/gpt-image-2";
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

  it("1 ref only stays image_to_image (never GPT Image 2)", () => {
    const r = validateStandardImageRequest({
      prompt: "edit",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.mode, "image_to_image");
  });

  it("multi preserves ref order (2+ total images)", () => {
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

  it("rejects multi with >5 total images", () => {
    const refs = Array.from({ length: 5 }, (_, i) => `https://cdn.example/r${i}.png`);
    const r = validateStandardImageRequest({
      prompt: "apply",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: refs,
    });
    assert.equal(r.ok, false);
  });

  it("rejects Standard multi 2K", () => {
    const r = validateStandardImageRequest({
      prompt: "apply",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: ["https://cdn.example/r1.png"],
      imageQuality: "2k" as "sd",
    });
    assert.equal(r.ok, false);
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
      circleInstant: true,
    });
    assert.equal(good.ok, true);
    if (good.ok) assert.equal(good.mode, "circle_to_remove");
  });
});

describe("quoteStandardCredits", () => {
  it("matches locked table for T2I/I2I/circle", () => {
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
      quoteStandardCredits({ mode: "circle_to_remove" }).credits,
      25,
    );
  });

  it("multi GPT Image 2 SD/HD table by total image count", () => {
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 2, imageQuality: "sd" }).credits,
      30,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 2, imageQuality: "hd" }).credits,
      35,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 3, imageQuality: "sd" }).credits,
      35,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 3, imageQuality: "hd" }).credits,
      40,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 4, imageQuality: "sd" }).credits,
      35,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 5, imageQuality: "sd" }).credits,
      40,
    );
    assert.equal(
      quoteStandardCredits({ mode: "multi_image_to_image", referenceCount: 5, imageQuality: "hd" }).credits,
      45,
    );
  });
});

describe("quoteGptImage2MultiCredits premium", () => {
  it("premium table max 76", () => {
    assert.equal(
      quoteGptImage2MultiCredits({ experience: "premium", referenceCount: 10, outputClass: "2k" }).credits,
      76,
    );
    assert.equal(
      quoteGptImage2MultiCredits({ experience: "premium", referenceCount: 2, outputClass: "sd" }).credits,
      35,
    );
    assert.equal(
      quoteGptImage2MultiCredits({ experience: "premium", referenceCount: 4, outputClass: "hd" }).credits,
      47,
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
    assert.equal(t2i.model, STANDARD_MODELS.textToImageSd);

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
    assert.equal(multi.model, GPT_IMAGE_2_EDIT_MODEL);
    assert.equal(multi.body.quality, "low");
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

describe("Standard I2I identity preservation", () => {
  it("keeps original HTTPS image_url and enhance_prompt false", () => {
    const step = buildStandardStep({
      ok: true,
      mode: "image_to_image",
      prompt: "make the shirt blue",
      imageUrl: "https://cdn.example/person.png",
      referenceImageUrls: [],
      imageQuality: "hd",
    } as StandardValidationOk);

    assert.equal(step.body.image_url, "https://cdn.example/person.png");
    assert.equal(step.body.enhance_prompt, false);
    assert.equal(step.model, STANDARD_MODELS.imageToImage);
    // Must remain I2I — never silently become T2I
    assert.ok(step.body.image_url, "I2I must retain image_url");
    assert.equal((step.body as { image_urls?: unknown }).image_urls, undefined);
  });

  it("prompt contains identity-preservation contract", () => {
    const step = buildStandardStep({
      ok: true,
      mode: "image_to_image",
      prompt: "change background to beach",
      imageUrl: "https://cdn.example/face.png",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);

    const prompt = String(step.body.prompt);
    assert.ok(
      prompt.includes(STANDARD_I2I_IDENTITY_PRESERVATION),
      "I2I prompt must include identity preservation contract",
    );
    assert.ok(prompt.includes("change background to beach"));
  });

  it("explicit face/expression request still preserves same-person identity", () => {
    const step = buildStandardStep({
      ok: true,
      mode: "image_to_image",
      prompt: "make her smile and look slightly younger",
      imageUrl: "https://cdn.example/portrait.png",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);

    const prompt = String(step.body.prompt);
    assert.ok(prompt.includes(STANDARD_I2I_IDENTITY_PRESERVATION));
    assert.ok(
      /same person's identity|same person|facial structure/i.test(prompt),
      "must keep same-person identity on explicit face edits",
    );
    assert.equal(step.body.enhance_prompt, false);
    assert.equal(step.body.image_url, "https://cdn.example/portrait.png");
  });
});

describe("Standard multi-image identity + order", () => {
  it("keeps [base, ref1, ref2...] order and protects base person identity", () => {
    const step = buildStandardStep({
      ok: true,
      mode: "multi_image_to_image",
      prompt: "put the jacket from the reference on the person",
      imageUrl: "https://cdn.example/base-person.png",
      referenceImageUrls: [
        "https://cdn.example/jacket.png",
        "https://cdn.example/style.png",
      ],
      imageQuality: "sd",
    } as StandardValidationOk);

    assert.deepEqual(step.body.image_urls, [
      "https://cdn.example/base-person.png",
      "https://cdn.example/jacket.png",
      "https://cdn.example/style.png",
    ]);
    assert.equal(step.body.quality, "low");
    assert.equal(step.model, GPT_IMAGE_2_EDIT_MODEL);

    const prompt = String(step.body.prompt);
    assert.ok(
      prompt.includes(STANDARD_MULTI_IDENTITY_PRESERVATION),
      "multi prompt must include base-person identity rule",
    );
    assert.ok(prompt.includes("Image 1 is the base"));
    assert.ok(prompt.includes("put the jacket from the reference on the person"));
  });

  it("never silently changes I2I into T2I", () => {
    const i2i = buildStandardStep({
      ok: true,
      mode: "image_to_image",
      prompt: "remove the car",
      imageUrl: "https://cdn.example/street.png",
      referenceImageUrls: [],
      imageQuality: "sd",
    } as StandardValidationOk);
    assert.ok(i2i.body.image_url);
    assert.equal((i2i.body as { image_urls?: unknown }).image_urls, undefined);
    assert.notEqual(i2i.model, STANDARD_MODELS.textToImageSd);
    assert.notEqual(i2i.model, STANDARD_MODELS.textToImageHd);
  });
});
